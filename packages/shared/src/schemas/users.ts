import { z } from 'zod';
import { INTERN_TYPES } from '../constants.js';

export const createInternsBulkSchema = z.object({
  emails: z.array(z.string().email()).min(1),
  type: z.enum([INTERN_TYPES.PAID, INTERN_TYPES.UNPAID]),
  worksWithId: z.string().min(1).optional(), // For unpaid interns, the paid intern they work with
  teamId: z.string().min(1).optional(),
});

export type CreateInternsBulkInput = z.infer<typeof createInternsBulkSchema>;

export const pairInternSchema = z.object({
  unpaidInternId: z.string().min(1),
  paidInternId: z.string().min(1),
});

export type PairInternInput = z.infer<typeof pairInternSchema>;

export const promoteInternSchema = z.object({
  internId: z.string().min(1),
  decision: z.enum(['approve', 'reject']),
});

export type PromoteInternInput = z.infer<typeof promoteInternSchema>;
