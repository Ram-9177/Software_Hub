import type { Request, Response } from 'express';
import { db } from '../../config/database.js';
import { USER_ROLES, TASK_STATUSES, type TaskStatus } from '@command-center/shared';
import { sendSystemNotification } from '../automations/emailService.js';
import { logAdminAction } from '../users/userController.js';

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

  const allParts = await db('task_parts as tp')
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

  // Get user's team memberships if Core Intern
  let myTeamMemberIds: string[] = [];
  if (currentUser.role === USER_ROLES.PAID_INTERN) {
    const myTeamIds = await db('team_members').where({ user_id: currentUser.id }).pluck('team_id');
    myTeamMemberIds = await db('team_members').whereIn('team_id', myTeamIds).pluck('user_id');
  }

  // Scope filtering & status computation
  const tasksWithParts = tasks
    .map((task) => {
      const originalParts = allParts.filter((p) => p.taskId === task.id);

      // Compute overarching task status from all original parts:
      // "A task is Done only when every part is approved"
      const isAllDone =
        originalParts.length > 0 &&
        originalParts.every((p) => p.status === TASK_STATUSES.DONE);
      const hasOverdue = originalParts.some(
        (p) => computePartStatus(p.status as TaskStatus, p.dueDate) === TASK_STATUSES.OVERDUE
      );
      const hasInReview = originalParts.some((p) => p.status === TASK_STATUSES.IN_REVIEW);
      const hasInProgress = originalParts.some((p) => p.status === TASK_STATUSES.IN_PROGRESS);

      let computedStatus: TaskStatus = task.status as TaskStatus;
      if (isAllDone) computedStatus = TASK_STATUSES.DONE;
      else if (hasOverdue) computedStatus = TASK_STATUSES.OVERDUE;
      else if (hasInReview) computedStatus = TASK_STATUSES.IN_REVIEW;
      else if (hasInProgress) computedStatus = TASK_STATUSES.IN_PROGRESS;

      // Filter visible parts by role
      let visibleParts = originalParts.map((p) => ({
        ...p,
        status: computePartStatus(p.status as TaskStatus, p.dueDate),
        uploads: uploadsByPart[p.id] || [],
      }));

      if (currentUser.role === USER_ROLES.UNPAID_INTERN) {
        // Unpaid intern: sees only their own assigned parts
        visibleParts = visibleParts.filter((p) => p.assignedInternId === currentUser.id);
      } else if (currentUser.role === USER_ROLES.PAID_INTERN) {
        // Core intern: views their own work, their team's work, and their unpaid interns' work
        visibleParts = visibleParts.filter(
          (p) =>
            p.assignedInternId === currentUser.id ||
            p.assignedInternPairedId === currentUser.id ||
            myTeamMemberIds.includes(p.assignedInternId) ||
            task.createdBy === currentUser.id
        );
      }

      return {
        ...task,
        status: computedStatus,
        parts: visibleParts,
      };
    })
    .filter((task) => {
      // If intern, only show tasks that have at least one visible part for them
      if (
        currentUser.role === USER_ROLES.UNPAID_INTERN ||
        currentUser.role === USER_ROLES.PAID_INTERN
      ) {
        return task.parts.length > 0 || task.createdBy === currentUser.id;
      }
      return true;
    });

  return res.json(tasksWithParts);
}

