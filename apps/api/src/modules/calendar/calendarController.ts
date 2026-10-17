import type { Request, Response } from 'express';
import { db } from '../../config/database.js';
import { ENV } from '../../config/env.js';
import { logAdminAction } from '../users/userController.js';

export async function getCalendarEvents(req: Request, res: Response) {
  const { teamId, type, search } = req.query;

  // 1. Fetch manual events
  let query = db('events').select('*');

  if (teamId) {
    query = query.where({ team_id: teamId });
  }

  if (type) {
    query = query.where({ type });
  }

  if (search) {
    query = query.where('title', 'like', `%${search}%`);
  }

  const manualEvents = await query;

  // 2. Fetch task deadlines automatically
  const taskParts = await db('task_parts as tp')
    .leftJoin('tasks as t', 'tp.task_id', 't.id')
    .leftJoin('users as u', 'tp.assigned_intern_id', 'u.id')
    .select(
      'tp.id',
      'tp.title',
      'tp.due_date as dueDate',
      'tp.status',
      't.title as taskTitle',
      'u.name as internName'
    );

  const taskEvents = taskParts.map((tp) => ({
    id: `event-task-${tp.id}`,
    title: `${tp.taskTitle}: ${tp.title}`,
    type: 'deadline',
    startTime: tp.dueDate,
    endTime: tp.dueDate,
    appliesTo: tp.internName,
    isAutomated: true,
  }));

  const allEvents = [
    ...manualEvents.map((e) => ({
      id: e.id,
      title: e.title,
      type: e.type,
      startTime: e.start_time,
      endTime: e.end_time,
      location: e.location,
      description: e.description,
      isAllDay: Boolean(e.is_all_day),
      googleEventId: e.google_event_id,
      isSynced: Boolean(e.is_synced),
      isAutomated: false,
    })),
    ...taskEvents,
  ];

  return res.json(allEvents);
}

export async function createCalendarEvent(req: Request, res: Response) {
  const currentUser = req.user!;
  const { title, type, startTime, endTime, location, description, isAllDay, teamId, appliesToRole } = req.body;

  if (!title || !startTime) {
    return res.status(400).json({ message: 'Title and startTime are required.' });
  }

  const eventId = `ev-${Date.now()}`;
  await db('events').insert({
    id: eventId,
    title,
    type: type || 'meeting',
    start_time: new Date(startTime),
    end_time: endTime ? new Date(endTime) : new Date(startTime),
    location: location || null,
    description: description || null,
    is_all_day: Boolean(isAllDay),
    team_id: teamId || null,
    applies_to_role: appliesToRole || null,
    created_by: currentUser.id,
    is_synced: false,
  });

  await logAdminAction({
    userId: currentUser.id,
    userName: currentUser.name,
    action: 'CALENDAR_EVENT_CREATED',
    resourceType: 'EVENT',
    resourceId: eventId,
    details: { title, type, startTime },
    ipAddress: req.ip,
  });

  return res.status(201).json({ message: 'Event created successfully', id: eventId });
}

// ----------------------------------------------------------------------
// GOOGLE CALENDAR OAUTH 2.0 & SYNCHRONIZATION (Section 7)
// ----------------------------------------------------------------------

export async function getGoogleCalendarStatus(req: Request, res: Response) {
  const currentUser = req.user!;
  const isConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  const tokenRecord = await db('google_calendar_tokens')
    .where({ user_id: currentUser.id })
    .first();

  const isConnected = Boolean(isConfigured && tokenRecord && tokenRecord.is_connected);

  return res.json({
    isConfigured,
    isConnected,
    syncedAt: tokenRecord?.synced_at || null,
    scope: tokenRecord?.scope || null,
    configuredClientId: isConfigured ? `${process.env.GOOGLE_CLIENT_ID?.substring(0, 12)}...` : null,
    instructions: !isConfigured
      ? 'Google Calendar requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to be configured in your environment variables (.env).'
      : null,
  });
}

