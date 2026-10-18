import { Router } from 'express';
import {
  createInvite,
  getInvites,
  resendInvite,
  cancelInvite,
  verifyInvite,
  acceptInvite,
} from './inviteController.js';
import { authenticateToken } from '../../middleware/authenticate.js';
import { validateBody } from '../../middleware/validate.js';
import { createInviteSchema, acceptInviteSchema } from '@command-center/shared';
import { createRateLimiter } from '../../config/security.js';

const router = Router();

const inviteRateLimiter = createRateLimiter({
  prefix: 'invite',
  limit: 30,
  windowSeconds: 60,
});

const acceptRateLimiter = createRateLimiter({
  prefix: 'invite_accept',
  limit: 20,
  windowSeconds: 60,
});

// Public endpoints
router.get('/verify/:token', verifyInvite);
router.post('/accept', acceptRateLimiter, validateBody(acceptInviteSchema), acceptInvite);

// Authenticated endpoints
router.use(authenticateToken);
router.get('/', getInvites);
router.post('/', inviteRateLimiter, validateBody(createInviteSchema), createInvite);
router.post('/:id/resend', resendInvite);
router.post('/:id/cancel', cancelInvite);

export default router;
