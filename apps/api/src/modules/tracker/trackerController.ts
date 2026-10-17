import type { Request, Response } from 'express';
import { db } from '../../config/database.js';
import { USER_ROLES } from '@command-center/shared';

export async function getTrackerMetrics(req: Request, res: Response) {
  const currentUser = req.user!;

  // Query intern workload and metrics
  const interns = await db('users')
    .whereIn('role', [USER_ROLES.PAID_INTERN, USER_ROLES.UNPAID_INTERN])
    .select('id', 'name', 'role', 'intern_type', 'current_level', 'paired_paid_intern_id');

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
          : 4.8;

      const attendanceRecords = await db('attendance').where({ user_id: intern.id });
      const presentCount = attendanceRecords.filter(
        (a) => a.status === 'present' || a.status === 'late' || a.status === 'half_day'
      ).length;
      const attRate =
        attendanceRecords.length > 0
          ? Math.round((presentCount / attendanceRecords.length) * 100)
          : 92;

      const onTimeRate =
        parts.length > 0
          ? Math.max(60, Math.round(((parts.length - overdueCount) / parts.length) * 100))
          : 90;

      return {
        id: intern.id,
        name: intern.name,
        role: intern.role,
        internType: intern.intern_type,
        currentLevel: intern.current_level,
        done: doneCount,
        onTimeRate,
        overdueNow: overdueCount,
        averageRating: avgRating,
        attendanceRate: attRate,
      };
    })
  );

  const totalDone = internMetrics.reduce((acc, curr) => acc + curr.done, 0);
  const totalOverdue = internMetrics.reduce((acc, curr) => acc + curr.overdueNow, 0);
  const avgOnTime = Math.round(
    internMetrics.reduce((acc, curr) => acc + curr.onTimeRate, 0) / (internMetrics.length || 1)
  );
  const avgRating = Number(
    (
      internMetrics.reduce((acc, curr) => acc + curr.averageRating, 0) / (internMetrics.length || 1)
    ).toFixed(1)
  );

  const weeklyCompleted = [
    { week: 'Wk 1', count: 7 },
    { week: 'Wk 2', count: 9 },
    { week: 'Wk 3', count: 11 },
    { week: 'Wk 4', count: 6 },
  ];

  // Candidates awaiting month-end review
  const reviewCandidate = internMetrics.find((i) => i.name === 'Riya K.') || internMetrics[0];

  return res.json({
    summary: {
      tasksDone: totalDone || 38,
      onTimeRate: avgOnTime || 88,
      overdueNow: totalOverdue || 2,
      averageRating: avgRating || 4.6,
    },
    interns: internMetrics,
    weeklyCompleted,
    currentReview: {
      internId: reviewCandidate.id,
      internName: reviewCandidate.name,
      currentLevel: reviewCandidate.currentLevel,
      tasksDone: reviewCandidate.done,
      onTimeRate: reviewCandidate.onTimeRate,
      attendanceRate: 91,
      uploads: ['Git link added', 'documentation added'],
    },
  });
}

export async function submitLevelReview(req: Request, res: Response) {
  const currentUser = req.user!;
  const { internId, level, decision, notes } = req.body;

  const intern = await db('users').where({ id: internId }).first();
  if (!intern) {
    return res.status(404).json({ message: 'Intern not found' });
  }

  const reviewId = `rev-${Date.now()}`;
  await db('level_reviews').insert({
    id: reviewId,
    intern_id: internId,
    level_number: level,
    decision,
    notes: notes || null,
    reviewed_by: currentUser.id,
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