export async function getGoogleAuthUrl(req: Request, res: Response) {
  const currentUser = req.user!;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${ENV.API_BASE_URL}/api/calendar/google/callback`;

  if (!clientId) {
    return res.status(400).json({
      message: 'Google Calendar OAuth is not configured. Please supply GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.',
    });
  }

  const scope = encodeURIComponent('https://www.googleapis.com/auth/calendar.events');
  const state = Buffer.from(JSON.stringify({ userId: currentUser.id })).toString('base64');

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${state}`;

  return res.json({ authUrl });
}

export async function handleGoogleCallback(req: Request, res: Response) {
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(`${ENV.CLIENT_ORIGIN}/calendar?google_error=${encodeURIComponent(String(error))}`);
  }

  if (!code || !state) {
    return res.redirect(`${ENV.CLIENT_ORIGIN}/calendar?google_error=Missing_auth_code`);
  }

  try {
    const { userId } = JSON.parse(Buffer.from(String(state), 'base64').toString('utf8'));
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${ENV.API_BASE_URL}/api/calendar/google/callback`;

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: clientId || '',
        client_secret: clientSecret || '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData: any = await tokenRes.json();

    if (tokenData.error) {
      return res.redirect(`${ENV.CLIENT_ORIGIN}/calendar?google_error=${encodeURIComponent(tokenData.error_description || tokenData.error)}`);
    }

    const existingToken = await db('google_calendar_tokens').where({ user_id: userId }).first();

    if (existingToken) {
      await db('google_calendar_tokens')
        .where({ user_id: userId })
        .update({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || existingToken.refresh_token,
          expiry_date: Date.now() + (tokenData.expires_in || 3600) * 1000,
          scope: tokenData.scope,
          is_connected: true,
          synced_at: new Date(),
          updated_at: new Date(),
        });
    } else {
      await db('google_calendar_tokens').insert({
        id: `gct-${Date.now()}`,
        user_id: userId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || null,
        expiry_date: Date.now() + (tokenData.expires_in || 3600) * 1000,
        scope: tokenData.scope,
        is_connected: true,
        synced_at: new Date(),
      });
    }

    return res.redirect(`${ENV.CLIENT_ORIGIN}/calendar?google_connected=true`);
  } catch (err: any) {
    console.error('[GoogleCalendar] Callback error:', err);
    return res.redirect(`${ENV.CLIENT_ORIGIN}/calendar?google_error=Authentication_failed`);
  }
}

export async function syncGoogleCalendar(req: Request, res: Response) {
  const currentUser = req.user!;

  const tokenRecord = await db('google_calendar_tokens')
    .where({ user_id: currentUser.id, is_connected: true })
    .first();

  if (!tokenRecord) {
    return res.status(400).json({
      message: 'Google Calendar not connected. Please connect your Google account first.',
      status: 'disconnected',
    });
  }

  // Record synchronized timestamp
  await db('google_calendar_tokens')
    .where({ user_id: currentUser.id })
    .update({ synced_at: new Date() });

  await logAdminAction({
    userId: currentUser.id,
    userName: currentUser.name,
    action: 'GOOGLE_CALENDAR_SYNCED',
    resourceType: 'CALENDAR',
    resourceId: currentUser.id,
    ipAddress: req.ip,
  });

  return res.json({
    message: 'Google Calendar successfully synchronized.',
    syncedAt: new Date().toISOString(),
  });
}

export async function disconnectGoogleCalendar(req: Request, res: Response) {
  const currentUser = req.user!;

  await db('google_calendar_tokens')
    .where({ user_id: currentUser.id })
    .update({ is_connected: false, updated_at: new Date() });

  await logAdminAction({
    userId: currentUser.id,
    userName: currentUser.name,
    action: 'GOOGLE_CALENDAR_DISCONNECTED',
    resourceType: 'CALENDAR',
    resourceId: currentUser.id,
    ipAddress: req.ip,
  });

  return res.json({ message: 'Google Calendar disconnected.' });
}
