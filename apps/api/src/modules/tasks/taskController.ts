import type { Request, Response } from 'express';
import { db } from '../../config/database.js';
import { USER_ROLES, TASK_STATUSES, type TaskStatus } from '@command-center/shared';
import { sendSystemNotification } from '../automations/emailService.js';
import { logAdminAction } from '../users/userController.js';

// Helper to determine overdue status dynamically
function computePartStatus(status: TaskStatus, dueDate: Date): TaskStatus {
  if (status === TASK_STATUSES.DONE) return TASK_STATUSES.DONE;
  if (new Date() > new Date(dueDate)) {
    return TASK_STATUSES.OVERDUE;
  }
  return status;
}

export async function getTasks(req: Request, res: Response) {
  const currentUser = req.user!;

  const tasks = await db('tasks as t')
    .leftJoin('users as u', 't.created_by', 'u.id')
    .select(
      't.id',
      't.task_number as taskNumber',
      't.title',
      't.description',
      't.due_date as dueDate',
      't.priority',
      't.status',
      't.created_by as createdBy',
      'u.name as creatorName',
      't.created_at as createdAt'
    )
    .orderBy('t.created_at', 'desc');

  const taskIds = tasks.map((t) => t.id);

  let partsQuery = db('task_parts as tp')
    .whereIn('tp.task_id', taskIds)
    .leftJoin('users as a', 'tp.assigned_intern_id', 'a.id')
    .leftJoin('users as r', 'tp.reviewer_id', 'r.id')
    .select(
      'tp.id',
      'tp.task_id as taskId',
      'tp.part_number as partNumber',
      'tp.total_parts as totalParts',
      'tp.title',
      'tp.assigned_intern_id as assignedInternId',
      'a.name as assignedInternName',
      'a.intern_type as assignedInternType',
      'a.paired_paid_intern_id as assignedInternPairedId',
      'tp.due_date as dueDate',
      'tp.status',
      'tp.reviewer_id as reviewerId',
      'r.name as reviewerName',
      'tp.rating',
      'tp.review_comment as reviewComment',
      'tp.submitted_at as submittedAt',
      'tp.reviewed_at as reviewedAt'
    )
    .orderBy('tp.part_number', 'asc');

  const allParts = await partsQuery;

  // Retrieve uploads for these parts
  const partIds = allParts.map((p) => p.id);
  const uploads = await db('uploads as up')
    .whereIn('up.task_part_id', partIds)
    .leftJoin('users as u', 'up.uploaded_by', 'u.id')
    .select(
      'up.id',
      'up.task_part_id as taskPartId',
      'up.kind',
      'up.url_or_path as urlOrPath',
      'up.file_name as fileName',
      'up.file_size as fileSize',
      'up.mime_type as mimeType',
      'up.uploaded_by as uploadedBy',
      'u.name as uploaderName',
      'up.created_at as createdAt'
    );

  const uploadsByPart: Record<string, any[]> = {};
  for (const up of uploads) {
    if (!uploadsByPart[up.taskPartId]) uploadsByPart[up.taskPartId] = [];
    uploadsByPart[up.taskPartId].push(up);
  }

  // Attach parts to tasks with dynamic status checks
  const tasksWithParts = tasks
    .map((task) => {
      let parts = allParts.filter((p) => p.taskId === task.id);

      parts = parts.map((p) => ({
        ...p,
        status: computePartStatus(p.status as TaskStatus, p.dueDate),
        uploads: uploadsByPart[p.id] || [],
      }));

      // Role Scoping for Unpaid & Core Interns
      if (currentUser.role === USER_ROLES.UNPAID_INTERN) {
        parts = parts.filter((p) => p.assignedInternId === currentUser.id);
      } else if (currentUser.role === USER_ROLES.PAID_INTERN) {
        parts = parts.filter(
          (p) =>
            p.assignedInternId === currentUser.id ||
            p.assignedInternPairedId === currentUser.id
        );
      }

      // Compute overarching task status:
      // "A task is Done only when every part is approved"
      const allOriginalParts = allParts.filter((p) => p.taskId === task.id);
      const isAllDone =
        allOriginalParts.length > 0 &&
        allOriginalParts.every((p) => p.status === TASK_STATUSES.DONE);
      const hasOverdue = allOriginalParts.some(
        (p) => computePartStatus(p.status as TaskStatus, p.dueDate) === TASK_STATUSES.OVERDUE
      );
      const hasInReview = allOriginalParts.some((p) => p.status === TASK_STATUSES.IN_REVIEW);
      const hasInProgress = allOriginalParts.some(
        (p) => p.status === TASK_STATUSES.IN_PROGRESS
      );

      let computedStatus: TaskStatus = task.status as TaskStatus;
      if (isAllDone) computedStatus = TASK_STATUSES.DONE;
      else if (hasOverdue) computedStatus = TASK_STATUSES.OVERDUE;
      else if (hasInReview) computedStatus = TASK_STATUSES.IN_REVIEW;
      else if (hasInProgress) computedStatus = TASK_STATUSES.IN_PROGRESS;

      return {
        ...task,
        status: computedStatus,
        parts,
      };
    })
    .filter((task) => {
      if (currentUser.role === USER_ROLES.UNPAID_INTERN) {
        return task.parts.length > 0;
      }
      return true;
    });

  return res.json(tasksWithParts);
}

