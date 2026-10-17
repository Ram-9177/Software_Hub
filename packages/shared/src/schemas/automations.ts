import { z } from 'zod';
import { AUTOMATION_KEYS } from '../constants.js';

export const updateAutomationSchema = z.object({
  isEnabled: z.boolean().optional(),
  emailSubjectTemplate: z.string().optional(),
  emailBodyTemplate: z.string().optional(),
});

export type UpdateAutomationInput = z.infer<typeof updateAutomationSchema>;

export const updateNotificationPreferencesSchema = z.object({
  preferences: z.array(z.object({
    eventKey: z.string(),
    emailEnabled: z.boolean(),
    pushEnabled: z.boolean(),
  })),
});

export type UpdateNotificationPreferencesInput = z.infer<typeof updateNotificationPreferencesSchema>;
