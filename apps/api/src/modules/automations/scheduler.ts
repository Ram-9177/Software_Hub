import cron from 'node-cron';
import { db } from '../../config/database.js';
import { getRedisClient } from '../../config/redis.js';
import { sendSystemNotification } from './emailService.js';
import { USER_ROLES } from '@command-center/shared';

/**
 * Acquire Redis distributed lock for a scheduled task.
 * Returns true if lock was acquired, false if another server already has it.
 */
async function acquireRedisLock(lockKey: string, ttlSeconds: number = 300): Promise<boolean> {
  try {
    const redis = getRedisClient();
    const result = await redis.set(lockKey, 'locked', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  } catch (err) {
    console.warn('[Scheduler] Redis lock error, allowing fallback single execution:', err);
    return true;
  }
}

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

// ----------------------------------------------------------------------
// 3. Due Tomorrow: daily 09:00, to the assignee
// ----------------------------------------------------------------------
export async function runDueTomorrowJob(): Promise<number> {
  const todayStr = getTodayString();
  const lockKey = `lock:scheduler:due_tomorrow:${todayStr}`;
  const locked = await acquireRedisLock(lockKey, 300);
  if (!locked) return 0;

  const now = new Date();
  const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
  const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59);

  const parts = await db('task_parts as tp')
    .join('tasks as t', 'tp.task_id', 't.id')
    .join('users as u', 'tp.assigned_intern_id', 'u.id')
    .whereNot('tp.status', 'done')
    .whereBetween('tp.due_date', [tomorrowStart, tomorrowEnd])
    .select(
      'tp.id as partId',
      'tp.title as partTitle',
      'tp.due_date as dueDate',
      't.title as taskTitle',
      'u.id as userId',
      'u.name as userName',
      'u.email as userEmail'
    );

  let sent = 0;
  for (const part of parts) {
    const idempotencyKey = `due_tomorrow:${part.partId}:${todayStr}`;
    await sendSystemNotification({
      ruleKey: 'due_tomorrow',
      recipientEmail: part.userEmail,
      recipientName: part.userName,
      recipientUserId: part.userId,
      idempotencyKey,
      variables: {
        task_title: `${part.taskTitle} — ${part.partTitle}`,
        task_deadline: new Date(part.dueDate).toLocaleDateString(),
      },
    });
    sent++;
  }

  return sent;
}

// ----------------------------------------------------------------------
// 4. Overdue: daily 10:00, to the assignee and the leader
// ----------------------------------------------------------------------
export async function runOverdueJob(): Promise<number> {
  const todayStr = getTodayString();
  const lockKey = `lock:scheduler:overdue:${todayStr}`;
  const locked = await acquireRedisLock(lockKey, 300);
  if (!locked) return 0;

  const now = new Date();
  const overdueParts = await db('task_parts as tp')
    .join('tasks as t', 'tp.task_id', 't.id')
    .join('users as u', 'tp.assigned_intern_id', 'u.id')
    .whereNot('tp.status', 'done')
    .where('tp.due_date', '<', now)
    .select(
      'tp.id as partId',
      'tp.title as partTitle',
      'tp.due_date as dueDate',
      't.title as taskTitle',
      't.created_by as createdBy',
      'u.id as userId',
      'u.name as userName',
      'u.email as userEmail'
    );

  let sent = 0;
  for (const part of overdueParts) {
    // 1. Notify Assignee
    const assigneeKey = `overdue_assignee:${part.partId}:${todayStr}`;
    await sendSystemNotification({
      ruleKey: 'overdue_reminder',
      recipientEmail: part.userEmail,
      recipientName: part.userName,
      recipientUserId: part.userId,
      idempotencyKey: assigneeKey,
      variables: {
        task_title: `${part.taskTitle} — ${part.partTitle}`,
        task_deadline: new Date(part.dueDate).toLocaleDateString(),
      },
    });
    sent++;

    // 2. Notify Leader/Creator
    const leader = await db('users').where({ id: part.createdBy }).first();
    if (leader?.email && leader.email !== part.userEmail) {
      const leaderKey = `overdue_leader:${part.partId}:${todayStr}`;
      await sendSystemNotification({
        ruleKey: 'overdue_reminder',
        recipientEmail: leader.email,
        recipientName: leader.name,
        recipientUserId: leader.id,
        idempotencyKey: leaderKey,
        variables: {
          task_title: `${part.taskTitle} — ${part.partTitle} (Assigned to ${part.userName})`,
          task_deadline: new Date(part.dueDate).toLocaleDateString(),
        },
      });
      sent++;
    }
  }

  return sent;
}

