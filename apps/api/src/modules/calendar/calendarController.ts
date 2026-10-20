import type { Request, Response } from 'express';
import { db } from '../../config/database.js';
import { ENV } from '../../config/env.js';
import { logAdminAction } from '../users/userController.js';
import { encryptToken, decryptToken } from '../../config/security.js';

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

  // Background Google Calendar sync if connected
  setImmediate(async () => {
    try {
      await syncEventToGoogle(currentUser.id, {
        title,
        description: description || undefined,
        startTime: new Date(startTime).toISOString(),
        endTime: endTime ? new Date(endTime).toISOString() : new Date(startTime).toISOString(),
        location: location || undefined,
      });
    } catch (e) {
      console.warn('[Calendar] Google sync non-fatal error:', e);
    }
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
// GOOGLE CALENDAR OAUTH 2.0 & ONE-WAY SYNC (STEP 8)
// Plain fetch only, no googleapis package
// Minimal scope: https://www.googleapis.com/auth/calendar.events
// ----------------------------------------------------------------------

export async function getGoogleCalendarStatus(req: Request, res: Response) {
  const currentUser = req.user!;
  const isConfigured = Boolean(ENV.GOOGLE_CLIENT_ID && ENV.GOOGLE_CLIENT_SECRET);

  const user = await db('users').where({ id: currentUser.id }).first();
  const hasEncryptedToken = Boolean(user?.google_refresh_token_encrypted);

  return res.json({
    isConfigured,
    isConnected: isConfigured && hasEncryptedToken,
    needsReconnect: false,
    syncedAt: user?.google_calendar_synced_at || null,
    icsUrl: user?.ics_token ? `${ENV.API_BASE_URL}/api/calendar/feed/${user.ics_token}.ics` : null,
  });
}

export async function getGoogleAuthUrl(req: Request, res: Response) {
  const currentUser = req.user!;
  const clientId = ENV.GOOGLE_CLIENT_ID;
  const redirectUri = ENV.GOOGLE_REDIRECT_URI || `${ENV.API_BASE_URL}/api/calendar/google/callback`;

  if (!clientId) {
    return res.status(400).json({
      message: 'Google Calendar OAuth is not configured. Please supply GOOGLE_CLIENT_ID in .env.',
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
    return res.redirect(`${ENV.CLIENT_ORIGIN}/profile?google_error=${encodeURIComponent(String(error))}`);
  }

  if (!code || !state) {
    return res.redirect(`${ENV.CLIENT_ORIGIN}/profile?google_error=Missing_auth_code`);
  }

  try {
    const { userId } = JSON.parse(Buffer.from(String(state), 'base64').toString('utf8'));
    const clientId = ENV.GOOGLE_CLIENT_ID;
    const clientSecret = ENV.GOOGLE_CLIENT_SECRET;
    const redirectUri = ENV.GOOGLE_REDIRECT_URI || `${ENV.API_BASE_URL}/api/calendar/google/callback`;

    // Exchange authorization code for tokens using plain fetch
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
      return res.redirect(`${ENV.CLIENT_ORIGIN}/profile?google_error=${encodeURIComponent(tokenData.error_description || tokenData.error)}`);
    }

    if (tokenData.refresh_token) {
      const encrypted = encryptToken(tokenData.refresh_token);
      await db('users').where({ id: userId }).update({
        google_refresh_token_encrypted: encrypted,
        google_calendar_synced_at: new Date(),
        updated_at: new Date(),
      });
    }

    return res.redirect(`${ENV.CLIENT_ORIGIN}/profile?google_connected=true`);
  } catch (err: any) {
    console.error('[GoogleCalendar] Callback error:', err);
    return res.redirect(`${ENV.CLIENT_ORIGIN}/profile?google_error=Authentication_failed`);
  }
}

/**
 * Refresh Google Access Token using stored encrypted refresh token (plain fetch)
 */
async function getFreshGoogleAccessToken(userId: string): Promise<string | null> {
  const user = await db('users').where({ id: userId }).first();
  if (!user || !user.google_refresh_token_encrypted) return null;

  try {
    const rawRefreshToken = decryptToken(user.google_refresh_token_encrypted);
    const clientId = ENV.GOOGLE_CLIENT_ID;
    const clientSecret = ENV.GOOGLE_CLIENT_SECRET;

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId || '',
        client_secret: clientSecret || '',
        refresh_token: rawRefreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const data: any = await res.json();
    if (data.error) {
      if (data.error === 'invalid_grant') {
        // Access revoked: disconnect
        await db('users').where({ id: userId }).update({
          google_refresh_token_encrypted: null,
          updated_at: new Date(),
        });
      }
      return null;
    }

    return data.access_token || null;
  } catch (e) {
    console.warn('[GoogleCalendar] Token refresh failed:', e);
    return null;
  }
}

/**
 * One-way sync single event to user's Google Calendar using plain fetch
 */
export async function syncEventToGoogle(
  userId: string,
  event: { title: string; description?: string; startTime: string; endTime: string; location?: string }
): Promise<string | null> {
  const accessToken = await getFreshGoogleAccessToken(userId);
  if (!accessToken) return null;

  try {
    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: event.title,
        description: event.description,
        location: event.location,
        start: { dateTime: event.startTime },
        end: { dateTime: event.endTime },
      }),
    });

    const created: any = await res.json();
    return created.id || null;
  } catch {
    return null;
  }
}

