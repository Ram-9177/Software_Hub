import { Router } from 'express';
import {
  getUsers,
  createUser,
  createBulkInterns,
  pairIntern,
  promoteIntern,
  getAdminSummary,
  grantAdminRole,
  updateUser,
  getAuditLogs,
} from './userController.js';
import { authenticateToken } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/authorize.js';
import { validateBody } from '../../middleware/validate.js';
import { USER_ROLES, createInternsBulkSchema, pairInternSchema, promoteInternSchema } from '@command-center/shared';

const router = Router();

router.use(authenticateToken);

// Admin structure & limits
router.get('/admins/summary', getAdminSummary);
router.post('/admins', requireRole(USER_ROLES.ADMIN, USER_ROLES.LEAD), grantAdminRole);

// Audit logs
router.get('/audit-logs', requireRole(USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.LEAD), getAuditLogs);

// Directory & member management
router.get('/', getUsers);
// Admin, Manager, Lead, and Core interns can create users
router.post('/', requireRole(USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.LEAD, USER_ROLES.PAID_INTERN), createUser);
router.patch('/:id', requireRole(USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.LEAD), updateUser);
router.post('/bulk', requireRole(USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.LEAD, USER_ROLES.PAID_INTERN), validateBody(createInternsBulkSchema), createBulkInterns);
router.post('/pair', requireRole(USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.LEAD), validateBody(pairInternSchema), pairIntern);
router.post('/promote', requireRole(USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.LEAD), validateBody(promoteInternSchema), promoteIntern);

export default router;
