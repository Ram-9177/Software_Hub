import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtKeys } from '../config/keys.js';
import { db } from '../config/database.js';
import type { UserRole } from '@command-center/shared';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  internType?: 'paid' | 'unpaid' | null;
  pairedPaidInternId?: string | null;
  currentLevel: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const { publicKey } = getJwtKeys();
    const payload = jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as {
      sub: string;
      email: string;
      role: UserRole;
    };

    const user = await db('users').where({ id: payload.sub }).first();
    if (!user || user.status !== 'active') {
      return res.status(401).json({ message: 'User account not active or not found' });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as UserRole,
      internType: user.intern_type,
      pairedPaidInternId: user.paired_paid_intern_id,
      currentLevel: user.current_level || 1,
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired authentication token' });
  }
}
