import type { Request, Response } from 'express';
import { db } from '../../config/database.js';
import { USER_ROLES } from '@command-center/shared';
import { getCached, setCached } from '../../config/redis.js';

export async function getTrackerMetrics(req: Request, res: Response) {
  const currentUser = req.user!;
  const cacheKey = `dashboard:tracker:${currentUser.id}:${currentUser.role}`;
  const cached = await getCached<any>(cacheKey);
  if (cached) return res.json(cached);

  // Server-side visibility scoping:
  // Admin & Lead: See all interns
  // Core Intern: Sees own metrics and their paired unpaid interns
  // Unpaid Intern: Sees only their own metric
  let internQuery = db('users')
    .whereIn('role', [USER_ROLES.PAID_INTERN, USER_ROLES.UNPAID_INTERN])
    .where({ status: 'active' })
    .select('id', 'name', 'role', 'intern_type', 'current_level', 'paired_paid_intern_id');

  if (currentUser.role === USER_ROLES.UNPAID_INTERN) {
    internQuery = internQuery.where('id', currentUser.id);
  } else if (currentUser.role === USER_ROLES.PAID_INTERN) {
    internQuery = internQuery.where((b) => {
      b.where('id', currentUser.id).orWhere('paired_paid_intern_id', currentUser.id);
    });
  }

  const interns = await internQuery;
  const now = new Date();

  const internMetrics = await Promise.all(
    interns.map(async (intern) => {
      const parts = await db('task_parts').where({ assigned_intern_id: intern.id });
      const doneCount = parts.filter((p) => p.status === 'done').length;
      const overdueCount = parts.filter(
        (p) => p.status === 'overdue' || (p.status !== 'done' && now > new Date(p.due_date))
      ).length;

      const ratedParts = parts.filter((p) => p.rating !== null && p.rating !== undefined);
      const avgRating =
        ratedParts.length > 0
          ? Number(
              (
                ratedParts.reduce((acc, curr) => acc + Number(curr.rating), 0) / ratedParts.length
              ).toFixed(1)
            )
          : null;

      const attendanceRecords = await db('attendance').where({ user_id: intern.id });
      const presentCount = attendanceRecords.filter(
        (a) => a.status === 'present' || a.status === 'late'
      ).length;
      const halfDayCount = attendanceRecords.filter((a) => a.status === 'half_day').length;

      const attRate =
        attendanceRecords.length > 0
          ? Math.round(((presentCount + halfDayCount * 0.5) / attendanceRecords.length) * 100)
          : 0;

      const onTimeRate =
        parts.length > 0
          ? Math.max(0, Math.round(((parts.length - overdueCount) / parts.length) * 100))
          : 100;

      // Fetch uploads summary for this intern
      const internPartIds = parts.map((p) => p.id);
      const uploads = await db('uploads').whereIn('task_part_id', internPartIds);

      return {
        id: intern.id,
        name: intern.name,
        role: intern.role,
        internType: intern.intern_type,
        currentLevel: intern.current_level || 1,
        done: doneCount,
        onTimeRate,
        overdueNow: overdueCount,
        averageRating: avgRating ?? 0,
        attendanceRate: attRate,
        uploadCount: uploads.length,
        uploads: uploads.map((u) => u.file_name || u.kind),
      };
    })
  );

  const totalDone = internMetrics.reduce((acc, curr) => acc + curr.done, 0);
  const totalOverdue = internMetrics.reduce((acc, curr) => acc + curr.overdueNow, 0);
  const avgOnTime =
    internMetrics.length > 0
      ? Math.round(internMetrics.reduce((acc, curr) => acc + curr.onTimeRate, 0) / internMetrics.length)
      : 100;
  const ratedMetrics = internMetrics.filter((m) => m.averageRating > 0);
  const avgRating =
    ratedMetrics.length > 0
      ? Number(
          (
            ratedMetrics.reduce((acc, curr) => acc + curr.averageRating, 0) / ratedMetrics.length
          ).toFixed(1)
        )
      : 5.0;

  // Real 4-week task completion distribution calculated from real rows
  const weeklyCompleted: Array<{ week: string; count: number }> = [];
  for (let w = 3; w >= 0; w--) {
    const start = new Date(now.getTime() - (w + 1) * 7 * 24 * 60 * 60 * 1000);
    const end = new Date(now.getTime() - w * 7 * 24 * 60 * 60 * 1000);

    const weekCountRecord = await db('task_parts')
      .where({ status: 'done' })
      .whereBetween('reviewed_at', [start, end])
      .count('id as count')
      .first();

    weeklyCompleted.push({
      week: `Wk ${4 - w}`,
      count: Number(weekCountRecord?.count || 0),
    });
  }

  // Next candidate awaiting month-end review
  const reviewCandidate =
    internMetrics.find((i) => i.role === USER_ROLES.UNPAID_INTERN) || internMetrics[0] || null;

  const result = {
    summary: {
      tasksDone: totalDone,
      onTimeRate: avgOnTime,
      overdueNow: totalOverdue,
      averageRating: avgRating,
    },
    interns: internMetrics,
    weeklyCompleted,
    currentReview: reviewCandidate
      ? {
          internId: reviewCandidate.id,
          internName: reviewCandidate.name,
          currentLevel: reviewCandidate.currentLevel,
          tasksDone: reviewCandidate.done,
          onTimeRate: reviewCandidate.onTimeRate,
          attendanceRate: reviewCandidate.attendanceRate,
          uploads: reviewCandidate.uploads.slice(0, 3),
        }
      : null,
  };

  await setCached(cacheKey, result, 60);
  return res.json(result);
}

export async function submitLevelReview(req: Request, res: Response) {
  const currentUser = req.user!;
  const { internId, level, decision, notes } = req.body;

  if (currentUser.role !== USER_ROLES.ADMIN && currentUser.role !== USER_ROLES.LEAD) {
    return res.status(403).json({ message: 'Only Admin and Co-Admin can review levels' });
  }

  const intern = await db('users').where({ id: internId }).first();
  if (!intern) {
    return res.status(404).json({ message: 'Intern not found' });
  }

  const reviewId = `rev-${Date.now()}`;
  await db('level_reviews').insert({
    id: reviewId,
    intern_id: internId,
    level_number: level || intern.current_level || 1,
    decision,
    notes: notes || null,
    reviewed_by: currentUser.id,
    created_at: new Date(),
  });

  if (decision === 'pass') {
    const nextLevel = Math.min(15, (intern.current_level || 1) + 1);
    await db('users').where({ id: internId }).update({ current_level: nextLevel });
    return res.json({
      message: `${intern.name} passed Level ${level}! Advanced to Level ${nextLevel}.`,
      nextLevel,
    });
  } else {
    return res.json({
      message: `${intern.name} will repeat Level ${level}.`,
      nextLevel: intern.current_level,
    });
  }
}
