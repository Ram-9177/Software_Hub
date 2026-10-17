import { Router } from 'express';
import { login, refreshToken, logout, getCurrentUser, mockSsoLogin, googleSignIn, forgotPassword } from './authController.js';
import { authenticateToken } from '../../middleware/authenticate.js';
import { validateBody } from '../../middleware/validate.js';
import { loginSchema, refreshTokenSchema } from '@command-center/shared';

const router = Router();

router.post('/login', validateBody(loginSchema), login);
router.post('/google-signin', googleSignIn);
router.post('/forgot-password', forgotPassword);
router.post('/refresh', validateBody(refreshTokenSchema), refreshToken);
router.post('/logout', authenticateToken, logout);
router.get('/me', authenticateToken, getCurrentUser);
router.post('/mock-sso', mockSsoLogin);

export default router;

