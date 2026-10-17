import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../../config/database.js';
import { USER_ROLES, INTERN_TYPES } from '@command-center/shared';

export const MAX_ADMIN_LIMIT = 5;

export async function logAdminAction(params: {
  userId?: string;
  userName?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, any> | string;
  ipAddress?: string;
}) {
  try {
    await db('audit_logs').insert({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      user_id: params.userId || null,
      user_name: params.userName || null,
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId || null,
      details: typeof params.details === 'object' ? JSON.stringify(params.details) : params.details || null,
      ip_address: params.ipAddress || null,
      created_at: new Date(),
    });
  } catch (err) {
    console.error('[AuditLog] Failed to log action:', err);
  }
}

export async function getAdminSummary(req: Request, res: Response) {
  const admins = await db('users')
    .whereIn('role', [USER_ROLES.ADMIN, USER_ROLES.LEAD])
    .select('id', 'name', 'email', 'role', 'status', 'created_at as createdAt', 'joining_date as joiningDate');

  const activeAdminsCount = admins.length;
  const availablePositions = Math.max(0, MAX_ADMIN_LIMIT - activeAdminsCount);

  const primaryAdmin = admins.find((a) => a.role === USER_ROLES.ADMIN) || null;
  const coAdmin = admins.find((a) => a.role === USER_ROLES.LEAD) || null;

  return res.json({
    maxAdmins: MAX_ADMIN_LIMIT,
    activeAdminsCount,
    availablePositions,
    primaryAdmin,
    coAdmin,
    admins,
  });
}

export async function grantAdminRole(req: Request, res: Response) {
  const currentUser = req.user!;
  const { targetUserId, targetRole = USER_ROLES.LEAD } = req.body;

  // Authorization check
  if (currentUser.role !== USER_ROLES.ADMIN && currentUser.role !== USER_ROLES.LEAD) {
    return res.status(403).json({ message: 'Only an authorized administrator can grant administrator access.' });
  }

  if (targetRole !== USER_ROLES.ADMIN && targetRole !== USER_ROLES.LEAD) {
    return res.status(400).json({ message: 'Target role must be admin or co-admin (lead).' });
  }

  // Count current administrators
  const adminCountRecord = await db('users')
    .whereIn('role', [USER_ROLES.ADMIN, USER_ROLES.LEAD])
    .count('id as count')
    .first();

  const currentAdminCount = Number(adminCountRecord?.count || 0);

  // Check if target user is already an administrator
  const targetUser = await db('users').where({ id: targetUserId }).first();
  if (!targetUser) {
    return res.status(404).json({ message: 'Target user not found.' });
  }

  const isAlreadyAdmin = targetUser.role === USER_ROLES.ADMIN || targetUser.role === USER_ROLES.LEAD;

  if (!isAlreadyAdmin && currentAdminCount >= MAX_ADMIN_LIMIT) {
    return res.status(400).json({
      message: `Maximum limit of ${MAX_ADMIN_LIMIT} administrator positions reached. Available positions: 0. Cannot assign additional administrators.`,
    });
  }

  await db('users').where({ id: targetUserId }).update({
    role: targetRole,
    updated_at: new Date(),
  });

  await logAdminAction({
    userId: currentUser.id,
    userName: currentUser.name,
    action: 'ADMIN_ACCESS_GRANTED',
    resourceType: 'USER',
    resourceId: targetUserId,
    details: {
      targetUserName: targetUser.name,
      targetEmail: targetUser.email,
      assignedRole: targetRole,
      previousRole: targetUser.role,
      activeAdminsAfter: isAlreadyAdmin ? currentAdminCount : currentAdminCount + 1,
      availablePositionsAfter: isAlreadyAdmin ? MAX_ADMIN_LIMIT - currentAdminCount : MAX_ADMIN_LIMIT - (currentAdminCount + 1),
    },
    ipAddress: req.ip,
  });

  return res.json({
    message: `Administrator access successfully granted to ${targetUser.name} as ${targetRole === USER_ROLES.ADMIN ? 'Primary Admin' : 'Co-Admin'}.`,
    user: {
      id: targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
      role: targetRole,
    },
  });
}

