import { Router } from 'express';
import { authenticateToken } from '../../middleware/authenticate.js';
import {
  getNotifications,
  markNotificationAsRead,
  getApprovalInbox,
} from './notificationsController.js';

const router = Router();

router.get('/', authenticateToken, getNotifications);
router.patch('/:id/read', authenticateToken, markNotificationAsRead);
router.get('/approvals/inbox', authenticateToken, getApprovalInbox);

export default router;
