import { Router } from 'express';
import {
  getChannels,
  getMessages,
  sendMessage,
  toggleReaction,
  pinMessage,
  clearChannelMessages,
  createTeam,
  addTeamMember,
  removeTeamMember,
} from './chatController.js';
import { authenticateToken } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/authorize.js';
import { validateBody } from '../../middleware/validate.js';
import { upload } from '../../middleware/upload.js';
import { USER_ROLES, createTeamSchema, addTeamMemberSchema } from '@command-center/shared';

const router = Router();

router.use(authenticateToken);

router.get('/channels', getChannels);
router.get('/channels/:channelId/messages', getMessages);
router.post('/channels/:channelId/messages', upload.single('file'), sendMessage);
router.post('/messages/:messageId/reactions', toggleReaction);
router.put('/messages/:messageId/pin', pinMessage);
router.delete(
  '/channels/:channelId/messages',
  requireRole(USER_ROLES.ADMIN, USER_ROLES.LEAD),
  clearChannelMessages
);

// Team creation and membership routes
router.post(
  '/teams',
  requireRole(USER_ROLES.ADMIN, USER_ROLES.LEAD),
  validateBody(createTeamSchema),
  createTeam
);
router.post(
  '/teams/:teamId/members',
  requireRole(USER_ROLES.ADMIN, USER_ROLES.LEAD),
  validateBody(addTeamMemberSchema),
  addTeamMember
);
router.delete(
  '/teams/:teamId/members/:userId',
  requireRole(USER_ROLES.ADMIN, USER_ROLES.LEAD),
  removeTeamMember
);

export default router;