export async function getUsers(req: Request, res: Response) {
  const currentUser = req.user!;

  if (currentUser.role === USER_ROLES.UNPAID_INTERN) {
    // Unpaid intern can view team leads and peers in assigned team
    const myTeams = await db('team_members').where({ user_id: currentUser.id }).pluck('team_id');
    const allowedUserIds = await db('team_members').whereIn('team_id', myTeams).pluck('user_id');
    
    // Also include administrators
    const adminIds = await db('users').whereIn('role', [USER_ROLES.ADMIN, USER_ROLES.LEAD]).pluck('id');
    const allAllowed = Array.from(new Set([...allowedUserIds, ...adminIds, currentUser.id]));

    const users = await db('users as u')
      .leftJoin('users as p', 'u.paired_paid_intern_id', 'p.id')
      .whereIn('u.id', allAllowed)
      .select(
        'u.id',
        'u.name',
        'u.email',
        'u.role',
        'u.intern_type as internType',
        'u.paired_paid_intern_id as pairedPaidInternId',
        'p.name as pairedPaidInternName',
        'u.current_level as currentLevel',
        'u.marksheet_percentage as marksheetPercentage',
        'u.marksheet_confirmed as marksheetConfirmed',
        'u.status',
        'u.joining_date as joiningDate',
        'u.phone',
        'u.created_at as createdAt'
      );

    return res.json(users);
  }

  let query = db('users as u')
    .leftJoin('users as p', 'u.paired_paid_intern_id', 'p.id')
    .select(
      'u.id',
      'u.name',
      'u.email',
      'u.role',
      'u.intern_type as internType',
      'u.paired_paid_intern_id as pairedPaidInternId',
      'p.name as pairedPaidInternName',
      'u.current_level as currentLevel',
      'u.marksheet_percentage as marksheetPercentage',
      'u.marksheet_confirmed as marksheetConfirmed',
      'u.status',
      'u.joining_date as joiningDate',
      'u.phone',
      'u.created_at as createdAt'
    );

  // Scope filtering for Core Intern
  if (currentUser.role === USER_ROLES.PAID_INTERN) {
    query = query.where((builder) => {
      builder.where('u.id', currentUser.id).orWhere('u.paired_paid_intern_id', currentUser.id);
    });
  }

  const users = await query;

  // Compute attendance percentage and tasks for each user from real DB
  const usersWithStats = await Promise.all(
    users.map(async (u) => {
      const records = await db('attendance').where({ user_id: u.id });
      const totalDays = records.length;
      const presentDays = records.filter(
        (r) => r.status === 'present' || r.status === 'late' || r.status === 'half_day'
      ).length;
      const attendancePct = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : null;

      // Get user team memberships
      const team = await db('team_members as tm')
        .join('teams as t', 'tm.team_id', 't.id')
        .where('tm.user_id', u.id)
        .select('t.id as teamId', 't.name as teamName')
        .first();

      // Count tasks assigned to this user
      const assignedParts = await db('task_parts').where({ assigned_intern_id: u.id });
      const completedParts = assignedParts.filter((p) => p.status === 'done');

      return {
        ...u,
        teamId: team?.teamId || null,
        teamName: team?.teamName || (u.role === USER_ROLES.ADMIN || u.role === USER_ROLES.LEAD ? 'Administration' : 'Not configured'),
        attendancePercentage: attendancePct,
        totalTasksAssigned: assignedParts.length,
        tasksCompleted: completedParts.length,
      };
    })
  );

  return res.json(usersWithStats);
}

