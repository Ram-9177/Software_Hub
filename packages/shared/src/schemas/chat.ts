import { z } from 'zod';

export const createChannelSchema = z.object({
  name: z.string().min(2),
  type: z.enum(['team', 'group', 'direct']),
  memberIds: z.array(z.string().min(1)).min(1),
  teamId: z.string().min(1).optional(),
});

export type CreateChannelInput = z.infer<typeof createChannelSchema>;

export const sendMessageSchema = z.object({
  channelId: z.string().min(1),
  text: z.string().optional(),
  linkedTaskId: z.string().min(1).optional(),
  attachments: z.array(z.object({
    url: z.string(),
    fileName: z.string(),
    fileType: z.string(),
    fileSize: z.number(),
  })).optional(),
}).refine(data => (data.text && data.text.trim().length > 0) || (data.attachments && data.attachments.length > 0) || data.linkedTaskId, {
  message: 'Message must have text, an attachment, or a linked task',
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const toggleReactionSchema = z.object({
  messageId: z.string().min(1),
  emoji: z.string().min(1).max(8),
});

export type ToggleReactionInput = z.infer<typeof toggleReactionSchema>;

export const pinMessageSchema = z.object({
  messageId: z.string().min(1),
  isPinned: z.boolean(),
});

export type PinMessageInput = z.infer<typeof pinMessageSchema>;

export const createTeamSchema = z.object({
  name: z.string().trim().min(2, 'Team name must be at least 2 characters').max(50, 'Team name cannot exceed 50 characters'),
  description: z.string().trim().max(250).optional(),
  leadId: z.string().min(1, 'Team lead is required'),
  memberIds: z.array(z.string().min(1)).default([]),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;

export const addTeamMemberSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

export type AddTeamMemberInput = z.infer<typeof addTeamMemberSchema>;

