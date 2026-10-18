import type { Request, Response } from 'express';
import { db } from '../../config/database.js';
import { ATTENDANCE_STATUSES, USER_ROLES } from '@command-center/shared';
import { logAdminAction } from '../users/userController.js';

function getTodayDateString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

// ----------------------------------------------------------------------
// 1. TODAY'S ATTENDANCE
// ----------------------------------------------------------------------
export async function getTodayAttendance(req: Request, res: Response) {
  const currentUser = req.user!;
  const today = getTodayDateString();
  const isManagement = currentUser.role === USER_ROLES.ADMIN || currentUser.role === USER_ROLES.LEAD;

  if (!isManagement) {
    // Individual intern: strict privacy — sees only own record
    const myRecord = await db('attendance').where({ user_id: currentUser.id, date: today }).first();
    const isPresent = myRecord?.status === ATTENDANCE_STATUSES.PRESENT || myRecord?.status === ATTENDANCE_STATUSES.LATE;

    return res.json({
      date: today,
      stats: {
        in: isPresent ? 1 : 0,
        late: myRecord?.status === ATTENDANCE_STATUSES.LATE ? 1 : 0,
        notYet: isPresent ? 0 : 1,
      },
      records: [
        {
          userId: currentUser.id,
          name: currentUser.name,
          role: currentUser.role,
          internType: currentUser.internType,
          checkInTime: myRecord?.check_in_time || null,
          checkOutTime: myRecord?.check_out_time || null,
          status: myRecord?.status || 'not_yet',
        },
      ],
    });
  }

  // Admin & Co-Admin: Authorized roster visibility
  const allUsers = await db('users').where({ status: 'active' }).select('id', 'name', 'role', 'intern_type');
  const todayRecords = await db('attendance').where({ date: today });
  const recordMap = new Map(todayRecords.map((r) => [r.user_id, r]));

  const summary = allUsers.map((u) => {
    const record = recordMap.get(u.id);
    return {
      userId: u.id,
      name: u.name,
      role: u.role,
      internType: u.intern_type,
      checkInTime: record?.check_in_time || null,
      checkOutTime: record?.check_out_time || null,
      status: record?.status || 'not_yet',
    };
  });

  const inCount = summary.filter((s) => s.status === ATTENDANCE_STATUSES.PRESENT || s.status === ATTENDANCE_STATUSES.LATE).length;
  const lateCount = summary.filter((s) => s.status === ATTENDANCE_STATUSES.LATE).length;
  const notYetCount = summary.filter((s) => s.status === 'not_yet').length;

  return res.json({
    date: today,
    stats: {
      in: inCount,
      late: lateCount,
      notYet: notYetCount,
    },
    records: summary,
  });
}

// ----------------------------------------------------------------------
// 2. ATTENDANCE REGISTER (Calculated from real rows)
// ----------------------------------------------------------------------
export async function getRegister(req: Request, res: Response) {
  const currentUser = req.user!;
  const targetUserId = (req.query.userId as string) || currentUser.id;
  const isManagement = currentUser.role === USER_ROLES.ADMIN || currentUser.role === USER_ROLES.LEAD;

  if (!isManagement && targetUserId !== currentUser.id) {
    return res.status(403).json({
      message: 'Attendance Privacy Notice: You are only authorized to view your own attendance register.',
    });
  }

  const records = await db('attendance')
    .where({ user_id: targetUserId })
    .orderBy('date', 'desc');

  const total = records.length;
  const present = records.filter(
    (r) => r.status === ATTENDANCE_STATUSES.PRESENT || r.status === ATTENDANCE_STATUSES.LATE
  ).length;
  const late = records.filter((r) => r.status === ATTENDANCE_STATUSES.LATE).length;
  const halfDay = records.filter((r) => r.status === ATTENDANCE_STATUSES.HALF_DAY).length;
  const leave = records.filter((r) => r.status === ATTENDANCE_STATUSES.LEAVE).length;

  const attendancePct = total > 0 ? Math.round(((present + halfDay * 0.5) / total) * 100) : 0;

  return res.json({
    userId: targetUserId,
    attendanceThisMonth: attendancePct,
    daysPresent: present,
    lateArrivals: late,
    halfDays: halfDay,
    leaveTaken: leave,
    records,
  });
}

