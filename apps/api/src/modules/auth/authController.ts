import type { Request, Response } from 'express';
import { db } from '../../config/database.js';
import { ENV } from '../../config/env.js';
import {
  hashPassword,
  comparePassword,
  hashToken,
  generateRandomToken,
  LOCKOUT_THRESHOLD,
  LOCKOUT_DURATION_MS,
  getClientIp,
} from '../../config/security.js';
import {
  createSession,
  rotateRefreshToken,
  revokeSession,
  revokeAllSessionsForUser,
  clearRefreshTokenCookie,
  REFRESH_COOKIE_NAME,
} from '../../config/session.js';
import { sendSystemNotification } from '../automations/emailService.js';
import { USER_ROLES, INTERN_TYPES } from '@command-center/shared';

const UNIFORM_LOGIN_ERROR = 'Email or password is incorrect';

/**
 * Standard Login (Email & Password)
 */
export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: UNIFORM_LOGIN_ERROR });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await db('users').whereRaw('LOWER(email) = ?', [normalizedEmail]).first();

  // If user doesn't exist, simulate check and return uniform error
  if (!user) {
    return res.status(401).json({ message: UNIFORM_LOGIN_ERROR });
  }

  // Check 15-minute account lockout
  if (user.locked_until && new Date() < new Date(user.locked_until)) {
    const minutesLeft = Math.ceil(
      (new Date(user.locked_until).getTime() - Date.now()) / (60 * 1000)
    );
    return res.status(423).json({
      message: `Account is temporarily locked due to too many failed attempts. Try again in ${Math.max(1, minutesLeft)} minutes.`,
    });
  }

  // Deactivated / Pending check
  if (user.status !== 'active') {
    return res.status(401).json({ message: UNIFORM_LOGIN_ERROR });
  }

  // Password verification
  let passwordValid = false;
  if (user.password_hash) {
    passwordValid = await comparePassword(password, user.password_hash);
  }

  if (!passwordValid) {
    // Increment failed attempts
    const newFailedAttempts = (user.failed_login_attempts || 0) + 1;
    const updates: Record<string, any> = { failed_login_attempts: newFailedAttempts };

    if (newFailedAttempts >= LOCKOUT_THRESHOLD) {
      updates.locked_until = new Date(Date.now() + LOCKOUT_DURATION_MS);
      updates.failed_login_attempts = 0; // reset counter after locking
    }

    await db('users').where({ id: user.id }).update(updates);

    if (newFailedAttempts >= LOCKOUT_THRESHOLD) {
      return res.status(423).json({
        message: 'Account is temporarily locked due to too many failed attempts. Try again in 15 minutes.',
      });
    }

    return res.status(401).json({ message: UNIFORM_LOGIN_ERROR });
  }

  // Successful login: reset failed attempts & lockout
  await db('users').where({ id: user.id }).update({
    failed_login_attempts: 0,
    locked_until: null,
  });

  // Issue session (RS256 JWT access token + refresh token in cookie and hashed in Redis)
  const session = await createSession(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.token_version || 1,
    },
    res,
    { ip: getClientIp(req), userAgent: req.headers['user-agent'] }
  );

  return res.json({
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      internType: user.intern_type,
      pairedPaidInternId: user.paired_paid_intern_id,
      currentLevel: user.current_level,
      marksheetPercentage: user.marksheet_percentage,
      marksheetConfirmed: user.marksheet_confirmed,
      avatarUrl: user.avatar_url,
    },
    redirectUrl: '/',
  });
}

/**
 * Microsoft OpenID Connect SSO Sign-In:
 * Only invited emails can sign in. If uninvited, returns:
 * "You have not been invited. Ask your team lead." and creates nothing.
 */
