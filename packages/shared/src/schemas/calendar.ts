import { z } from 'zod';

export const createEventSchema = z.object({
  title: z.string().min(2),
  type: z.enum(['meeting', 'deadline', 'holiday', 'review', 'lockout']),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  teamId: z.string().uuid().optional(),
  appliesToRole: z.string().optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
