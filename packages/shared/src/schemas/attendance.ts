import { z } from 'zod';

export const requestLeaveSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  reason: z.string().min(3),
});

export type RequestLeaveInput = z.infer<typeof requestLeaveSchema>;

export const reviewLeaveSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  note: z.string().optional(),
});

export type ReviewLeaveInput = z.infer<typeof reviewLeaveSchema>;

export const updateAttendanceRulesSchema = z.object({
  officeStartTime: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:MM format (e.g. 09:00)'),
  graceMinutes: z.number().int().min(0).max(120),
  halfDayHours: z.number().min(1).max(12),
  absentCutoffTime: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:MM format (e.g. 11:00)'),
});

export type UpdateAttendanceRulesInput = z.infer<typeof updateAttendanceRulesSchema>;
