import { Router } from 'express';
import { exportAttendanceExcel, exportTrackerExcel, exportCertificatesExcel } from './exportController.js';
import { authenticateToken } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/authorize.js';
import { USER_ROLES } from '@command-center/shared';

const router = Router();

router.use(authenticateToken);
router.use(requireRole(USER_ROLES.ADMIN, USER_ROLES.LEAD));

router.get('/attendance', exportAttendanceExcel);
router.get('/tracker', exportTrackerExcel);
router.get('/certificates', exportCertificatesExcel);

export default router;
