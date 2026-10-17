import { Router } from 'express';
import { getTrackerMetrics, submitLevelReview } from './trackerController.js';
import { authenticateToken } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/authorize.js';
import { validateBody } from '../../middleware/validate.js';
import { USER_ROLES, monthEndLevelReviewSchema } from '@command-center/shared';

const router = Router();

router.use(authenticateToken);

router.get('/metrics', getTrackerMetrics);
router.post(
  '/level-review',
  requireRole(USER_ROLES.ADMIN, USER_ROLES.LEAD),
  validateBody(monthEndLevelReviewSchema),
  submitLevelReview
);

export default router;
