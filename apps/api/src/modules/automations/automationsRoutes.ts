import { Router } from 'express';
import {
  getAutomations,
  updateAutomation,
  previewAutomation,
  getEmailLogs,
  getEmailTemplates,
  muteUserNotifications,
  triggerScheduledJob,
} from './automationsController.js';
import { authenticateToken } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/authorize.js';
import { USER_ROLES } from '@command-center/shared';

const router = Router();

router.use(authenticateToken);

// Any authenticated user can manage their personal notification muting
router.patch('/preferences/mute', muteUserNotifications);

// Management & Admin rules
router.get('/', requireRole(USER_ROLES.ADMIN, USER_ROLES.LEAD), getAutomations);
router.get('/email-templates/list', requireRole(USER_ROLES.ADMIN, USER_ROLES.LEAD), getEmailTemplates);
router.patch('/:id', requireRole(USER_ROLES.ADMIN), updateAutomation);
router.put('/:id', requireRole(USER_ROLES.ADMIN), updateAutomation);
router.get('/:id/preview', requireRole(USER_ROLES.ADMIN, USER_ROLES.LEAD), previewAutomation);
router.get('/logs', requireRole(USER_ROLES.ADMIN), getEmailLogs);
router.get('/email-logs/list', requireRole(USER_ROLES.ADMIN), getEmailLogs);
router.post('/jobs/:jobKey/run', requireRole(USER_ROLES.ADMIN), triggerScheduledJob);

export default router;