// ----------------------------------------------------------------------
// 3. SIMPLE CHECK-IN (NO Location Tracking)
// ----------------------------------------------------------------------
export async function checkIn(req: Request, res: Response) {
  const currentUser = req.user!;
  const today = getTodayDateString();
  const now = new Date();

  const existing = await db('attendance')
    .where({ user_id: currentUser.id, date: today })
    .first();

  if (existing && existing.check_in_time) {
    return res.status(400).json({ message: 'Already checked in for today' });
  }

  // Calculate status according to admin rules
  const rules = await db('attendance_rules').first();
  const [startHour, startMinute] = (rules?.office_start_time || '09:00').split(':').map(Number);
  const graceMinutes = Number(rules?.grace_minutes ?? 15);
  const [cutoffHour, cutoffMinute] = (rules?.absent_cutoff_time || '11:00').split(':').map(Number);

  const startWithGrace = new Date(now);
  startWithGrace.setHours(startHour, startMinute + graceMinutes, 0, 0);

  const absentCutoff = new Date(now);
  absentCutoff.setHours(cutoffHour, cutoffMinute, 0, 0);

  let status: string = ATTENDANCE_STATUSES.PRESENT;
  if (now > absentCutoff) {
    status = ATTENDANCE_STATUSES.ABSENT;
  } else if (now > startWithGrace) {
    status = ATTENDANCE_STATUSES.LATE;
  }

  const attId = existing?.id || `att-${Date.now()}`;
  const recordPayload = {
    check_in_time: now,
    status,
    updated_at: now,
  };

  if (existing) {
    await db('attendance').where({ id: existing.id }).update(recordPayload);
  } else {
    await db('attendance').insert({
      id: attId,
      user_id: currentUser.id,
      date: today,
      ...recordPayload,
    });
  }

  return res.json({
    message: `Checked in successfully as ${status}.`,
    status,
    checkInTime: now,
  });
}

// ----------------------------------------------------------------------
// 4. SIMPLE CHECK-OUT (NO Location Tracking)
// ----------------------------------------------------------------------
export async function checkOut(req: Request, res: Response) {
  const currentUser = req.user!;
  const today = getTodayDateString();
  const now = new Date();

  const record = await db('attendance')
    .where({ user_id: currentUser.id, date: today })
    .first();

  if (!record || !record.check_in_time) {
    return res.status(400).json({ message: 'Cannot check out without checking in first' });
  }

  const durationHours = (now.getTime() - new Date(record.check_in_time).getTime()) / (1000 * 60 * 60);
  const rules = await db('attendance_rules').first();
  const minHalfDay = Number(rules?.half_day_hours ?? 4.0);

  let status = record.status;
  if (durationHours < minHalfDay && status === ATTENDANCE_STATUSES.PRESENT) {
    status = ATTENDANCE_STATUSES.HALF_DAY;
  }

  await db('attendance').where({ id: record.id }).update({
    check_out_time: now,
    status,
    updated_at: now,
  });

  return res.json({
    message: `Checked out successfully. Shift duration: ${durationHours.toFixed(1)} hours.`,
    status,
    checkOutTime: now,
    durationHours: Number(durationHours.toFixed(1)),
  });
}

// ----------------------------------------------------------------------
// 5. ATTENDANCE RULES (Admin Configurable)
// ----------------------------------------------------------------------
export async function getAttendanceRules(_req: Request, res: Response) {
  let rules = await db('attendance_rules').first();
  if (!rules) {
    const defaultRules = {
      id: 'att-rules-default',
      office_start_time: '09:00',
      grace_minutes: 15,
      half_day_hours: 4.0,
      absent_cutoff_time: '11:00',
      updated_at: new Date(),
    };
    await db('attendance_rules').insert(defaultRules);
    rules = defaultRules;
  }
  return res.json(rules);
}