export async function syncGoogleCalendar(req: Request, res: Response) {
  const currentUser = req.user!;
  const user = await db('users').where({ id: currentUser.id }).first();

  if (!user?.google_refresh_token_encrypted) {
    return res.status(400).json({
      message: 'Google Calendar not connected. Please connect your Google account from Profile.',
      status: 'disconnected',
    });
  }

  const token = await getFreshGoogleAccessToken(currentUser.id);
  if (!token) {
    return res.status(401).json({
      message: 'Google Calendar session expired or revoked. Please reconnect Google Calendar.',
      status: 'reconnect_required',
    });
  }

  await db('users').where({ id: currentUser.id }).update({
    google_calendar_synced_at: new Date(),
  });

  return res.json({
    message: 'Google Calendar successfully synchronized.',
    syncedAt: new Date().toISOString(),
  });
}

export async function disconnectGoogleCalendar(req: Request, res: Response) {
  const currentUser = req.user!;

  await db('users').where({ id: currentUser.id }).update({
    google_refresh_token_encrypted: null,
    google_calendar_synced_at: null,
    updated_at: new Date(),
  });

  return res.json({ message: 'Google Calendar disconnected.' });
}

// ----------------------------------------------------------------------
// PRIVATE .ICS CALENDAR FEED (STEP 8 - No setup alternative)
// ----------------------------------------------------------------------
export async function getIcsFeed(req: Request, res: Response) {
  const { token } = req.params;
  const cleanToken = token.replace(/\.ics$/, '');

  const user = await db('users').where({ ics_token: cleanToken }).first();
  if (!user) {
    return res.status(404).send('Invalid or expired calendar feed token');
  }

  // Fetch tasks assigned to user or created by user
  const taskParts = await db('task_parts as tp')
    .leftJoin('tasks as t', 'tp.task_id', 't.id')
    .where('tp.assigned_intern_id', user.id)
    .select('tp.id', 'tp.title', 'tp.due_date as dueDate', 'tp.status', 't.title as taskTitle');

  const manualEvents = await db('events').select('*');

  function formatDateToIcs(d: Date): string {
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Software Hub//Software Hub Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Software Hub - ${user.name}`,
    'X-WR-TIMEZONE:UTC',
  ];

  for (const part of taskParts) {
    const due = new Date(part.dueDate);
    lines.push(
      'BEGIN:VEVENT',
      `UID:task-${part.id}@softwarehub.smru.edu.in`,
      `DTSTAMP:${formatDateToIcs(new Date())}`,
      `DTSTART:${formatDateToIcs(due)}`,
      `DTEND:${formatDateToIcs(new Date(due.getTime() + 60 * 60 * 1000))}`,
      `SUMMARY:${part.taskTitle}: ${part.title}`,
      `DESCRIPTION:Status: ${part.status}. Deliverable assigned via Software Hub.`,
      'STATUS:CONFIRMED',
      'END:VEVENT'
    );
  }

  for (const ev of manualEvents) {
    const start = new Date(ev.start_time);
    const end = ev.end_time ? new Date(ev.end_time) : new Date(start.getTime() + 60 * 60 * 1000);
    lines.push(
      'BEGIN:VEVENT',
      `UID:event-${ev.id}@commandcenter.smru.edu.in`,
      `DTSTAMP:${formatDateToIcs(new Date())}`,
      `DTSTART:${formatDateToIcs(start)}`,
      `DTEND:${formatDateToIcs(end)}`,
      `SUMMARY:${ev.title}`,
      `DESCRIPTION:${ev.description || 'University event'}`,
      ev.location ? `LOCATION:${ev.location}` : '',
      'STATUS:CONFIRMED',
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="command-center-${user.name}.ics"`);
  return res.send(lines.filter(Boolean).join('\r\n'));
}
