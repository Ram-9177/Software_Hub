import type { Request, Response, NextFunction } from 'express';
import { USER_ROLES, type UserRole } from '@command-center/shared';

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Permission denied: your role is not authorized to perform this action',
      });
    }

    next();
  };
}

export function canAccessInternData(req: Request, targetInternId: string): boolean {
  if (!req.user) return false;

  // Admin and Team Lead can view all/team work
  if (req.user.role === USER_ROLES.ADMIN || req.user.role === USER_ROLES.LEAD) {
    return true;
  }

  // User can access own data
  if (req.user.id === targetInternId) {
    return true;
  }

  // Core (paid) intern can access their paired unpaid interns' data
  if (req.user.role === USER_ROLES.PAID_INTERN) {
    return true; // Controller query will filter by paired_paid_intern_id == req.user.id
  }

  return false;
}
