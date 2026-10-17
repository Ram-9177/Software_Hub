import { z } from 'zod';
import { CERTIFICATE_LEVELS } from '../constants.js';

export const issueCertificateSchema = z.object({
  internId: z.string().min(1),
  level: z.number().min(1).max(15).optional(),
  templateId: z.string().optional(),
  category: z.enum(['paid', 'unpaid']).optional(),
  comments: z.string().optional(),
});

export type IssueCertificateInput = z.infer<typeof issueCertificateSchema>;

export const uploadMarksheetSchema = z.object({
  percentage: z.number().min(0).max(100),
  fileName: z.string().optional(),
});

export type UploadMarksheetInput = z.infer<typeof uploadMarksheetSchema>;

export const confirmMarksheetSchema = z.object({
  marksheetId: z.string().min(1),
  decision: z.enum(['confirm', 'reject']),
  confirmedPercentage: z.number().min(0).max(100).optional(),
});

export type ConfirmMarksheetInput = z.infer<typeof confirmMarksheetSchema>;