export async function microsoftSignIn(req: Request, res: Response) {
  const { email, microsoftId, name } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required for Microsoft Sign-In' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  // 1. Check if user already exists
  let user = await db('users').whereRaw('LOWER(email) = ?', [normalizedEmail]).first();

  // 2. Check if an invite exists for this email
  const invite = await db('invites')
    .whereRaw('LOWER(email) = ?', [normalizedEmail])
    .whereIn('status', ['pending', 'accepted'])
    .first();

  // If neither user nor invite exists: reject and create nothing
  if (!user && !invite) {
    return res.status(403).json({
      message: 'You have not been invited. Ask your team lead.',
    });
  }

  // If user exists but is deactivated
  if (user && user.status === 'inactive') {
    return res.status(403).json({
      message: 'Your account has been deactivated. Ask your team lead.',
    });
  }

  // If pending invite without user: create user from invite details
  if (!user && invite) {
    const userId = `u-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    await db('users').insert({
      id: userId,
      name: name || invite.name,
      email: normalizedEmail,
      microsoft_id: microsoftId || `ms-${Date.now()}`,
      role: invite.role,
      intern_type: invite.intern_type,
      team_id: invite.team_id,
      status: 'active',
      current_level: 1,
      token_version: 1,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await db('invites').where({ id: invite.id }).update({
      status: 'accepted',
      accepted_at: new Date(),
      updated_at: new Date(),
    });

    user = await db('users').where({ id: userId }).first();
  } else if (user) {
    // Link Microsoft identity if not linked or activate if pending_invite
    const updates: Record<string, any> = {
      updated_at: new Date(),
    };
    if (!user.microsoft_id && microsoftId) {
      updates.microsoft_id = microsoftId;
    }
    if (user.status === 'pending_invite') {
      updates.status = 'active';
    }
    await db('users').where({ id: user.id }).update(updates);

    if (invite && invite.status === 'pending') {
      await db('invites').where({ id: invite.id }).update({
        status: 'accepted',
        accepted_at: new Date(),
        updated_at: new Date(),
      });
    }

    user = await db('users').where({ id: user.id }).first();
  }

  // Issue session
  const session = await createSession(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.token_version || 1,
    },
    res,
    { ip: getClientIp(req), userAgent: req.headers['user-agent'] }
  );

  return res.json({
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      internType: user.intern_type,
      currentLevel: user.current_level,
      avatarUrl: user.avatar_url,
    },
    redirectUrl: '/',
  });
}

/**
 * Token Refresh:
 * Validates refresh token from cookie or body, rotates hashed token in Redis, issues new tokens
 */
export async function refreshToken(req: Request, res: Response) {
  const token = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;

  if (!token) {
    return res.status(401).json({ message: 'Refresh token required' });
  }

  const session = await rotateRefreshToken(token, res, {
    ip: getClientIp(req),
    userAgent: req.headers['user-agent'],
  });

  if (!session) {
    clearRefreshTokenCookie(res);
    return res.status(401).json({ message: 'Refresh token invalid or expired' });
  }

  return res.json({
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  });
}

/**
 * Logout:
 * Ends the session on the server and clears the cookie
 */
export async function logout(req: Request, res: Response) {
  const token = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;

  if (req.user && token) {
    await revokeSession(req.user.id, token);
  }

  clearRefreshTokenCookie(res);
  return res.json({ message: 'Signed out successfully' });
}

/**
 * Sign out of all devices:
 * Invalidates all active Redis sessions and increments token_version in DB
 */
export async function signoutAllDevices(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  await revokeAllSessionsForUser(req.user.id);
  clearRefreshTokenCookie(res);

  return res.json({
    message: 'Successfully signed out of all devices. All other active sessions have been terminated.',
  });
}

/**
 * Forgot Password:
 * Single-use reset link that expires in 30 minutes. Always shows the same confirmation message.
 */
export async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body;
  const uniformConfirmation = 'If an account exists with this email, instructions have been dispatched.';

  if (!email) {
    return res.json({ message: uniformConfirmation });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await db('users').whereRaw('LOWER(email) = ?', [normalizedEmail]).first();

  if (user && user.status === 'active') {
    const rawResetToken = generateRandomToken(32);
    const tokenHash = hashToken(rawResetToken);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Invalidate previous resets
    await db('password_resets')
      .where({ user_id: user.id })
      .update({ used: true });

    await db('password_resets').insert({
      id: `pr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
      used: false,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const resetLink = `${ENV.CLIENT_ORIGIN}/reset-password?token=${rawResetToken}`;

    try {
      await sendSystemNotification({
        eventType: 'PASSWORD_RESET',
        recipientEmail: user.email,
        recipientName: user.name,
        variables: {
          reset_link: resetLink,
        },
      });
    } catch (e) {
      console.warn('[ForgotPassword] Email send error:', e);
    }
  }

  return res.json({ message: uniformConfirmation });
}

/**
 * Reset Password:
 * Verifies 30-minute token, updates password, signs out everywhere
 */
export async function resetPassword(req: Request, res: Response) {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ message: 'Token and new password are required' });
  }

  if (password.length < 10) {
    return res.status(400).json({ message: 'Password must be at least 10 characters long' });
  }
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
    return res.status(400).json({ message: 'Password must contain at least one letter and one number' });
  }

  const tokenHash = hashToken(token);
  const resetRecord = await db('password_resets')
    .where({ token_hash: tokenHash, used: false })
    .first();

  if (!resetRecord) {
    return res.status(400).json({ message: 'Invalid or expired password reset link' });
  }

  if (new Date(resetRecord.expires_at) < new Date()) {
    await db('password_resets').where({ id: resetRecord.id }).update({ used: true });
    return res.status(400).json({ message: 'This password reset link has expired (links expire after 30 minutes)' });
  }

  const user = await db('users').where({ id: resetRecord.user_id }).first();
  if (!user || user.status !== 'active') {
    return res.status(400).json({ message: 'Account is inactive or not found' });
  }

  const newHash = await hashPassword(password);

  // Update password and reset lockout/failed attempts
  await db('users')
    .where({ id: user.id })
    .update({
      password_hash: newHash,
      failed_login_attempts: 0,
      locked_until: null,
      updated_at: new Date(),
    });

  // Mark token as used
  await db('password_resets').where({ id: resetRecord.id }).update({ used: true });

  // Signing out everywhere: revoke all active sessions in Redis and increment token_version
  await revokeAllSessionsForUser(user.id);
  clearRefreshTokenCookie(res);

  return res.json({
    message: 'Password reset successfully. All active sessions have been terminated. Please sign in with your new password.',
  });
}