export async function createTask(req: Request, res: Response) {
  const currentUser = req.user!;
  const { title, description, dueDate, priority, parts } = req.body;

  const taskId = `task-${Date.now()}`;
  const count = await db('tasks').count('id as count').first();
  const nextNum = 140 + Number(count?.count || 0) + 1;
  const taskNumber = `T-${nextNum}`;

  await db('tasks').insert({
    id: taskId,
    task_number: taskNumber,
    title,
    description: description || null,
    due_date: new Date(dueDate),
    priority,
    status: TASK_STATUSES.TO_DO,
    created_by: currentUser.id,
  });

  const totalParts = parts.length;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const partId = `tp-${Date.now()}-${i}`;
    await db('task_parts').insert({
      id: partId,
      task_id: taskId,
      part_number: i + 1,
      total_parts: totalParts,
      title: p.title,
      assigned_intern_id: p.assignedInternId,
      due_date: new Date(p.dueDate),
      status: TASK_STATUSES.TO_DO,
    });

    // Send real email notification for new task assignment
    const assignee = await db('users').where({ id: p.assignedInternId }).first();
    if (assignee?.email) {
      sendSystemNotification({
        eventType: 'task_assigned',
        recipientEmail: assignee.email,
        recipientName: assignee.name,
        variables: {
          task_title: `${title} (Part ${i + 1}: ${p.title})`,
          task_priority: priority,
          task_deadline: new Date(p.dueDate).toLocaleDateString(),
          assigned_by: currentUser.name,
        },
      }).catch((err) => console.error('[TaskEmail] Error sending assignment email:', err));
    }
  }

  await logAdminAction({
    userId: currentUser.id,
    userName: currentUser.name,
    action: 'TASK_CREATED',
    resourceType: 'TASK',
    resourceId: taskId,
    details: { taskNumber, title, partsCount: totalParts },
    ipAddress: req.ip,
  });

  return res.status(201).json({ message: 'Task created successfully', taskId, taskNumber });
}

export async function uploadPartWork(req: Request, res: Response) {
  const currentUser = req.user!;
  const { partId } = req.params;
  const { kind, gitLink, documentationLink } = req.body;

  let urlOrPath = '';
  let fileName = '';
  let fileSize = 0;
  let mimeType = 'text/plain';

  if (kind === 'git_link') {
    urlOrPath = gitLink;
    fileName = 'Git repository link';
  } else if (kind === 'documentation') {
    urlOrPath = documentationLink;
    fileName = 'Documentation link';
  } else if (req.file) {
    urlOrPath = `/uploads/${req.file.filename}`;
    fileName = req.file.originalname;
    fileSize = req.file.size;
    mimeType = req.file.mimetype;
  }

  const uploadId = `up-${Date.now()}`;
  await db('uploads').insert({
    id: uploadId,
    task_part_id: partId,
    kind,
    url_or_path: urlOrPath,
    file_name: fileName,
    file_size: fileSize,
    mime_type: mimeType,
    uploaded_by: currentUser.id,
  });

  await db('task_parts')
    .where({ id: partId })
    .update({ status: TASK_STATUSES.IN_REVIEW, submitted_at: new Date() });

  return res.status(201).json({ message: 'Deliverable uploaded and submitted for review', uploadId });
}

