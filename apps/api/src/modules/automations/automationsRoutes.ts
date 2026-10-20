import { Router } from 'express';
import {
  getAutomations,
  updateAutomation,
  previewAutomation,
  getEmailLogs,
  getEmailTemplates,
  updateEmailTemplate,
  muteUserNotifications,
  triggerScheduledJob,
  sendTestEmail,
  retryEmailLog,
  getPowerAutomateStatus,
  updatePowerAutomateConfig,
  testPowerAutomateFlow,
} from './automationsController.js';
import { authenticateToken } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/authorize.js';
import { USER_ROLES } from '@command-center/shared';

const router = Router();

router.use(authenticateToken);

// Any authenticated user can manage their personal notification muting
router.patch('/preferences/mute', muteUserNotifications);

// Microsoft Power Automate (No Entra ID) Configuration & Test
router.get('/power-automate/status', requireRole(USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.LEAD), getPowerAutomateStatus);
router.put('/power-automate/config', requireRole(USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.LEAD), updatePowerAutomateConfig);
router.post('/power-automate/test', requireRole(USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.LEAD), testPowerAutomateFlow);

// Specific email template & log routes (MUST come before /:id parameter)
router.get('/email-templates/list', requireRole(USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.LEAD), getEmailTemplates);
router.post('/email-templates/test', requireRole(USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.LEAD), sendTestEmail);
router.put('/email-templates/:id', requireRole(USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.LEAD), updateEmailTemplate);

router.get('/email-logs/list', requireRole(USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.LEAD), getEmailLogs);
router.get('/logs', requireRole(USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.LEAD), getEmailLogs);
router.post('/email-logs/:id/retry', requireRole(USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.LEAD), retryEmailLog);

router.post('/test-email', requireRole(USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.LEAD), sendTestEmail);
router.post('/jobs/:jobKey/run', requireRole(USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.LEAD), triggerScheduledJob);

// Management & Admin automation rules
router.get('/', requireRole(USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.LEAD), getAutomations);
router.get('/:id/preview', requireRole(USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.LEAD), previewAutomation);
router.patch('/:id', requireRole(USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.LEAD), updateAutomation);
router.put('/:id', requireRole(USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.LEAD), updateAutomation);

export default router;