export async function updateUser(req: Request, res: Response) {
  const currentUser = req.user!;
  const { id } = req.params;
  const { name, email, phone, joiningDate, currentLevel, marksheetPercentage, status } = req.body;

  if (currentUser.role !== USER_ROLES.ADMIN && currentUser.role !== USER_ROLES.LEAD) {
    return res.status(403).json({ message: 'Only authorized administrators can modify member details.' });
  }

  const user = await db('users').where({ id }).first();
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Prevent email duplicate
  if (email && email !== user.email) {
    const existing = await db('users').where({ email }).whereNot({ id }).first();
    if (existing) {
      return res.status(400).json({ message: 'An account with this email address already exists.' });
    }
  }

  const updatePayload: Record<string, any> = {
    updated_at: new Date(),
  };

  if (name !== undefined) updatePayload.name = name;
  if (email !== undefined) updatePayload.email = email;
  if (phone !== undefined) updatePayload.phone = phone;
  if (joiningDate !== undefined) updatePayload.joining_date = joiningDate;
  if (currentLevel !== undefined) updatePayload.current_level = currentLevel;
  if (marksheetPercentage !== undefined) updatePayload.marksheet_percentage = marksheetPercentage;
  if (status !== undefined) updatePayload.status = status;

  await db('users').where({ id }).update(updatePayload);

  await logAdminAction({
    userId: currentUser.id,
    userName: currentUser.name,
    action: 'MEMBER_UPDATED',
    resourceType: 'USER',
    resourceId: id,
    details: { updatedFields: updatePayload, targetUserName: user.name },
    ipAddress: req.ip,
  });

  return res.json({ message: 'Member updated successfully', user: { ...user, ...updatePayload } });
}

export async function createUser(req: Request, res: Response) {
  const currentUser = req.user!;

  if (currentUser.role !== USER_ROLES.ADMIN && currentUser.role !== USER_ROLES.LEAD) {
    return res.status(403).json({ message: 'Only Admin and Co-Admin can create new members.' });
  }

  const { name, email, role = USER_ROLES.UNPAID_INTERN, internType, teamId, phone, joiningDate } = req.body;

  if (!name || !email) {
    return res.status(400).json({ message: 'Name and email are required.' });
  }

  const existing = await db('users').where({ email: email.trim().toLowerCase() }).first();
  if (existing) {
    return res.status(409).json({ message: 'A user with this email address already exists.' });
  }

  const defaultPassword = await bcrypt.hash('Password123!', 10);
  const newId = `u-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const normalizedEmail = email.trim().toLowerCase();

  await db('users').insert({
    id: newId,
    name: name.trim(),
    email: normalizedEmail,
    password_hash: defaultPassword,
    role,
    intern_type: internType || (role === USER_ROLES.PAID_INTERN ? INTERN_TYPES.PAID : INTERN_TYPES.UNPAID),
    phone: phone || null,
    joining_date: joiningDate || new Date().toISOString().split('T')[0],
    current_level: 1,
    status: 'active',
  });

  if (teamId) {
    await db('team_members').insert({
      id: `tm-${newId}`,
      team_id: teamId,
      user_id: newId,
    });
  }

  // Automated Welcome Email (Requirement 4)
  try {
    const { sendSystemNotification } = await import('../automations/emailService.js');
    let teamName = 'Central Office Team';
    if (teamId) {
      const teamObj = await db('teams').where({ id: teamId }).first();
      if (teamObj) teamName = teamObj.name;
    }

    const roleName =
      role === USER_ROLES.ADMIN
        ? 'Administrator'
        : role === USER_ROLES.LEAD
        ? 'Team Lead'
        : role === USER_ROLES.PAID_INTERN
        ? 'Core Intern'
        : 'Unpaid Intern';

    await sendSystemNotification({
      eventType: 'welcome_user',
      recipientEmail: normalizedEmail,
      recipientName: name.trim(),
      variables: {
        recipient_name: name.trim(),
        recipient_role: roleName,
        recipient_designation: `${roleName} • Central Office`,
        team_name: teamName,
        login_url: `${req.protocol}://${req.get('host')}/login`,
      },
    });
  } catch (err) {
    console.warn('[WelcomeEmail] Failed to send welcome notification:', err);
  }

  // Create In-App Notification
  try {
    const { createNotification } = await import('../notifications/notificationsController.js');
    await createNotification({
      userId: newId,
      title: 'Welcome to Central Office',
      message: 'Welcome to Software Hub 2.0 Command Center. Review your team tasks and responsibilities.',
      type: 'announcement',
      actionUrl: '/',
    });
  } catch (err) {
    console.warn('[Notification] Failed to create welcome in-app notification:', err);
  }

  await logAdminAction({
    userId: currentUser.id,
    userName: currentUser.name,
    action: 'USER_CREATED',
    resourceType: 'USER',
    resourceId: newId,
    details: { name, email: normalizedEmail, role },
    ipAddress: req.ip,
  });

  return res.status(201).json({
    message: `Account for ${name} created and welcome email dispatched successfully.`,
    user: { id: newId, name, email: normalizedEmail, role },
  });
}

