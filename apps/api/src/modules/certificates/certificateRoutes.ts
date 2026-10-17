import { Router } from 'express';
import {
  getCertificates,
  getCertificateTemplates,
  updateCertificateTemplate,
  checkEligibility,
  issueCertificate,
  reissueCertificate,
  downloadCertificatePdf,
  publicVerifyCertificate,
} from './certificateController.js';
import { authenticateToken } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/authorize.js';
import { validateBody } from '../../middleware/validate.js';
import { USER_ROLES, issueCertificateSchema } from '@command-center/shared';

const router = Router();

// Public verification without login
router.get('/verify/:certNumber', publicVerifyCertificate);

// Protected routes
router.use(authenticateToken);
router.get('/', getCertificates);
router.get('/templates', getCertificateTemplates);
router.put('/templates/:id', requireRole(USER_ROLES.ADMIN, USER_ROLES.LEAD), updateCertificateTemplate);
router.get('/eligibility', checkEligibility);
router.post(
  '/issue',
  requireRole(USER_ROLES.ADMIN, USER_ROLES.LEAD),
  validateBody(issueCertificateSchema),
  issueCertificate
);
router.post(
  '/:id/reissue',
  requireRole(USER_ROLES.ADMIN, USER_ROLES.LEAD),
  reissueCertificate
);
router.get('/:certNumber/pdf', downloadCertificatePdf);

export default router;
