import { Router } from 'express';
import {
  getCalendarEvents,
  createCalendarEvent,
  getGoogleCalendarStatus,
  getGoogleAuthUrl,
  handleGoogleCallback,
  syncGoogleCalendar,
  disconnectGoogleCalendar,
  getIcsFeed,
} from './calendarController.js';
import { authenticateToken } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/authorize.js';
import { USER_ROLES } from '@command-center/shared';

const router = Router();

// Public endpoints: Google OAuth callback and private .ics feed
router.get('/google/callback', handleGoogleCallback);
router.get('/feed/:token', getIcsFeed);

// Authenticated routes
router.use(authenticateToken);

router.get('/', getCalendarEvents);
router.post('/', requireRole(USER_ROLES.ADMIN, USER_ROLES.LEAD), createCalendarEvent);

// Google Calendar integration routes
router.get('/google/status', getGoogleCalendarStatus);
router.get('/google/auth-url', getGoogleAuthUrl);
router.post('/google/sync', syncGoogleCalendar);
router.post('/google/disconnect', disconnectGoogleCalendar);

export default router;
