import { Router } from 'express';
import {
  login,
  microsoftSignIn,
  refreshToken,
  logout,
  signoutAllDevices,
  forgotPassword,
  resetPassword,
  getCurrentUser,
  updateProfile,
  changePassword,
  mockSsoLogin,
} from './authController.js';
import { authenticateToken } from '../../middleware/authenticate.js';
import { validateBody } from '../../middleware/validate.js';
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
} from '@command-center/shared';
import { createRateLimiter } from '../../config/security.js';

const router = Router();

const loginLimiter = createRateLimiter({
  prefix: 'login',
  limit: 15,
  windowSeconds: 60,
  includeEmailFromBody: true,
});

const resetLimiter = createRateLimiter({
  prefix: 'pwd_reset',
  limit: 10,
  windowSeconds: 60,
  includeEmailFromBody: true,
});

// Authentication routes
router.post('/login', loginLimiter, validateBody(loginSchema), login);
router.post('/microsoft-signin', loginLimiter, microsoftSignIn);
router.post('/refresh', refreshToken);
router.post('/forgot-password', resetLimiter, validateBody(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', resetLimiter, validateBody(resetPasswordSchema), resetPassword);
router.post('/mock-sso', mockSsoLogin);

// Session endpoints
router.post('/logout', logout);
router.post('/signout-all', authenticateToken, signoutAllDevices);

// User & Profile endpoints
router.get('/me', authenticateToken, getCurrentUser);
router.get('/profile', authenticateToken, getCurrentUser);
router.patch('/profile', authenticateToken, validateBody(updateProfileSchema), updateProfile);
router.post('/change-password', authenticateToken, validateBody(changePasswordSchema), changePassword);

export default router;
