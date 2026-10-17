import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../../config/database.js';
import { getRedisClient } from '../../config/redis.js';
import { getJwtKeys } from '../../config/keys.js';
import { ENV } from '../../config/env.js';
import { USER_ROLES } from '@command-center/shared';

function generateTokens(user: { id: string; email: string; role: string }) {
  const { privateKey } = getJwtKeys();
  const accessToken = jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    privateKey,
    { algorithm: 'RS256', expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { sub: user.id, type: 'refresh' },
    privateKey,
    { algorithm: 'RS256', expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  const user = await db('users').where({ email }).first();
  if (!user || user.status !== 'active') {
    return res.status(401).json({ message: 'Invalid credentials or inactive account' });
  }

  if (user.password_hash) {
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
  }

  const { accessToken, refreshToken } = generateTokens(user);

  // Store refresh token in Redis with 7-day TTL
  const redis = getRedisClient();
  await redis.set(`refresh_token:${user.id}`, refreshToken, 'EX', 7 * 24 * 60 * 60);

  return res.json({
    accessToken,
    refreshToken,
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
    },
  });
}

export async function mockSsoLogin(req: Request, res: Response) {
  const { role } = req.body;

  const targetRole = role || USER_ROLES.LEAD;
  const user = await db('users').where({ role: targetRole }).first();

  if (!user) {
    return res.status(404).json({ message: `No user found for role: ${targetRole}` });
  }

  const { accessToken, refreshToken } = generateTokens(user);

  const redis = getRedisClient();
  await redis.set(`refresh_token:${user.id}`, refreshToken, 'EX', 7 * 24 * 60 * 60);

  return res.json({
    accessToken,
    refreshToken,
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
    },
  });
}

export async function refreshToken(req: Request, res: Response) {
  const { refreshToken } = req.body;

  try {
    const { publicKey } = getJwtKeys();
    const payload = jwt.verify(refreshToken, publicKey, { algorithms: ['RS256'] }) as { sub: string };

    const redis = getRedisClient();
    const stored = await redis.get(`refresh_token:${payload.sub}`);
    if (stored !== refreshToken) {
      return res.status(401).json({ message: 'Refresh token invalid or revoked' });
    }

    const user = await db('users').where({ id: payload.sub }).first();
    if (!user || user.status !== 'active') {
      return res.status(401).json({ message: 'User not active or found' });
    }

    const tokens = generateTokens(user);
    await redis.set(`refresh_token:${user.id}`, tokens.refreshToken, 'EX', 7 * 24 * 60 * 60);

    return res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
}

export async function logout(req: Request, res: Response) {
  if (req.user) {
    const redis = getRedisClient();
    await redis.del(`refresh_token:${req.user.id}`);
  }
  return res.json({ message: 'Signed out successfully' });
}

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

  return res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    internType: user.intern_type,
    pairedPaidInternId: user.paired_paid_intern_id,
    pairedPaidInternName,
    currentLevel: user.current_level,
    marksheetPercentage: user.marksheet_percentage,
    marksheetConfirmed: user.marksheet_confirmed,
  });
}

export async function googleSignIn(req: Request, res: Response) {
  const { email, name, idToken } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required for Google Sign-In' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  // Find user by email
  const user = await db('users').whereRaw('LOWER(email) = ?', [normalizedEmail]).first();

  if (!user) {
    // Audit log failed attempt
    try {
      await db('audit_logs').insert({
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        user_id: null,
        user_name: name || 'Google SSO User',
        action: 'LOGIN_FAILED',
        resource_type: 'AUTH',
        resource_id: normalizedEmail,
        details: JSON.stringify({ reason: 'Unrecognized Google account', email: normalizedEmail }),
        created_at: new Date(),
      });
    } catch (e) {
      console.warn('[AuditLog] Failed to record login failure:', e);
    }

    return res.status(401).json({
      message: 'Account not recognized. Contact Administrator to request access.',
    });
  }

  if (user.status !== 'active') {
    return res.status(403).json({ message: 'Account is deactivated. Contact Administrator.' });
  }

  const { accessToken, refreshToken } = generateTokens(user);

  // Store refresh token in Redis
  const redis = getRedisClient();
  await redis.set(`refresh_token:${user.id}`, refreshToken, 'EX', 7 * 24 * 60 * 60);

  // Audit log success
  try {
    await db('audit_logs').insert({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      user_id: user.id,
      user_name: user.name,
      action: 'LOGIN_SUCCESS',
      resource_type: 'AUTH',
      resource_id: user.id,
      details: JSON.stringify({ method: 'google_sso', email: user.email }),
      created_at: new Date(),
    });
  } catch (e) {
    console.warn('[AuditLog] Failed to record login success:', e);
  }

  return res.json({
    accessToken,
    refreshToken,
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
    },
  });
}

export async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await db('users').whereRaw('LOWER(email) = ?', [normalizedEmail]).first();

  if (user) {
    try {
      const { sendSystemNotification } = await import('../automations/emailService.js');
      await sendSystemNotification({
        eventType: 'PASSWORD_RESET',
        recipientEmail: user.email,
        recipientName: user.name,
        variables: {
          reset_link: `${ENV.CLIENT_ORIGIN}/reset-password?token=${Date.now()}`,
        },
      });
    } catch (e) {
      console.warn('[ForgotPassword] Email send error:', e);
    }

    try {
      await db('audit_logs').insert({
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        user_id: user.id,
        user_name: user.name,
        action: 'PASSWORD_RESET_REQUESTED',
        resource_type: 'AUTH',
        resource_id: user.id,
        details: JSON.stringify({ email: user.email }),
        created_at: new Date(),
      });
    } catch (e) {
      console.warn('[AuditLog] Failed to record password reset:', e);
    }
  }

  return res.json({
    message: 'If an account exists with this email, instructions have been dispatched.',
  });
}

