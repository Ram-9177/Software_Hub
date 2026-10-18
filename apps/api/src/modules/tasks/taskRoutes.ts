import { Router } from 'express';
import { getTasks, createTask, uploadPartWork, reviewTaskPart, reassignTaskPart } from './taskController.js';
import { authenticateToken } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/authorize.js';
import { validateBody } from '../../middleware/validate.js';
import { upload } from '../../middleware/upload.js';
import { USER_ROLES, createTaskSchema, reviewTaskPartSchema } from '@command-center/shared';

const router = Router();

router.use(authenticateToken);

router.get('/', getTasks);
router.post(
  '/',
  requireRole(USER_ROLES.ADMIN, USER_ROLES.LEAD, USER_ROLES.PAID_INTERN),
  validateBody(createTaskSchema),
  createTask
);
router.post('/parts/:partId/upload', upload.single('file'), uploadPartWork);
router.post(
  '/parts/:partId/review',
  requireRole(USER_ROLES.ADMIN, USER_ROLES.LEAD, USER_ROLES.PAID_INTERN),
  validateBody(reviewTaskPartSchema),
  reviewTaskPart
);
router.post(
  '/parts/:partId/reassign',
  requireRole(USER_ROLES.ADMIN, USER_ROLES.LEAD, USER_ROLES.PAID_INTERN),
  reassignTaskPart
);

export default router;