/**
 * Change Password (from Profile)
 */
export async function changePassword(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current password and new password are required' });
  }

  if (newPassword.length < 10) {
    return res.status(400).json({ message: 'Password must be at least 10 characters long' });
  }
  if (!/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
    return res.status(400).json({ message: 'Password must contain at least one letter and one number' });
  }

  const user = await db('users').where({ id: req.user.id }).first();
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (user.password_hash) {
    const valid = await comparePassword(currentPassword, user.password_hash);
    if (!valid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
  }

  const newHash = await hashPassword(newPassword);
  await db('users')
    .where({ id: user.id })
    .update({
      password_hash: newHash,
      updated_at: new Date(),
    });

  return res.json({ message: 'Password changed successfully' });
}

/**
 * Get Current User / Profile
 */
export async function getCurrentUser(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const user = await db('users').where({ id: req.user.id }).first();
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  let pairedPaidInternName = null;
  if (user.paired_paid_intern_id) {
    const paired = await db('users').where({ id: user.paired_paid_intern_id }).first();
    pairedPaidInternName = paired?.name || null;
  }

  let teamName = null;
  if (user.team_id) {
    const team = await db('teams').where({ id: user.team_id }).first();
    teamName = team?.name || null;
  }

  return res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    internType: user.intern_type,
    pairedPaidInternId: user.paired_paid_intern_id,
    pairedPaidInternName,
    teamId: user.team_id,
    teamName,
    currentLevel: user.current_level,
    marksheetPercentage: user.marksheet_percentage,
    marksheetConfirmed: user.marksheet_confirmed,
    avatarUrl: user.avatar_url,
    emailNotificationsMuted: Boolean(user.email_notifications_muted),
    pushNotificationsMuted: Boolean(user.push_notifications_muted),
    createdAt: user.created_at,
  });
}

/**
 * Update Profile Settings (Name, Avatar, Mute Preferences)
 */
export async function updateProfile(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const { name, avatarUrl, emailNotificationsMuted, pushNotificationsMuted } = req.body;
  const updates: Record<string, any> = { updated_at: new Date() };

  if (typeof name === 'string' && name.trim().length >= 2) {
    updates.name = name.trim();
  }
  if (typeof avatarUrl === 'string') {
    updates.avatar_url = avatarUrl;
  }
  if (typeof emailNotificationsMuted === 'boolean') {
    updates.email_notifications_muted = emailNotificationsMuted;
  }
  if (typeof pushNotificationsMuted === 'boolean') {
    updates.push_notifications_muted = pushNotificationsMuted;
  }

  await db('users').where({ id: req.user.id }).update(updates);
  const updatedUser = await db('users').where({ id: req.user.id }).first();

  return res.json({
    message: 'Profile updated successfully',
    user: {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      internType: updatedUser.intern_type,
      avatarUrl: updatedUser.avatar_url,
      emailNotificationsMuted: Boolean(updatedUser.email_notifications_muted),
      pushNotificationsMuted: Boolean(updatedUser.push_notifications_muted),
    },
  });
}

/**
 * Mock SSO for switching personas in testing/demo
 */
export async function mockSsoLogin(req: Request, res: Response) {
  const { role } = req.body;
  const targetRole = role || USER_ROLES.LEAD;
  let user = await db('users').where({ role: targetRole, status: 'active' }).first();

  if (!user && (process.env.NODE_ENV === 'test' || ENV.NODE_ENV === 'test')) {
    const id = `u-test-${String(targetRole).replace(/[^a-zA-Z0-9]/g, '-')}`;
    const name = `Test ${String(targetRole).replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}`;
    const email = `${String(targetRole).toLowerCase().replace(/[^a-zA-Z0-9]/g, '')}@test.softwarehub2.org`;
    await db('users').insert({
      id,
      name,
      email,
      role: targetRole,
      intern_type: targetRole === USER_ROLES.PAID_INTERN ? INTERN_TYPES.PAID : targetRole === USER_ROLES.UNPAID_INTERN ? INTERN_TYPES.UNPAID : null,
      current_level: targetRole === USER_ROLES.PAID_INTERN ? 5 : 1,
      status: 'active',
      token_version: 1,
      created_at: new Date(),
      updated_at: new Date(),
    });
    user = await db('users').where({ id }).first();
  }

  if (!user) {
    return res.status(404).json({ message: `No active user found for role: ${targetRole}` });
  }

  const session = await createSession(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.token_version || 1,
    },
    res,
    { ip: getClientIp(req), userAgent: req.headers['user-agent'] }
  );

  return res.json({
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      internType: user.intern_type,
      pairedPaidInternId: user.paired_paid_intern_id,
      currentLevel: user.current_level,
      marksheetPercentage: user.marksheet_percentage,
      marksheetConfirmed: user.marksheet_confirmed,
      avatarUrl: user.avatar_url,
    },
    redirectUrl: '/',
  });
}