export async function createBulkInterns(req: Request, res: Response) {
  const currentUser = req.user!;
  const { emails, type, worksWithId, teamId } = req.body;

  let assignedPaidInternId = worksWithId;
  let targetType = type;

  if (currentUser.role === USER_ROLES.PAID_INTERN) {
    targetType = INTERN_TYPES.UNPAID;
    assignedPaidInternId = currentUser.id;
  }

  const defaultPassword = await bcrypt.hash('Password123!', 10);
  const createdUsers = [];

  for (const email of emails) {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await db('users').where({ email: normalizedEmail }).first();
    if (existing) continue;

    const baseName = normalizedEmail.split('@')[0].replace(/[._]/g, ' ');
    const name = baseName
      .split(' ')
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    const newId = `u-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const role =
      targetType === INTERN_TYPES.PAID ? USER_ROLES.PAID_INTERN : USER_ROLES.UNPAID_INTERN;

    await db('users').insert({
      id: newId,
      name,
      email: normalizedEmail,
      password_hash: defaultPassword,
      role,
      intern_type: targetType,
      paired_paid_intern_id: targetType === INTERN_TYPES.UNPAID ? assignedPaidInternId : null,
      current_level: 1,
      status: 'active',
    });

    if (teamId) {
      await db('team_members').insert({
        id: `tm-${newId}`,
        team_id: teamId,
        user_id: newId,
      });
    }

    // Trigger Automated Welcome Email
    try {
      const { sendSystemNotification } = await import('../automations/emailService.js');
      const roleDisplayName = role === USER_ROLES.PAID_INTERN ? 'Core Intern' : 'Unpaid Intern';
      await sendSystemNotification({
        eventType: 'welcome_user',
        recipientEmail: normalizedEmail,
        recipientName: name,
        variables: {
          recipient_name: name,
          recipient_role: roleDisplayName,
          recipient_designation: `${roleDisplayName} • Central Office`,
          team_name: 'Software Hub 2.0 Cohort',
          login_url: `${req.protocol}://${req.get('host')}/login`,
        },
      });
    } catch (e) {
      console.warn('[WelcomeEmail] Bulk welcome email warning:', e);
    }

    createdUsers.push({ id: newId, name, email: normalizedEmail, role, internType: targetType });
  }

  await logAdminAction({
    userId: currentUser.id,
    userName: currentUser.name,
    action: 'INTERNS_CREATED',
    resourceType: 'USER',
    details: { count: createdUsers.length, emails: createdUsers.map((u) => u.email) },
    ipAddress: req.ip,
  });

  return res.status(201).json({
    message: `Created ${createdUsers.length} interns successfully with automated welcome notifications`,
    users: createdUsers,
  });
}

export async function pairIntern(req: Request, res: Response) {
  const { unpaidInternId, paidInternId } = req.body;

  await db('users')
    .where({ id: unpaidInternId })
    .update({ paired_paid_intern_id: paidInternId });

  await logAdminAction({
    userId: req.user?.id,
    userName: req.user?.name,
    action: 'INTERN_PAIRED',
    resourceType: 'USER',
    resourceId: unpaidInternId,
    details: { pairedWith: paidInternId },
  });

  return res.json({ message: 'Intern paired successfully' });
}

