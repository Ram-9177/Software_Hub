import { z } from 'zod';

export const monthEndLevelReviewSchema = z.object({
  internId: z.string().min(1),
  level: z.number().int().min(1).max(15),
  decision: z.enum(['pass', 'repeat']),
  notes: z.string().optional(),
});

export type MonthEndLevelReviewInput = z.infer<typeof monthEndLevelReviewSchema>;

export const giveKudosSchema = z.object({
  toUserId: z.string().min(1),
  points: z.number().int().min(1).max(50),
  reason: z.string().min(3),
  taskId: z.string().min(1).optional(),
});

export type GiveKudosInput = z.infer<typeof giveKudosSchema>;