// ----------------------------------------------------------------------
// 7. Not checked in by 10:00: push to intern, a list to the leader
// ----------------------------------------------------------------------
export async function runNotCheckedInJob(): Promise<number> {
  const todayStr = getTodayString();
  const lockKey = `lock:scheduler:not_checked_in:${todayStr}`;
  const locked = await acquireRedisLock(lockKey, 300);
  if (!locked) return 0;

  const activeInterns = await db('users')
    .whereIn('role', [USER_ROLES.PAID_INTERN, USER_ROLES.UNPAID_INTERN])
    .where({ status: 'active' })
    .select('id', 'name', 'email', 'role');

  const todayRecords = await db('attendance')
    .where({ date: todayStr })
    .whereNotNull('check_in_time');

  const checkedInUserIds = new Set(todayRecords.map((r) => r.user_id));
  const missingInterns = activeInterns.filter((i) => !checkedInUserIds.has(i.id));

  let sent = 0;
  // 1. Send reminder to each missing intern
  for (const intern of missingInterns) {
    const key = `not_checked_in:${intern.id}:${todayStr}`;
    await sendSystemNotification({
      ruleKey: 'not_checked_in',
      recipientEmail: intern.email,
      recipientName: intern.name,
      recipientUserId: intern.id,
      idempotencyKey: key,
      variables: {},
    });
    sent++;
  }

  // 2. Send missing check-ins list to leaders and admins
  if (missingInterns.length > 0) {
    const leaders = await db('users')
      .whereIn('role', [USER_ROLES.ADMIN, USER_ROLES.LEAD])
      .where({ status: 'active' });

    const missingNames = missingInterns.map((i) => i.name).join(', ');

    for (const leader of leaders) {
      const leaderKey = `not_checked_in_leader_summary:${leader.id}:${todayStr}`;
      await sendSystemNotification({
        ruleKey: 'not_checked_in',
        recipientEmail: leader.email,
        recipientName: leader.name,
        recipientUserId: leader.id,
        idempotencyKey: leaderKey,
        variables: {
          recipient_name: leader.name,
          missing_interns_list: missingNames,
        },
      });
      sent++;
    }
  }

  return sent;
}

// ----------------------------------------------------------------------
// 8. Month-end level review: 3 days before month end, to leaders and admin
// ----------------------------------------------------------------------
export async function runMonthEndReviewJob(): Promise<number> {
  const now = new Date();
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining = lastDayOfMonth - now.getDate();

  // Trigger when 3 days remain in the month
  if (daysRemaining !== 3) {
    return 0;
  }

  const monthYearStr = `${now.getFullYear()}-${now.getMonth() + 1}`;
  const lockKey = `lock:scheduler:month_end:${monthYearStr}`;
  const locked = await acquireRedisLock(lockKey, 3600);
  if (!locked) return 0;

  const leaders = await db('users')
    .whereIn('role', [USER_ROLES.ADMIN, USER_ROLES.LEAD])
    .where({ status: 'active' });

  let sent = 0;
  for (const leader of leaders) {
    const idempotencyKey = `month_end_notice:${leader.id}:${monthYearStr}`;
    await sendSystemNotification({
      ruleKey: 'month_end_level_review',
      recipientEmail: leader.email,
      recipientName: leader.name,
      recipientUserId: leader.id,
      idempotencyKey,
      variables: {},
    });
    sent++;
  }

  return sent;
}

// ----------------------------------------------------------------------
// 9. Weekly summary: Monday 09:00, to leaders and admin
// ----------------------------------------------------------------------
export async function runWeeklySummaryJob(): Promise<number> {
  const now = new Date();
  const weekYearStr = `${now.getFullYear()}-W${Math.ceil(now.getDate() / 7)}`;
  const lockKey = `lock:scheduler:weekly_summary:${weekYearStr}`;
  const locked = await acquireRedisLock(lockKey, 3600);
  if (!locked) return 0;

  // Calculate real metrics from rows
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const completedParts = await db('task_parts')
    .where({ status: 'done' })
    .where('reviewed_at', '>=', oneWeekAgo);

  const inReviewParts = await db('task_parts').where({ status: 'in_review' });
  const overdueParts = await db('task_parts')
    .whereNot('status', 'done')
    .where('due_date', '<', now);

  const attendances = await db('attendance').where('date', '>=', getTodayString());
  const presentCount = attendances.filter(
    (a) => a.status === 'present' || a.status === 'late' || a.status === 'half_day'
  ).length;
  const avgAtt = attendances.length > 0 ? Math.round((presentCount / attendances.length) * 100) : 100;

  const leaders = await db('users')
    .whereIn('role', [USER_ROLES.ADMIN, USER_ROLES.LEAD])
    .where({ status: 'active' });

  let sent = 0;
  for (const leader of leaders) {
    const idempotencyKey = `weekly_summary:${leader.id}:${weekYearStr}`;
    await sendSystemNotification({
      ruleKey: 'weekly_summary',
      recipientEmail: leader.email,
      recipientName: leader.name,
      recipientUserId: leader.id,
      idempotencyKey,
      variables: {
        completed_count: String(completedParts.length),
        in_review_count: String(inReviewParts.length),
        overdue_count: String(overdueParts.length),
        average_attendance: String(avgAtt),
      },
    });
    sent++;
  }

  return sent;
}

/**
 * Initialize Node cron schedules
 */
export function initScheduler(): void {
  // Rule 3: Due tomorrow - daily 09:00
  cron.schedule('0 9 * * *', async () => {
    try {
      await runDueTomorrowJob();
    } catch (err) {
      console.error('[Scheduler] Error running Due Tomorrow job:', err);
    }
  });

  // Rule 4 & 7: Overdue notice & Not checked in - daily 10:00
  cron.schedule('0 10 * * *', async () => {
    try {
      await runOverdueJob();
      await runNotCheckedInJob();
    } catch (err) {
      console.error('[Scheduler] Error running 10:00 jobs:', err);
    }
  });

  // Rule 8: Month-end level review - daily check at 09:00 (fires 3 days before month end)
  cron.schedule('0 9 25-31 * *', async () => {
    try {
      await runMonthEndReviewJob();
    } catch (err) {
      console.error('[Scheduler] Error running Month End Review job:', err);
    }
  });

  // Rule 9: Weekly summary - Monday 09:00
  cron.schedule('0 9 * * 1', async () => {
    try {
      await runWeeklySummaryJob();
    } catch (err) {
      console.error('[Scheduler] Error running Weekly Summary job:', err);
    }
  });

  console.log('[Scheduler] Email automations cron scheduler initialized.');
}