export async function reviewTaskPart(req: Request, res: Response) {
  const currentUser = req.user!;
  const { partId } = req.params;
  const { action, rating, comment } = req.body;

  const part = await db('task_parts as tp')
    .join('tasks as t', 'tp.task_id', 't.id')
    .where('tp.id', partId)
    .select('tp.*', 't.title as taskTitle')
    .first();

  if (!part) {
    return res.status(404).json({ message: 'Task part not found' });
  }

  const assignee = await db('users').where({ id: part.assigned_intern_id }).first();

  if (action === 'approve') {
    await db('task_parts').where({ id: partId }).update({
      status: TASK_STATUSES.DONE,
      reviewer_id: currentUser.id,
      rating: rating || 5,
      review_comment: comment || null,
      reviewed_at: new Date(),
    });

    // Check if all parts of the parent task are now Done
    const allParts = await db('task_parts').where({ task_id: part.task_id });
    const allDone = allParts.every((p) => p.id === partId || p.status === TASK_STATUSES.DONE);
    if (allDone) {
      await db('tasks').where({ id: part.task_id }).update({ status: TASK_STATUSES.DONE });
    }

    if (assignee?.email) {
      sendSystemNotification({
        eventType: 'work_reviewed',
        recipientEmail: assignee.email,
        recipientName: assignee.name,
        variables: {
          task_title: `${part.taskTitle} (Part ${part.part_number})`,
          submission_status: 'Approved',
          review_comment: comment || 'Work approved and accepted.',
        },
      }).catch((err) => console.error('[ReviewEmail] Error:', err));
    }

    await logAdminAction({
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'TASK_PART_APPROVED',
      resourceType: 'TASK_PART',
      resourceId: partId,
      details: { taskTitle: part.taskTitle, rating: rating || 5 },
      ipAddress: req.ip,
    });

    return res.json({ message: 'Part approved successfully' });
  } else {
    // Sent back -> returns to in_progress
    await db('task_parts').where({ id: partId }).update({
      status: TASK_STATUSES.IN_PROGRESS,
      reviewer_id: currentUser.id,
      review_comment: comment,
      reviewed_at: new Date(),
    });

    if (assignee?.email) {
      sendSystemNotification({
        eventType: 'work_reviewed',
        recipientEmail: assignee.email,
        recipientName: assignee.name,
        variables: {
          task_title: `${part.taskTitle} (Part ${part.part_number})`,
          submission_status: 'Changes Requested / Sent Back',
          review_comment: comment || 'Please review notes and resubmit corrected work.',
        },
      }).catch((err) => console.error('[ReviewEmail] Error:', err));
    }

    await logAdminAction({
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'TASK_PART_CHANGES_REQUESTED',
      resourceType: 'TASK_PART',
      resourceId: partId,
      details: { taskTitle: part.taskTitle, comment },
      ipAddress: req.ip,
    });

    return res.json({ message: 'Part sent back with comments for revision' });
  }
}

export async function reassignTaskPart(req: Request, res: Response) {
  const currentUser = req.user!;
  const { partId } = req.params;
  const { newAssigneeId, reason, newDueDate } = req.body;

  if (!newAssigneeId) {
    return res.status(400).json({ message: 'newAssigneeId is required' });
  }

  const part = await db('task_parts as tp')
    .join('tasks as t', 'tp.task_id', 't.id')
    .where('tp.id', partId)
    .select('tp.*', 't.title as taskTitle', 't.priority as taskPriority')
    .first();

  if (!part) {
    return res.status(404).json({ message: 'Task part not found' });
  }

  const isAuthorized =
    currentUser.role === USER_ROLES.ADMIN ||
    currentUser.role === USER_ROLES.LEAD ||
    currentUser.role === USER_ROLES.PAID_INTERN;

  if (!isAuthorized) {
    return res.status(403).json({ message: 'Unauthorized to reassign task parts' });
  }

  const targetUser = await db('users').where({ id: newAssigneeId, status: 'active' }).first();
  if (!targetUser) {
    return res.status(400).json({ message: 'Target assignee not found or inactive' });
  }

  const previousAssignee = await db('users').where({ id: part.assigned_intern_id }).first();

  const updates: Record<string, any> = {
    assigned_intern_id: newAssigneeId,
  };
  if (newDueDate) {
    updates.due_date = new Date(newDueDate);
  }

  await db('task_parts').where({ id: partId }).update(updates);

  // Trigger reassignment email to new assignee
  if (targetUser.email) {
    sendSystemNotification({
      eventType: 'task_reassigned',
      recipientEmail: targetUser.email,
      recipientName: targetUser.name,
      variables: {
        task_title: `${part.taskTitle} (Part ${part.part_number})`,
        task_priority: part.taskPriority || 'Medium',
        task_deadline: new Date(newDueDate || part.due_date).toLocaleDateString(),
        previous_assignee: previousAssignee?.name || 'Previous Assignee',
      },
    }).catch((err) => console.error('[ReassignEmail] Error:', err));
  }

  await logAdminAction({
    userId: currentUser.id,
    userName: currentUser.name,
    action: 'TASK_PART_REASSIGNED',
    resourceType: 'TASK_PART',
    resourceId: partId,
    details: {
      taskTitle: part.taskTitle,
      previousAssignee: previousAssignee?.name,
      newAssignee: targetUser.name,
      reason: reason || null,
    },
    ipAddress: req.ip,
  });

  return res.json({
    message: `Task part reassigned to ${targetUser.name} successfully`,
    newAssigneeName: targetUser.name,
    reason: reason || null,
  });
}