export async function updateAttendanceRules(req: Request, res: Response) {
  const currentUser = req.user!;

  if (currentUser.role !== USER_ROLES.ADMIN) {
    return res.status(403).json({ message: 'Only Primary Administrators can modify attendance rules.' });
  }

  const { officeStartTime, graceMinutes, halfDayHours, absentCutoffTime } = req.body;

  const updates: Record<string, any> = {
    updated_at: new Date(),
  };

  if (officeStartTime !== undefined) updates.office_start_time = officeStartTime;
  if (graceMinutes !== undefined) updates.grace_minutes = Number(graceMinutes);
  if (halfDayHours !== undefined) updates.half_day_hours = Number(halfDayHours);
  if (absentCutoffTime !== undefined) updates.absent_cutoff_time = absentCutoffTime;

  const existing = await db('attendance_rules').first();
  if (existing) {
    await db('attendance_rules').where({ id: existing.id }).update(updates);
  } else {
    await db('attendance_rules').insert({
      id: 'att-rules-default',
      office_start_time: '09:00',
      grace_minutes: 15,
      half_day_hours: 4.0,
      absent_cutoff_time: '11:00',
      ...updates,
    });
  }

  await logAdminAction({
    userId: currentUser.id,
    userName: currentUser.name,
    action: 'ATTENDANCE_RULES_UPDATED',
    resourceType: 'ATTENDANCE_RULES',
    details: updates,
    ipAddress: req.ip,
  });

  return res.json({ message: 'Attendance rules updated successfully', rules: updates });
}

// ----------------------------------------------------------------------
// 6. LEAVE REQUESTS & REVIEWS
// ----------------------------------------------------------------------
export async function requestLeave(req: Request, res: Response) {
  const currentUser = req.user!;
  const { startDate, endDate, reason, leaveCategory = 'full_day', partialDuration } = req.body;

  if (!startDate || !endDate || !reason) {
    return res.status(400).json({ message: 'Start date, end date, and reason are required.' });
  }

  const leaveId = `leave-${Date.now()}`;
  await db('leave_requests').insert({
    id: leaveId,
    user_id: currentUser.id,
    start_date: startDate,
    end_date: endDate,
    reason,
    leave_category: leaveCategory,
    partial_day_duration: partialDuration || null,
    status: 'pending',
    created_at: new Date(),
    updated_at: new Date(),
  });

  return res.status(201).json({ message: 'Leave request submitted successfully', id: leaveId });
}

export async function getLeaveRequests(req: Request, res: Response) {
  const currentUser = req.user!;
  const isManagement = currentUser.role === USER_ROLES.ADMIN || currentUser.role === USER_ROLES.LEAD;

  let query = db('leave_requests as lr')
    .join('users as u', 'lr.user_id', 'u.id')
    .select(
      'lr.id',
      'lr.user_id as userId',
      'u.name as userName',
      'u.role as userRole',
      'lr.start_date as startDate',
      'lr.end_date as endDate',
      'lr.reason',
      'lr.leave_category as leaveCategory',
      'lr.partial_day_duration as partialDayDuration',
      'lr.status',
      'lr.created_at as createdAt'
    )
    .orderBy('lr.created_at', 'desc');

  if (!isManagement) {
    query = query.where('lr.user_id', currentUser.id);
  }

  const leaves = await query;
  return res.json(leaves);
}

export async function reviewLeaveRequest(req: Request, res: Response) {
  const currentUser = req.user!;
  const { id } = req.params;
  const { action, comment } = req.body;

  if (currentUser.role !== USER_ROLES.ADMIN && currentUser.role !== USER_ROLES.LEAD) {
    return res.status(403).json({ message: 'Only Admin and Co-Admin can review leave requests.' });
  }

  const status = action === 'approve' ? 'approved' : 'rejected';
  await db('leave_requests').where({ id }).update({
    status,
    reviewed_by: currentUser.id,
    review_comment: comment || null,
    reviewed_at: new Date(),
    updated_at: new Date(),
  });

  return res.json({ message: `Leave request ${status} successfully` });
}
