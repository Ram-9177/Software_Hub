import type { Request, Response } from 'express';
import { db } from '../../config/database.js';
import { ENV } from '../../config/env.js';
import {
  hashToken,
  generateRandomToken,
  hashPassword,
} from '../../config/security.js';
import { createSession } from '../../config/session.js';
import { sendSystemNotification } from '../automations/emailService.js';
import { USER_ROLES, type UserRole, type InternType } from '@command-center/shared';

/**
 * Check if the caller has permission to invite the requested target role
 */
export function canInviteRole(inviterRole: UserRole, targetRole: UserRole): boolean {
  if (inviterRole === USER_ROLES.ADMIN) {
    return true; // Admin can invite any role
  }
  if (inviterRole === USER_ROLES.LEAD) {
    // Team lead can invite interns (paid or unpaid)
    return targetRole === USER_ROLES.PAID_INTERN || targetRole === USER_ROLES.UNPAID_INTERN;
  }
  if (inviterRole === USER_ROLES.PAID_INTERN) {
    // Core intern can invite unpaid interns only
    return targetRole === USER_ROLES.UNPAID_INTERN;
  }
  return false; // Unpaid interns cannot invite anyone
}

/**
 * POST /api/invites - Create and send an invite
 */
export async function createInvite(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const { name, email, role, internType, teamId } = req.body;

  if (!name || !email || !role) {
    return res.status(400).json({ message: 'Name, email, and role are required' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const targetRole = role as UserRole;

  // 1. Validate inviter's role permissions
  if (!canInviteRole(req.user.role, targetRole)) {
    return res.status(403).json({
      message: `As ${req.user.role}, you do not have permission to invite role: ${targetRole}`,
    });
  }

  // 2. 5-Admin Limit enforcement: if inviting an Admin, check limits
  if (targetRole === USER_ROLES.ADMIN) {
    const adminCount = await db('users').where({ role: USER_ROLES.ADMIN, status: 'active' }).count('id as count').first();
    const pendingAdminInvites = await db('invites')
      .where({ role: USER_ROLES.ADMIN, status: 'pending' })
      .andWhere('expires_at', '>', new Date())
      .count('id as count')
      .first();

    const total = Number(adminCount?.count || 0) + Number(pendingAdminInvites?.count || 0);
    if (total >= 5) {
      return res.status(400).json({
        message: 'Maximum limit of 5 administrator positions reached. Cannot invite additional admins.',
      });
    }
  }

  // 3. Check if user already exists with active status
  const existingUser = await db('users').whereRaw('LOWER(email) = ?', [normalizedEmail]).first();
  if (existingUser && existingUser.status === 'active') {
    return res.status(400).json({
      message: 'A personnel account with this email address is already active.',
    });
  }

  // Cancel any existing pending invites for this email
  await db('invites')
    .whereRaw('LOWER(email) = ?', [normalizedEmail])
    .andWhere({ status: 'pending' })
    .update({ status: 'cancelled', updated_at: new Date() });

  // 4. Generate cryptographically secure one-time invite token
  const rawToken = generateRandomToken(32);
  const tokenHash = hashToken(rawToken);
  const inviteId = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const resolvedInternType =
    targetRole === USER_ROLES.PAID_INTERN
      ? 'paid'
      : targetRole === USER_ROLES.UNPAID_INTERN
      ? 'unpaid'
      : internType || null;

  // 5. Save invite in database with hashed token
  await db('invites').insert({
    id: inviteId,
    name: name.trim(),
    email: normalizedEmail,
    role: targetRole,
    intern_type: resolvedInternType,
    team_id: teamId || null,
    invited_by_user_id: req.user.id,
    token_hash: tokenHash,
    status: 'pending',
    expires_at: expiresAt,
    created_at: new Date(),
    updated_at: new Date(),
  });

  const pairedPaidInternId =
    req.user.role === USER_ROLES.PAID_INTERN && targetRole === USER_ROLES.UNPAID_INTERN
      ? req.user.id
      : null;

  // Ensure inactive/pending user record exists in users table
  if (!existingUser) {
    const userId = `u-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    await db('users').insert({
      id: userId,
      name: name.trim(),
      email: normalizedEmail,
      role: targetRole,
      intern_type: resolvedInternType,
      team_id: teamId || (req.user as any).team_id || null,
      paired_paid_intern_id: pairedPaidInternId,
      status: 'pending_invite',
      current_level: 1,
      created_at: new Date(),
      updated_at: new Date(),
    });
  } else {
    await db('users')
      .where({ id: existingUser.id })
      .update({
        role: targetRole,
        intern_type: resolvedInternType,
        team_id: teamId || (req.user as any).team_id || existingUser.team_id,
        paired_paid_intern_id: pairedPaidInternId || existingUser.paired_paid_intern_id,
        status: 'pending_invite',
        updated_at: new Date(),
      });
  }


  // 6. Build one-time invite link
  const inviteLink = `${ENV.CLIENT_ORIGIN}/accept-invite?token=${rawToken}`;

  // 7. Dispatch Welcome email
  try {
    await sendSystemNotification({
      eventType: 'WELCOME_EMAIL',
      recipientEmail: normalizedEmail,
      recipientName: name.trim(),
      variables: {
        invite_link: inviteLink,
        role: targetRole,
        inviter_name: (req.user as any)?.name || 'Central Office Admin',
      },
    });
  } catch (err) {
    console.warn('[Invite] Error dispatching welcome email:', err);
  }

  // Audit log
  try {
    await db('audit_logs').insert({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      user_id: req.user.id,
      user_name: req.user.name,
      action: 'INVITE_CREATED',
      resource_type: 'INVITE',
      resource_id: inviteId,
      details: JSON.stringify({ email: normalizedEmail, role: targetRole }),
      created_at: new Date(),
    });
  } catch (e) {
    console.warn('[AuditLog] Failed to record invite creation:', e);
  }

  return res.status(201).json({
    message: 'Welcome invite dispatched successfully',
    token: rawToken,
    inviteLink,
    invite: {
      id: inviteId,
      name: name.trim(),
      email: normalizedEmail,
      role: targetRole,
      internType: resolvedInternType,
      teamId: teamId || null,
      invitedByUserId: req.user.id,
      status: 'pending',
      expiresAt: expiresAt.toISOString(),
      inviteLink, // provided in response for verification & testing
    },
  });
}

/**
 * GET /api/invites - List invites
 */
export async function getInvites(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  let query = db('invites')
    .leftJoin('users as inviter', 'invites.invited_by_user_id', 'inviter.id')
    .leftJoin('teams', 'invites.team_id', 'teams.id')
    .select(
      'invites.id',
      'invites.name',
      'invites.email',
      'invites.role',
      'invites.intern_type as internType',
      'invites.team_id as teamId',
      'teams.name as teamName',
      'invites.invited_by_user_id as invitedByUserId',
      'inviter.name as invitedByUserName',
      'invites.status',
      'invites.expires_at as expiresAt',
      'invites.accepted_at as acceptedAt',
      'invites.created_at as createdAt'
    )
    .orderBy('invites.created_at', 'desc');

  // Role visibility:
  // Admin & Lead can see all invites
  // Core intern can see their own invites or invites for unpaid interns
  if (req.user.role === USER_ROLES.PAID_INTERN) {
    query = query.where(function () {
      this.where('invites.invited_by_user_id', req.user!.id).orWhere(
        'invites.role',
        USER_ROLES.UNPAID_INTERN
      );
    });
  } else if (req.user.role === USER_ROLES.UNPAID_INTERN) {
    return res.status(403).json({ message: 'Access denied' });
  }

  const invites = await query;

  // Auto-mark expired in output if past expires_at
  const now = new Date();
  const processed = invites.map((inv) => {
    let status = inv.status;
    if (status === 'pending' && new Date(inv.expiresAt) < now) {
      status = 'expired';
    }
    return {
      ...inv,
      status,
    };
  });

  return res.json(processed);
}

/**
 * POST /api/invites/:id/resend - Resend an invite
 */
export async function resendInvite(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const { id } = req.params;
  const invite = await db('invites').where({ id }).first();

  if (!invite) {
    return res.status(404).json({ message: 'Invite not found' });
  }

  // Only the original inviter or an Admin can resend
  if (req.user.role !== USER_ROLES.ADMIN && invite.invited_by_user_id !== req.user.id) {
    return res.status(403).json({ message: 'Only the inviter or an administrator can resend this invite' });
  }

  if (invite.status === 'accepted') {
    return res.status(400).json({ message: 'This invite has already been accepted.' });
  }

  const rawToken = generateRandomToken(32);
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db('invites')
    .where({ id })
    .update({
      token_hash: tokenHash,
      status: 'pending',
      expires_at: expiresAt,
      updated_at: new Date(),
    });

  const inviteLink = `${ENV.CLIENT_ORIGIN}/accept-invite?token=${rawToken}`;

  try {
    await sendSystemNotification({
      eventType: 'WELCOME_EMAIL',
      recipientEmail: invite.email,
      recipientName: invite.name,
      variables: {
        invite_link: inviteLink,
        role: invite.role,
        inviter_name: (req.user as any)?.name || 'Central Office Admin',
      },
    });
  } catch (err) {
    console.warn('[Invite] Error resending email:', err);
  }

  return res.json({
    message: 'Invite resent successfully',
    inviteLink,
    expiresAt: expiresAt.toISOString(),
  });
}

/**
 * POST /api/invites/:id/cancel - Cancel an invite
 */
export async function cancelInvite(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const { id } = req.params;
  const invite = await db('invites').where({ id }).first();

  if (!invite) {
    return res.status(404).json({ message: 'Invite not found' });
  }

  if (req.user.role !== USER_ROLES.ADMIN && invite.invited_by_user_id !== req.user.id) {
    return res.status(403).json({ message: 'Only the inviter or an administrator can cancel this invite' });
  }

  if (invite.status === 'accepted') {
    return res.status(400).json({ message: 'Cannot cancel an invite that has already been accepted' });
  }

  await db('invites')
    .where({ id })
    .update({
      status: 'cancelled',
      updated_at: new Date(),
    });

  return res.json({ message: 'Invite cancelled successfully' });
}

/**
 * GET /api/invites/verify/:token - Public token verification
 */
export async function verifyInvite(req: Request, res: Response) {
  const { token } = req.params;
  if (!token) {
    return res.status(400).json({
      valid: false,
      message: 'Invite token is required',
      canAskNew: true,
    });
  }

  const tokenHash = hashToken(token);
  const invite = await db('invites').where({ token_hash: tokenHash }).first();

  if (!invite) {
    return res.status(404).json({
      valid: false,
      message: 'Invalid invite link. Please check the URL or request a new invite.',
      canAskNew: true,
    });
  }

  if (invite.status === 'cancelled') {
    return res.status(400).json({
      valid: false,
      status: 'cancelled',
      message: 'This invite has been cancelled. Ask your team lead for a new invite.',
      canAskNew: true,
    });
  }

  if (invite.status === 'accepted') {
    return res.status(400).json({
      valid: false,
      status: 'accepted',
      message: 'This invite link has already been used.',
      canAskNew: true,
    });
  }

  const isExpired = new Date(invite.expires_at) < new Date();
  if (isExpired || invite.status === 'expired') {
    if (invite.status !== 'expired') {
      await db('invites').where({ id: invite.id }).update({ status: 'expired' });
    }
    return res.status(400).json({
      valid: false,
      status: 'expired',
      message: 'This invite link has expired. Invite links are valid for 7 days.',
      canAskNew: true,
    });
  }

  return res.json({
    valid: true,
    name: invite.name,
    email: invite.email,
    role: invite.role,
    internType: invite.intern_type,
    status: 'pending',
  });
}

/**
 * POST /api/invites/accept - Accept invite with Password or Microsoft
 */
export async function acceptInvite(req: Request, res: Response) {
  const { token, password, useMicrosoft, microsoftId } = req.body;

  if (!token) {
    return res.status(400).json({ message: 'Invite token is required' });
  }

  const tokenHash = hashToken(token);
  const invite = await db('invites').where({ token_hash: tokenHash }).first();

  if (!invite) {
    return res.status(404).json({
      message: 'Invalid invite link.',
      canAskNew: true,
    });
  }

  if (invite.status === 'cancelled') {
    return res.status(400).json({
      message: 'This invite was cancelled. Ask your team lead for a new invite.',
      canAskNew: true,
    });
  }

  if (invite.status === 'accepted') {
    return res.status(400).json({
      message: 'This invite link has already been used.',
      canAskNew: true,
    });
  }

  if (new Date(invite.expires_at) < new Date() || invite.status === 'expired') {
    await db('invites').where({ id: invite.id }).update({ status: 'expired' });
    return res.status(400).json({
      message: 'This invite link has expired.',
      canAskNew: true,
    });
  }

  let passwordHash: string | null = null;

  if (!useMicrosoft) {
    // Password validation rule: >= 10 chars, at least one letter, at least one number
    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }
    if (password.length < 10) {
      return res.status(400).json({ message: 'Password must be at least 10 characters long' });
    }
    if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      return res.status(400).json({ message: 'Password must contain at least one letter and one number' });
    }

    passwordHash = await hashPassword(password);
  }

  // Find or create user
  let user = await db('users').whereRaw('LOWER(email) = ?', [invite.email.toLowerCase()]).first();

  let pairedId = user?.paired_paid_intern_id || null;
  if (!pairedId && invite.role === USER_ROLES.UNPAID_INTERN) {
    const inviter = await db('users').where({ id: invite.invited_by_user_id }).first();
    if (inviter && inviter.role === USER_ROLES.PAID_INTERN) {
      pairedId = inviter.id;
    }
  }

  if (!user) {
    const userId = `u-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    await db('users').insert({
      id: userId,
      name: invite.name,
      email: invite.email.toLowerCase(),
      password_hash: passwordHash,
      microsoft_id: useMicrosoft ? microsoftId || `ms-${Date.now()}` : null,
      role: invite.role,
      intern_type: invite.intern_type,
      team_id: invite.team_id,
      paired_paid_intern_id: pairedId,
      status: 'active',
      current_level: 1,
      token_version: 1,
      created_at: new Date(),
      updated_at: new Date(),
    });
    user = await db('users').where({ id: userId }).first();
  } else {
    await db('users')
      .where({ id: user.id })
      .update({
        name: invite.name,
        role: invite.role,
        intern_type: invite.intern_type,
        team_id: invite.team_id || user.team_id,
        paired_paid_intern_id: pairedId,
        password_hash: passwordHash || user.password_hash,
        microsoft_id: useMicrosoft ? microsoftId || `ms-${Date.now()}` : user.microsoft_id,
        status: 'active',
        token_version: (user.token_version || 1) + 1,
        updated_at: new Date(),
      });
    user = await db('users').where({ id: user.id }).first();
  }


  // If assigned to a team, add to team_members
  if (invite.team_id) {
    const alreadyMember = await db('team_members')
      .where({ team_id: invite.team_id, user_id: user.id })
      .first();
    if (!alreadyMember) {
      await db('team_members').insert({
        id: `tm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        team_id: invite.team_id,
        user_id: user.id,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }
  }

  // Mark invite as accepted
  await db('invites')
    .where({ id: invite.id })
    .update({
      status: 'accepted',
      accepted_at: new Date(),
      updated_at: new Date(),
    });

  // Issue session with RS256 JWT access token and refresh cookie
  const session = await createSession(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.token_version || 1,
    },
    res,
    { ip: req.ip, userAgent: req.headers['user-agent'] }
  );

  return res.json({
    message: 'Welcome to Command Center! Account setup successfully.',
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      internType: user.intern_type,
      currentLevel: user.current_level,
    },
    redirectUrl: '/',
  });
}