export async function promoteIntern(req: Request, res: Response) {
  const currentUser = req.user!;
  const { internId, decision, notes } = req.body;

  // Strict backend check: Only Admin and Co-Admin
  if (currentUser.role !== USER_ROLES.ADMIN && currentUser.role !== USER_ROLES.LEAD) {
    return res.status(403).json({
      message: 'Access Denied: Only Admin and Co-Admin may review or approve level progression.',
    });
  }

  // Prevent self-approval
  if (internId === currentUser.id) {
    return res.status(400).json({
      message: 'Administrators cannot self-approve their own level progression.',
    });
  }

  const intern = await db('users').where({ id: internId }).first();
  if (!intern) {
    return res.status(404).json({ message: 'Intern not found' });
  }

  const previousLevel = Number(intern.current_level || 1);
  const isApproved = decision === 'approve';
  const newLevel = isApproved ? Math.min(previousLevel + 1, 15) : previousLevel;

  // Record Level Review
  const reviewId = `lrev-${Date.now()}`;
  await db('level_reviews').insert({
    id: reviewId,
    intern_id: internId,
    level_number: previousLevel,
    decision: isApproved ? 'passed' : 'repeat',
    notes: notes || (isApproved ? 'Approved for next level' : 'Level review deferred'),
    reviewed_by: currentUser.id,
    created_at: new Date(),
  });

  if (isApproved) {
    const updateFields: Record<string, any> = {
      current_level: newLevel,
      updated_at: new Date(),
    };

    // If advancing from unpaid completion (level 4+) or explicitly promoting to paid
    if (intern.role === USER_ROLES.UNPAID_INTERN && newLevel >= 4) {
      updateFields.role = USER_ROLES.PAID_INTERN;
      updateFields.intern_type = INTERN_TYPES.PAID;
      updateFields.paired_paid_intern_id = null;
    }

    await db('users').where({ id: internId }).update(updateFields);

    // Notify Intern In-App
    try {
      const { createNotification } = await import('../notifications/notificationsController.js');
      await createNotification({
        userId: internId,
        title: `Level Promotion Approved! (Level ${newLevel})`,
        message: `Congratulations! Your progression to Level ${newLevel} was approved by ${currentUser.name}.`,
        type: 'level_approval',
        resourceType: 'LEVEL',
        resourceId: String(newLevel),
        actionUrl: '/tracker',
      });
    } catch (e) {
      console.warn('[Notification] Promotion notification error:', e);
    }

    // Dispatch Promotion Email
    try {
      const { sendSystemNotification } = await import('../automations/emailService.js');
      await sendSystemNotification({
        eventType: 'level_promotion_approved',
        recipientEmail: intern.email,
        recipientName: intern.name,
        variables: {
          recipient_name: intern.name,
          previous_level: String(previousLevel),
          new_level: String(newLevel),
          approver_name: currentUser.name,
          action_url: `${req.protocol}://${req.get('host')}/tracker`,
        },
      });
    } catch (e) {
      console.warn('[Email] Promotion email warning:', e);
    }

    await logAdminAction({
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'LEVEL_PROMOTION_APPROVED',
      resourceType: 'USER',
      resourceId: internId,
      details: { internName: intern.name, previousLevel, newLevel, approver: currentUser.name },
      ipAddress: req.ip,
    });

    return res.json({
      message: `Level promotion approved! ${intern.name} is now Level ${newLevel}.`,
      previousLevel,
      newLevel,
    });
  }

  await logAdminAction({
    userId: currentUser.id,
    userName: currentUser.name,
    action: 'LEVEL_PROMOTION_DEFERRED',
    resourceType: 'USER',
    resourceId: internId,
    details: { internName: intern.name, currentLevel: previousLevel, notes },
    ipAddress: req.ip,
  });

  return res.json({
    message: `Promotion for ${intern.name} was deferred. Level remains at ${previousLevel}.`,
    currentLevel: previousLevel,
  });
}


export async function getAuditLogs(req: Request, res: Response) {
  const currentUser = req.user!;

  if (currentUser.role !== USER_ROLES.ADMIN && currentUser.role !== USER_ROLES.LEAD) {
    return res.status(403).json({ message: 'Unauthorized to view administrative audit logs' });
  }

  const logs = await db('audit_logs')
    .orderBy('created_at', 'desc')
    .limit(100);

  return res.json(logs);
}
