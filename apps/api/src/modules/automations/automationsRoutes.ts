import { Router } from 'express';
import {
  getAutomations,
  updateAutomation,
  previewAutomation,
  getEmailTemplates,
  updateEmailTemplate,
  sendTestEmail,
  getEmailLogs,
  retryEmail,
} from './automationsController.js';
import { authenticateToken } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/authorize.js';
import { validateBody } from '../../middleware/validate.js';
import { USER_ROLES, updateAutomationSchema } from '@command-center/shared';

const router = Router();

router.use(authenticateToken);
router.use(requireRole(USER_ROLES.ADMIN, USER_ROLES.LEAD));

// Automations management
router.get('/', getAutomations);
router.put('/:id', validateBody(updateAutomationSchema), updateAutomation);
router.get('/:id/preview', previewAutomation);

// Email templates (Section 6)
router.get('/email-templates/list', getEmailTemplates);
router.put('/email-templates/:id', updateEmailTemplate);
router.post('/email-templates/test', sendTestEmail);

// Email delivery logs & retry (Section 5)
router.get('/email-logs/list', getEmailLogs);
router.post('/email-logs/:id/retry', retryEmail);

export default router;
