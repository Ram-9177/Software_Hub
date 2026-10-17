import type { Request, Response } from 'express';
import { db } from '../../config/database.js';
import { USER_ROLES } from '@command-center/shared';
import { broadcastChatMessage } from '../../sockets/index.js';

export async function getChannels(req: Request, res: Response) {
  const currentUser = req.user!;
  const isAdmin = currentUser.role === USER_ROLES.ADMIN;

  let query = db('chat_channels as c')
    .leftJoin('teams as t', 'c.team_id', 't.id')
    .leftJoin('users as lead', 't.lead_id', 'lead.id')
    .select(
      'c.id',
      'c.name',
      'c.type',
      'c.team_id as teamId',
      't.description as description',
      't.lead_id as leadId',
      'lead.name as leadName',
      'c.created_by as createdBy',
      'c.created_at as createdAt'
    );

  // Authorization Check: Non-admins only see channels they belong to
  if (!isAdmin) {
    query = query.whereIn('c.id', function () {
      this.select('channel_id').from('channel_members').where('user_id', currentUser.id);
    });
  }

  const channels = await query.orderBy('c.type', 'desc').orderBy('c.name', 'asc');

  const channelsWithMetadata = await Promise.all(
    channels.map(async (chan) => {
      // Real members
      const members = await db('channel_members as cm')
        .where({ 'cm.channel_id': chan.id })
        .leftJoin('users as u', 'cm.user_id', 'u.id')
        .select(
          'u.id',
          'u.name',
          'u.role',
          'u.email',
          'u.avatar_url as avatarUrl'
        );

      // Pinned message
      const pinnedMsg = await db('chat_messages as m')
        .where({ channel_id: chan.id, is_pinned: true })
        .leftJoin('users as u', 'm.sender_id', 'u.id')
        .select(
          'm.id',
          'm.text',
          'm.sender_id as senderId',
          'u.name as senderName',
          'm.attachments',
          'm.created_at as createdAt'
        )
        .first();

      // Dynamic unread count based on last_read_at
      const membership = await db('channel_members')
        .where({ channel_id: chan.id, user_id: currentUser.id })
        .first();

      let unread = 0;
      if (membership?.last_read_at) {
        const unreadCount = await db('chat_messages')
          .where({ channel_id: chan.id })
          .andWhere('created_at', '>', membership.last_read_at)
          .andWhereNot('sender_id', currentUser.id)
          .count('id as count')
          .first();
        unread = Number(unreadCount?.count || 0);
      }

      return {
        ...chan,
        memberCount: members.length,
        members,
        pinnedMessage: pinnedMsg
          ? {
              ...pinnedMsg,
              attachments: pinnedMsg.attachments ? JSON.parse(pinnedMsg.attachments) : [],
            }
          : null,
        unreadCount: unread,
      };
    })
  );

  return res.json(channelsWithMetadata);
}