export async function createTask(req: Request, res: Response) {
  const currentUser = req.user!;
  const { title, description, dueDate, priority = 'medium', parts } = req.body;

  if (!title || !dueDate || !parts || !Array.isArray(parts) || parts.length === 0) {
    return res.status(400).json({ message: 'Task title, deadline, and at least one part are required.' });
  }

  // Core intern permissions check: can assign to themselves, team members, or their paired unpaid interns
  if (currentUser.role === USER_ROLES.PAID_INTERN) {
    const pairedInternIds = await db('users')
      .where({ paired_paid_intern_id: currentUser.id })
      .pluck('id');
    const myTeamIds = await db('team_members').where({ user_id: currentUser.id }).pluck('team_id');
    const teamUserIds = await db('team_members').whereIn('team_id', myTeamIds).pluck('user_id');
    const allowedAssignees = new Set([currentUser.id, ...pairedInternIds, ...teamUserIds]);

    for (const p of parts) {
      if (!allowedAssignees.has(p.assignedInternId)) {
        return res.status(403).json({
          message: 'Core interns may only assign task parts to themselves, their team members, or their paired unpaid interns.',
        });
      }
    }
  }

  const taskId = `task-${Date.now()}`;
  const countRecord = await db('tasks').count('id as count').first();
  const nextNum = Number(countRecord?.count || 0) + 1;
  const taskNumber = `TASK-${String(nextNum).padStart(3, '0')}`;

  await db('tasks').insert({
    id: taskId,
    task_number: taskNumber,
    title,
    description: description || null,
    due_date: new Date(dueDate),
    priority,
    status: TASK_STATUSES.TO_DO,
    created_by: currentUser.id,
    created_at: new Date(),
    updated_at: new Date(),
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
      reviewer_id: p.reviewerId || (currentUser.role !== USER_ROLES.UNPAID_INTERN ? currentUser.id : null),
      due_date: new Date(p.dueDate || dueDate),
      status: TASK_STATUSES.TO_DO,
    });

    // 2. New Task or Part Assigned Email Automation: immediately to the assignee
    const assignee = await db('users').where({ id: p.assignedInternId }).first();
    if (assignee?.email) {
      sendSystemNotification({
        ruleKey: 'new_task_assigned',
        recipientEmail: assignee.email,
        recipientName: assignee.name,
        recipientUserId: assignee.id,
        idempotencyKey: `task_assigned:${partId}`,
        variables: {
          task_title: `${title} (Part ${i + 1}: ${p.title})`,
          task_priority: priority,
          task_deadline: new Date(p.dueDate || dueDate).toLocaleDateString(),
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

  const part = await db('task_parts as tp')
    .join('tasks as t', 'tp.task_id', 't.id')
    .where('tp.id', partId)
    .select('tp.*', 't.title as taskTitle', 't.created_by as taskCreatedBy')
    .first();

  if (!part) {
    return res.status(404).json({ message: 'Task part not found' });
  }

  // Server-side check: caller must be the assigned intern (or admin/lead)
  const isAssignee = part.assigned_intern_id === currentUser.id;
  const isManagement =
    currentUser.role === USER_ROLES.ADMIN || currentUser.role === USER_ROLES.LEAD;

  if (!isAssignee && !isManagement) {
    return res.status(403).json({
      message: 'Permission denied: You can only upload proof of work for task parts assigned to you.',
    });
  }

  let urlOrPath = '';
  let fileName = '';
  let fileSize = 0;
  let mimeType = 'text/plain';

  if (kind === 'git_link') {
    if (!gitLink) return res.status(400).json({ message: 'Git link URL is required.' });
    urlOrPath = gitLink;
    fileName = 'Git repository link';
  } else if (kind === 'documentation') {
    if (!documentationLink) return res.status(400).json({ message: 'Documentation link is required.' });
    urlOrPath = documentationLink;
    fileName = 'Documentation link';
  } else if (req.file) {
    urlOrPath = `/uploads/${req.file.filename}`;
    fileName = req.file.originalname;
    fileSize = req.file.size;
    mimeType = req.file.mimetype;
  } else {
    return res.status(400).json({ message: 'A file, Git link, or documentation link is required.' });
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

  // 5. Work Submitted Email Automation: immediately to the reviewer
  // Find designated reviewer or paired core mentor or task creator
  let reviewer = null;
  if (part.reviewer_id) {
    reviewer = await db('users').where({ id: part.reviewer_id }).first();
  }
  if (!reviewer) {
    // Check if uploader is an unpaid intern paired to a core mentor
    const uploader = await db('users').where({ id: currentUser.id }).first();
    if (uploader?.paired_paid_intern_id) {
      reviewer = await db('users').where({ id: uploader.paired_paid_intern_id }).first();
    }
  }
  if (!reviewer) {
    reviewer = await db('users').where({ id: part.taskCreatedBy }).first();
  }

  if (reviewer?.email) {
    sendSystemNotification({
      ruleKey: 'work_submitted',
      recipientEmail: reviewer.email,
      recipientName: reviewer.name,
      recipientUserId: reviewer.id,
      idempotencyKey: `work_submitted:${uploadId}`,
      variables: {
        reviewer_name: reviewer.name,
        intern_name: currentUser.name,
        task_title: `${part.taskTitle} (Part ${part.part_number})`,
        submission_type: fileName || kind,
      },
    }).catch((err) => console.error('[WorkSubmittedEmail] Error:', err));
  }

  return res.status(201).json({ message: 'Deliverable uploaded and submitted for review', uploadId });
}

export async function reviewTaskPart(req: Request, res: Response) {
  const currentUser = req.user!;
  const { partId } = req.params;
  const { action, rating, comment } = req.body;

  // Role authorization: Unpaid intern cannot review
  if (currentUser.role === USER_ROLES.UNPAID_INTERN) {
    return res.status(403).json({ message: 'Unpaid interns are not authorized to review deliverables.' });
  }

  const part = await db('task_parts as tp')
    .join('tasks as t', 'tp.task_id', 't.id')
    .where('tp.id', partId)
    .select('tp.*', 't.title as taskTitle', 't.created_by as taskCreatedBy')
    .first();

  if (!part) {
    return res.status(404).json({ message: 'Task part not found' });
  }

  // If Core Intern, verify reviewer rights (must be assigned reviewer, mentor of assignee, or task creator)
  if (currentUser.role === USER_ROLES.PAID_INTERN) {
    const assignee = await db('users').where({ id: part.assigned_intern_id }).first();
    const isMentor = assignee?.paired_paid_intern_id === currentUser.id;
    const isTaskCreator = part.taskCreatedBy === currentUser.id;
    const isDesignatedReviewer = part.reviewer_id === currentUser.id;

    if (!isMentor && !isTaskCreator && !isDesignatedReviewer) {
      return res.status(403).json({
        message: 'Core interns may only review work from their paired unpaid interns or tasks they created.',
      });
    }
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

    // Check if every part of the parent task is now Done
    const allParts = await db('task_parts').where({ task_id: part.task_id });
    const allDone = allParts.every((p) => p.id === partId || p.status === TASK_STATUSES.DONE);
    if (allDone) {
      await db('tasks').where({ id: part.task_id }).update({ status: TASK_STATUSES.DONE });
    }

    // 6. Reviewed or Sent Back Email Automation: immediately to the assignee
    if (assignee?.email) {
      sendSystemNotification({
        ruleKey: 'reviewed_or_sent_back',
        recipientEmail: assignee.email,
        recipientName: assignee.name,
        recipientUserId: assignee.id,
        idempotencyKey: `reviewed_approved:${partId}:${Date.now()}`,
        variables: {
          task_title: `${part.taskTitle} (Part ${part.part_number})`,
          submission_status: 'Approved',
          review_comment: comment || 'Work approved and accepted.',
        },
      }).catch((err) => console.error('[ReviewEmail] Error:', err));
    }

    return res.json({ message: 'Part approved successfully' });
  } else {
    // Sent back -> status returns to in_progress
    await db('task_parts').where({ id: partId }).update({
      status: TASK_STATUSES.IN_PROGRESS,
      reviewer_id: currentUser.id,
      review_comment: comment || 'Revision requested',
      reviewed_at: new Date(),
    });

    // 6. Reviewed or Sent Back Email Automation: immediately to the assignee
    if (assignee?.email) {
      sendSystemNotification({
        ruleKey: 'reviewed_or_sent_back',
        recipientEmail: assignee.email,
        recipientName: assignee.name,
        recipientUserId: assignee.id,
        idempotencyKey: `reviewed_rejected:${partId}:${Date.now()}`,
        variables: {
          task_title: `${part.taskTitle} (Part ${part.part_number})`,
          submission_status: 'Changes Requested / Sent Back',
          review_comment: comment || 'Please review feedback and resubmit your proof of work.',
        },
      }).catch((err) => console.error('[ReviewEmail] Error:', err));
    }

    return res.json({ message: 'Part sent back with feedback for revision' });
  }
}

export async function reassignTaskPart(req: Request, res: Response) {
  const currentUser = req.user!;
  const { partId } = req.params;
  const { newAssigneeId, newDueDate } = req.body;

  if (!newAssigneeId) {
    return res.status(400).json({ message: 'newAssigneeId is required' });
  }

  const newAssignee = await db('users').where({ id: newAssigneeId }).first();
  if (!newAssignee) {
    return res.status(404).json({ message: 'New assignee not found' });
  }

  const updates: Record<string, any> = {
    assigned_intern_id: newAssigneeId,
  };
  if (newDueDate) updates.due_date = new Date(newDueDate);

  await db('task_parts').where({ id: partId }).update(updates);

  // Notify new assignee via Rule 2
  sendSystemNotification({
    ruleKey: 'new_task_assigned',
    recipientEmail: newAssignee.email,
    recipientName: newAssignee.name,
    recipientUserId: newAssignee.id,
    variables: {
      task_title: `Reassigned Task Part`,
      task_priority: 'medium',
      task_deadline: newDueDate ? new Date(newDueDate).toLocaleDateString() : 'As scheduled',
      assigned_by: currentUser.name,
    },
  }).catch(() => {});

  return res.json({
    message: `Task part successfully reassigned to ${newAssignee.name}`,
  });
}
