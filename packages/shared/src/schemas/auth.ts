import { z } from 'zod';
import { USER_ROLES, INTERN_TYPES } from '../constants.js';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum([USER_ROLES.ADMIN, USER_ROLES.LEAD, USER_ROLES.PAID_INTERN, USER_ROLES.UNPAID_INTERN]),
  internType: z.enum([INTERN_TYPES.PAID, INTERN_TYPES.UNPAID]).optional(),
  pairedPaidInternId: z.string().uuid().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