export async function createTeam(req: Request, res: Response) {
  const currentUser = req.user!;
  const { name, description, leadId, memberIds } = req.body;

  // Authorization: Only Admin and Lead can create teams
  if (currentUser.role !== USER_ROLES.ADMIN && currentUser.role !== USER_ROLES.LEAD) {
    return res.status(403).json({ message: 'Only Admins and Team Leads can create teams' });
  }

  // Format team name and channel name
  const trimmedName = name.trim();
  const channelName = trimmedName.startsWith('#')
    ? trimmedName
    : `#${trimmedName.toLowerCase().replace(/[^a-z0-9-_]/g, '-')}`;

  // Check unique team name
  const existingTeam = await db('teams')
    .whereRaw('LOWER(name) = ?', [trimmedName.toLowerCase()])
    .first();
  if (existingTeam) {
    return res.status(409).json({ message: `A team named "${trimmedName}" already exists` });
  }

  // Check unique channel name
  const existingChannel = await db('chat_channels')
    .whereRaw('LOWER(name) = ?', [channelName.toLowerCase()])
    .first();
  if (existingChannel) {
    return res.status(409).json({ message: `A chat channel named "${channelName}" already exists` });
  }

  // Verify lead exists
  const leadUser = await db('users').where({ id: leadId, status: 'active' }).first();
  if (!leadUser) {
    return res.status(400).json({ message: 'Selected team lead does not exist or is inactive' });
  }

  // Deduplicate member IDs and ensure creator and lead are included
  const allMemberIds = Array.from(new Set([...memberIds, leadId, currentUser.id]));

  // Verify all members exist
  const existingUsers = await db('users').whereIn('id', allMemberIds).select('id');
  if (existingUsers.length !== allMemberIds.length) {
    return res.status(400).json({ message: 'One or more selected member IDs are invalid' });
  }

  const teamId = `team-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  const channelId = `chan-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

  // Run in a single database transaction
  await db.transaction(async (trx) => {
    // 1. Insert into teams
    await trx('teams').insert({
      id: teamId,
      name: trimmedName,
      description: description?.trim() || null,
      lead_id: leadId,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // 2. Insert into team_members
    for (const uid of allMemberIds) {
      await trx('team_members').insert({
        id: `tm-${teamId}-${uid}`,
        team_id: teamId,
        user_id: uid,
        created_at: new Date(),
      });
    }

    // 3. Insert corresponding team chat channel
    await trx('chat_channels').insert({
      id: channelId,
      name: channelName,
      type: 'team',
      team_id: teamId,
      created_by: currentUser.id,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // 4. Insert into channel_members
    for (const uid of allMemberIds) {
      await trx('channel_members').insert({
        id: `cm-${channelId}-${uid}`,
        channel_id: channelId,
        user_id: uid,
        last_read_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    // 5. Initial system welcome message
    await trx('chat_messages').insert({
      id: `msg-${Date.now()}`,
      channel_id: channelId,
      sender_id: currentUser.id,
      text: `Team "${trimmedName}" created by ${currentUser.name}. Welcome to the team workspace!`,
      is_pinned: true,
      created_at: new Date(),
    });
  });

  return res.status(201).json({
    message: `Team "${trimmedName}" created successfully`,
    teamId,
    channelId,
    name: channelName,
  });
}

export async function addTeamMember(req: Request, res: Response) {
  const currentUser = req.user!;
  const { teamId } = req.params;
  const { userId } = req.body;

  const team = await db('teams').where({ id: teamId }).first();
  if (!team) {
    return res.status(404).json({ message: 'Team not found' });
  }

  // Permission: Admin or Lead (Co-admin)
  const isAuthorized =
    currentUser.role === USER_ROLES.ADMIN ||
    currentUser.role === USER_ROLES.LEAD;

  if (!isAuthorized) {
    return res.status(403).json({ message: 'Only an Admin or Team Lead / Co-admin can add members' });
  }

  // Check if user exists
  const targetUser = await db('users').where({ id: userId, status: 'active' }).first();
  if (!targetUser) {
    return res.status(404).json({ message: 'User not found or inactive' });
  }

  // Prevent duplicate membership
  const existingMembership = await db('team_members')
    .where({ team_id: teamId, user_id: userId })
    .first();

  if (existingMembership) {
    return res.status(409).json({ message: `${targetUser.name} is already a member of this team` });
  }

  // Find linked channel
  const channel = await db('chat_channels').where({ team_id: teamId }).first();

  await db.transaction(async (trx) => {
    await trx('team_members').insert({
      id: `tm-${teamId}-${userId}`,
      team_id: teamId,
      user_id: userId,
      created_at: new Date(),
    });

    if (channel) {
      const existingChanMember = await trx('channel_members')
        .where({ channel_id: channel.id, user_id: userId })
        .first();

      if (!existingChanMember) {
        await trx('channel_members').insert({
          id: `cm-${channel.id}-${userId}`,
          channel_id: channel.id,
          user_id: userId,
          last_read_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }
  });

  return res.json({ message: `${targetUser.name} added to the team` });
}

export async function removeTeamMember(req: Request, res: Response) {
  const currentUser = req.user!;
  const { teamId, userId } = req.params;

  const team = await db('teams').where({ id: teamId }).first();
  if (!team) {
    return res.status(404).json({ message: 'Team not found' });
  }

  // Permission: Admin or Lead (Co-admin)
  const isAuthorized =
    currentUser.role === USER_ROLES.ADMIN ||
    currentUser.role === USER_ROLES.LEAD;

  if (!isAuthorized) {
    return res.status(403).json({ message: 'Only an Admin or Team Lead / Co-admin can remove members' });
  }

  if (team.lead_id === userId) {
    return res.status(400).json({ message: 'Cannot remove the Team Lead. Reassign lead first.' });
  }

  const channel = await db('chat_channels').where({ team_id: teamId }).first();

  await db.transaction(async (trx) => {
    await trx('team_members').where({ team_id: teamId, user_id: userId }).del();
    if (channel) {
      await trx('channel_members').where({ channel_id: channel.id, user_id: userId }).del();
    }
  });

  return res.json({ message: 'Member removed from team successfully' });
}

export async function getMessages(req: Request, res: Response) {
  const currentUser = req.user!;
  const { channelId } = req.params;

  // Authorization Check: Must be admin or channel member
  const isAdmin = currentUser.role === USER_ROLES.ADMIN;
  if (!isAdmin) {
    const isMember = await db('channel_members')
      .where({ channel_id: channelId, user_id: currentUser.id })
      .first();

    if (!isMember) {
      return res.status(403).json({
        message: 'Permission denied: You must be a member of this channel to access conversations',
      });
    }
  }

  // Update last_read_at for this user
  await db('channel_members')
    .where({ channel_id: channelId, user_id: currentUser.id })
    .update({ last_read_at: new Date(), updated_at: new Date() });

  const messages = await db('chat_messages as m')
    .where({ channel_id: channelId })
    .leftJoin('users as u', 'm.sender_id', 'u.id')
    .leftJoin('tasks as t', 'm.linked_task_id', 't.id')
    .select(
      'm.id',
      'm.channel_id as channelId',
      'm.sender_id as senderId',
      'u.name as senderName',
      'u.role as senderRole',
      'u.avatar_url as senderAvatarUrl',
      'm.text',
      'm.attachments',
      'm.linked_task_id as linkedTaskId',
      't.task_number as linkedTaskNumber',
      't.title as linkedTaskTitle',
      'm.is_pinned as isPinned',
      'm.created_at as createdAt'
    )
    .orderBy('m.created_at', 'asc');

  // Load reactions for each message
  const msgIds = messages.map((m) => m.id);
  const reactions = await db('message_reactions').whereIn('message_id', msgIds);

  const reactionsByMsg: Record<string, any[]> = {};
  for (const r of reactions) {
    if (!reactionsByMsg[r.message_id]) reactionsByMsg[r.message_id] = [];
    reactionsByMsg[r.message_id].push(r);
  }

  const enrichedMessages = messages.map((m) => {
    const rawReactions = reactionsByMsg[m.id] || [];
    const reactionCounts: Record<string, { count: number; userReacted: boolean }> = {};

    for (const r of rawReactions) {
      if (!reactionCounts[r.emoji]) reactionCounts[r.emoji] = { count: 0, userReacted: false };
      reactionCounts[r.emoji].count += 1;
      if (r.user_id === currentUser.id) {
        reactionCounts[r.emoji].userReacted = true;
      }
    }

    const formattedReactions = Object.entries(reactionCounts).map(([emoji, data]) => ({
      emoji,
      count: data.count,
      userReacted: data.userReacted,
    }));

    return {
      id: m.id,
      channelId: m.channelId,
      senderId: m.senderId,
      senderName: m.senderName,
      senderRole: m.senderRole,
      senderAvatarUrl: m.senderAvatarUrl,
      text: m.text,
      attachments: m.attachments ? JSON.parse(m.attachments) : [],
      linkedTaskId: m.linkedTaskId,
      linkedTask: m.linkedTaskId
        ? { id: m.linkedTaskId, taskNumber: m.linkedTaskNumber, title: m.linkedTaskTitle }
        : null,
      isPinned: Boolean(m.isPinned),
      reactions: formattedReactions,
      createdAt: m.createdAt,
    };
  });

  return res.json(enrichedMessages);
}

export async function sendMessage(req: Request, res: Response) {
  const currentUser = req.user!;
  const { channelId } = req.params;
  const { text, linkedTaskId, attachments } = req.body;

  // Authorization Check: Must be admin or channel member to post
  const isAdmin = currentUser.role === USER_ROLES.ADMIN;
  if (!isAdmin) {
    const isMember = await db('channel_members')
      .where({ channel_id: channelId, user_id: currentUser.id })
      .first();

    if (!isMember) {
      return res.status(403).json({
        message: 'Permission denied: You must be a member of this channel to send messages',
      });
    }
  }

  let finalAttachments = attachments || [];
  if (req.file) {
    finalAttachments.push({
      url: `/uploads/${req.file.filename}`,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
    });
  }

  const msgId = `msg-${Date.now()}`;
  const now = new Date();

  await db('chat_messages').insert({
    id: msgId,
    channel_id: channelId,
    sender_id: currentUser.id,
    text: text?.trim() || null,
    attachments: finalAttachments.length > 0 ? JSON.stringify(finalAttachments) : null,
    linked_task_id: linkedTaskId || null,
    is_pinned: false,
    created_at: now,
  });

  // Fetch created message for broadcast
  const messageData = {
    id: msgId,
    channelId,
    senderId: currentUser.id,
    senderName: currentUser.name,
    senderRole: currentUser.role,
    text: text?.trim() || null,
    attachments: finalAttachments,
    linkedTaskId: linkedTaskId || null,
    isPinned: false,
    reactions: [],
    createdAt: now.toISOString(),
  };

  broadcastChatMessage(channelId, messageData);

  return res.status(201).json({
    message: 'Message sent successfully',
    ...messageData,
  });
}

export async function toggleReaction(req: Request, res: Response) {
  const currentUser = req.user!;
  const { messageId } = req.params;
  const { emoji } = req.body;

  const existing = await db('message_reactions')
    .where({ message_id: messageId, user_id: currentUser.id, emoji })
    .first();

  if (existing) {
    await db('message_reactions').where({ id: existing.id }).del();
    return res.json({ action: 'removed' });
  } else {
    await db('message_reactions').insert({
      id: `react-${Date.now()}`,
      message_id: messageId,
      user_id: currentUser.id,
      emoji,
      created_at: new Date(),
    });
    return res.json({ action: 'added' });
  }
}

export async function pinMessage(req: Request, res: Response) {
  const { messageId } = req.params;
  const { isPinned } = req.body;

  await db('chat_messages').where({ id: messageId }).update({ is_pinned: isPinned });
  return res.json({ message: isPinned ? 'Message pinned' : 'Message unpinned' });
}

export async function clearChannelMessages(req: Request, res: Response) {
  const { channelId } = req.params;
  const currentUser = req.user!;

  if (currentUser.role !== USER_ROLES.ADMIN && currentUser.role !== USER_ROLES.LEAD) {
    return res.status(403).json({ message: 'Only Admin and Co-Admin can delete channel message history.' });
  }

  // Delete attachments or reactions related to channel messages
  const messageIds = await db('chat_messages').where({ channel_id: channelId }).pluck('id');
  if (messageIds.length > 0) {
    await db('message_reactions').whereIn('message_id', messageIds).del();
    await db('chat_messages').where({ channel_id: channelId }).del();
  }

  return res.json({ message: 'Channel message history deleted successfully by Central Office.' });
}

