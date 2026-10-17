import { z } from 'zod';
import { TASK_PRIORITIES, UPLOAD_KINDS } from '../constants.js';

export const createTaskPartInputSchema = z.object({
  title: z.string().min(2),
  assignedInternId: z.string().min(1),
  dueDate: z.string().datetime(),
});

export const createTaskSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  dueDate: z.string().datetime(),
  priority: z.enum([TASK_PRIORITIES.LOW, TASK_PRIORITIES.MEDIUM, TASK_PRIORITIES.HIGH]).default(TASK_PRIORITIES.MEDIUM),
  parts: z.array(createTaskPartInputSchema).min(1),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const uploadTaskWorkSchema = z.object({
  kind: z.enum([UPLOAD_KINDS.FILE, UPLOAD_KINDS.GIT_LINK, UPLOAD_KINDS.DOCUMENTATION]),
  gitLink: z.string().url().optional(),
  documentationLink: z.string().url().optional(),
  fileName: z.string().optional(),
});

export type UploadTaskWorkInput = z.infer<typeof uploadTaskWorkSchema>;

export const reviewTaskPartSchema = z.object({
  action: z.enum(['approve', 'send_back']),
  rating: z.number().int().min(1).max(5).optional(), // 1 to 5 stars
  comment: z.string().optional(),
}).refine((data) => {
  if (data.action === 'approve') {
    return data.rating !== undefined;
  }
  if (data.action === 'send_back') {
    return data.comment && data.comment.trim().length > 0;
  }
  return true;
}, {
  message: 'Approval requires a rating between 1 and 5; Sending back requires a feedback comment',
});

export type ReviewTaskPartInput = z.infer<typeof reviewTaskPartSchema>;
