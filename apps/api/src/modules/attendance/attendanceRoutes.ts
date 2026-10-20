import { Router } from 'express';
import {
  getTodayAttendance,
  getAttendanceStats,
  getRegister,
  checkIn,
  checkOut,
  getAttendanceRules,
  updateAttendanceRules,
  requestLeave,
  getLeaveRequests,
  reviewLeaveRequest,
} from './attendanceController.js';
import { authenticateToken } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/authorize.js';
import { validateBody } from '../../middleware/validate.js';
import { USER_ROLES, updateAttendanceRulesSchema, requestLeaveSchema } from '@command-center/shared';

const router = Router();

router.use(authenticateToken);

router.get('/today', getTodayAttendance);
router.get('/stats', getAttendanceStats);
router.get('/register', getRegister);
router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.get('/rules', getAttendanceRules);
// Admin only sets attendance rules
router.put('/rules', requireRole(USER_ROLES.ADMIN), validateBody(updateAttendanceRulesSchema), updateAttendanceRules);
router.get('/leave', getLeaveRequests);
router.post('/leave', validateBody(requestLeaveSchema), requestLeave);
router.post('/leave/:id/review', requireRole(USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.LEAD), reviewLeaveRequest);

export default router;
