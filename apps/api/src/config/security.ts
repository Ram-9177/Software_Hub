import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import type { Request, Response, NextFunction } from 'express';
import { getRedisClient } from './redis.js';

export const BCRYPT_SALT_ROUNDS = 12;
export const LOCKOUT_THRESHOLD = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Hash raw token using SHA-256 for secure storage (invites, refresh tokens, resets)
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Hash password with bcrypt cost 12
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Compare password with hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate cryptographically secure random token
 */
export function generateRandomToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Extract client IP reliably
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || '127.0.0.1';
}

/**
 * Sliding window or fixed-window rate limiter using Redis
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const redis = getRedisClient();
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, windowSeconds);
    }
    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
    };
  } catch (err) {
    // Fail-open for rate limiter if Redis is unresponsive
    console.warn('[RateLimit] Error checking rate limit for key:', key, err);
    return { allowed: true, remaining: limit };
  }
}

/**
 * Express middleware generator for rate limiting
 */
export function createRateLimiter(options: {
  prefix: string;
  limit: number;
  windowSeconds: number;
  includeEmailFromBody?: boolean;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIp(req);
    const ipKey = `rate_limit:${options.prefix}:ip:${ip}`;
    const ipCheck = await checkRateLimit(ipKey, options.limit, options.windowSeconds);

    if (!ipCheck.allowed) {
      return res.status(429).json({
        message: 'Too many requests from this address. Please try again later.',
      });
    }

    if (options.includeEmailFromBody && req.body?.email) {
      const email = String(req.body.email).trim().toLowerCase();
      const emailKey = `rate_limit:${options.prefix}:email:${email}`;
      const emailCheck = await checkRateLimit(emailKey, options.limit, options.windowSeconds);

      if (!emailCheck.allowed) {
        return res.status(429).json({
          message: 'Too many requests for this account. Please try again later.',
        });
      }
    }

    next();
  };
}
