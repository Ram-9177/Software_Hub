import type { Request, Response } from 'express';
import { db } from '../../config/database.js';
import { USER_ROLES } from '@command-center/shared';

export async function getNotifications(req: Request, res: Response) {
  const currentUser = req.user!;

  const notifications = await db('notifications')
    .where({ user_id: currentUser.id })
    .orderBy('created_at', 'desc')
    .limit(50);

  const unreadCount = await db('notifications')
    .where({ user_id: currentUser.id, is_read: false })
    .count('id as count')
    .first();

  return res.json({
    unreadCount: Number(unreadCount?.count || 0),
    notifications,
  });
}

export async function markNotificationAsRead(req: Request, res: Response) {
  const currentUser = req.user!;
  const { id } = req.params;

  if (id === 'all') {
    await db('notifications')
      .where({ user_id: currentUser.id })
      .update({ is_read: true });
    return res.json({ message: 'All notifications marked as read' });
  }

  await db('notifications')
    .where({ id, user_id: currentUser.id })
    .update({ is_read: true });

  return res.json({ message: 'Notification marked as read' });
}

export async function getApprovalInbox(req: Request, res: Response) {
  const currentUser = req.user!;

  if (currentUser.role !== USER_ROLES.ADMIN && currentUser.role !== USER_ROLES.LEAD) {
    return res.status(403).json({ message: 'Only Admin and Co-Admin can access the Central Approval Inbox' });
  }

  // 1. Pending Leave Requests
  const pendingLeaves = await db('leave_requests as lr')
    .join('users as u', 'lr.user_id', 'u.id')
    .where({ 'lr.status': 'pending' })
    .select(
      'lr.id',
      'lr.user_id as userId',
      'u.name as applicantName',
      'u.role as applicantRole',
      'lr.leave_category as leaveCategory',
      'lr.start_date as startDate',
      'lr.end_date as endDate',
      'lr.reason',
      'lr.created_at as submittedAt'
    )
    .orderBy('lr.created_at', 'desc');

  // 2. Pending Task Parts in Review
  const pendingTasks = await db('task_parts as tp')
    .join('tasks as t', 'tp.task_id', 't.id')
    .join('users as u', 'tp.assigned_intern_id', 'u.id')
    .where({ 'tp.status': 'in_review' })
    .select(
      'tp.id as partId',
      't.id as taskId',
      't.task_number as taskNumber',
      't.title as taskTitle',
      'tp.title as partTitle',
      'u.name as internName',
      'tp.submitted_at as submittedAt'
    )
    .orderBy('tp.submitted_at', 'desc');

  // 3. Eligible Level Review Candidates (Interns ready for review)
  const eligibleInterns = await db('users')
    .whereIn('role', [USER_ROLES.PAID_INTERN, USER_ROLES.UNPAID_INTERN])
    .where({ status: 'active' })
    .select('id', 'name', 'role', 'intern_type as internType', 'current_level as currentLevel', 'marksheet_percentage as marksheetPercentage', 'marksheet_confirmed as marksheetConfirmed');

  return res.json({
    summary: {
      pendingLeavesCount: pendingLeaves.length,
      pendingTasksCount: pendingTasks.length,
      eligibleInternsCount: eligibleInterns.length,
      totalPending: pendingLeaves.length + pendingTasks.length,
    },
    leaves: pendingLeaves,
    tasks: pendingTasks,
    interns: eligibleInterns,
  });
}

export async function createNotification(params: {
  userId: string;
  title: string;
  message: string;
  type: string;
  resourceType?: string;
  resourceId?: string;
  actionUrl?: string;
}) {
  try {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    await db('notifications').insert({
      id,
      user_id: params.userId,
      title: params.title,
      message: params.message,
      type: params.type,
      resource_type: params.resourceType || null,
      resource_id: params.resourceId || null,
      action_url: params.actionUrl || null,
      is_read: false,
      created_at: new Date(),
    });
    return id;
  } catch (err) {
    console.error('[Notification] Failed to insert notification:', err);
    return null;
  }
}
