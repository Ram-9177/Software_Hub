import type { Request, Response } from 'express';
import { db } from '../../config/database.js';
import { ATTENDANCE_STATUSES, USER_ROLES } from '@command-center/shared';
import { createNotification } from '../notifications/notificationsController.js';
import { sendSystemNotification } from '../automations/emailService.js';
import { logAdminAction } from '../users/userController.js';

// Campus Geofence Configuration (St. Mary's Rehabilitation University)
const CAMPUS_CONFIG = {
  name: "St. Mary's Rehabilitation University Main Campus",
  latitude: 17.4483,
  longitude: 78.3915,
  radiusMeters: 800, // 800 meter authorized radius
};

function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getTodayDateString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

// ----------------------------------------------------------------------
// 1. TODAY'S ATTENDANCE (Strict Privacy Enforced)
// ----------------------------------------------------------------------
export async function getTodayAttendance(req: Request, res: Response) {
  const currentUser = req.user!;
  const today = getTodayDateString();
  const isManagement = currentUser.role === USER_ROLES.ADMIN || currentUser.role === USER_ROLES.LEAD;

  if (!isManagement) {
    // Individual member/intern: STRICT PRIVACY — Return only own record
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
          withinCampus: myRecord?.within_campus_boundary ?? null,
        },
      ],
    });
  }

  // Admin & Co-Admin: Full authorized roster visibility
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
      withinCampus: record?.within_campus_boundary ?? null,
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
// 2. ATTENDANCE REGISTER (Strict Privacy Enforced)
// ----------------------------------------------------------------------
export async function getRegister(req: Request, res: Response) {
  const currentUser = req.user!;
  const targetUserId = (req.query.userId as string) || currentUser.id;
  const isManagement = currentUser.role === USER_ROLES.ADMIN || currentUser.role === USER_ROLES.LEAD;

  // Strict backend check: Non-management users can NEVER view others' register
  if (!isManagement && targetUserId !== currentUser.id) {
    return res.status(403).json({
      message: 'Attendance Privacy Notice: You are only authorized to view your own attendance register.',
    });
  }

  const records = await db('attendance')
    .where({ user_id: targetUserId })
    .orderBy('date', 'asc');

  const total = records.length;
  const present = records.filter(
    (r) => r.status === ATTENDANCE_STATUSES.PRESENT || r.status === ATTENDANCE_STATUSES.LATE
  ).length;
  const late = records.filter((r) => r.status === ATTENDANCE_STATUSES.LATE).length;
  const leave = records.filter((r) => r.status === ATTENDANCE_STATUSES.LEAVE).length;

  const attendancePct = total > 0 ? Math.round((present / total) * 100) : 95;

  return res.json({
    userId: targetUserId,
    attendanceThisMonth: attendancePct,
    daysPresent: present,
    lateArrivals: late,
    leaveTaken: leave,
    records,
  });
}

// ----------------------------------------------------------------------
// 3. LOCATION-BASED CHECK-IN
// ----------------------------------------------------------------------
export async function checkIn(req: Request, res: Response) {
  const currentUser = req.user!;
  const today = getTodayDateString();
  const now = new Date();
  const { latitude, longitude, accuracy } = req.body;

  const existing = await db('attendance')
    .where({ user_id: currentUser.id, date: today })
    .first();

  if (existing && existing.check_in_time) {
    return res.status(400).json({ message: 'Already checked in for today' });
  }

  // Geofence Validation
  let withinCampus: boolean | null = null;
  if (typeof latitude === 'number' && typeof longitude === 'number') {
    const distance = calculateDistanceMeters(
      latitude,
      longitude,
      CAMPUS_CONFIG.latitude,
      CAMPUS_CONFIG.longitude
    );
    withinCampus = distance <= CAMPUS_CONFIG.radiusMeters;
  }

  // Check against attendance rules
  const rules = await db('attendance_rules').first();
  const [startHour, startMinute] = (rules?.office_start_time || '09:00').split(':').map(Number);
  const graceMinutes = rules?.grace_minutes || 15;
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
    latitude: latitude ?? null,
    longitude: longitude ?? null,
    location_accuracy: accuracy ?? null,
    within_campus_boundary: withinCampus,
    check_in_ip: req.ip || null,
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

  const locationMsg =
    withinCampus === true
      ? 'Verified on University Campus'
      : withinCampus === false
      ? 'Recorded (Off-Campus location noted)'
      : 'Recorded (Location permission not granted)';

  return res.json({
    message: `Checked in successfully as ${status}. ${locationMsg}.`,
    status,
    checkInTime: now,
    withinCampus,
  });
}

// ----------------------------------------------------------------------
// 4. LOCATION-BASED CHECK-OUT
// ----------------------------------------------------------------------
export async function checkOut(req: Request, res: Response) {
  const currentUser = req.user!;
  const today = getTodayDateString();
  const now = new Date();
  const { latitude, longitude, accuracy } = req.body;

  const record = await db('attendance')
    .where({ user_id: currentUser.id, date: today })
    .first();

  if (!record || !record.check_in_time) {
    return res.status(400).json({ message: 'Cannot check out without checking in first' });
  }

  const durationHours = (now.getTime() - new Date(record.check_in_time).getTime()) / (1000 * 60 * 60);
  const rules = await db('attendance_rules').first();
  const minHalfDay = rules?.half_day_hours || 4.0;

  let status = record.status;
  if (durationHours < minHalfDay && status === ATTENDANCE_STATUSES.PRESENT) {
    status = ATTENDANCE_STATUSES.HALF_DAY;
  }

  await db('attendance').where({ id: record.id }).update({
    check_out_time: now,
    status,
    check_out_ip: req.ip || null,
    updated_at: now,
  });

  return res.json({
    message: `Checked out successfully. Total worked: ${durationHours.toFixed(1)} hrs.`,
    status,
    checkOutTime: now,
    durationHours: Number(durationHours.toFixed(1)),
  });
}

export async function getAttendanceRules(_req: Request, res: Response) {
  const rules = await db('attendance_rules').first();
  return res.json({
    ...rules,
    campusGeofence: CAMPUS_CONFIG,
  });
}

export async function updateAttendanceRules(req: Request, res: Response) {
  const currentUser = req.user!;
  if (currentUser.role !== USER_ROLES.ADMIN && currentUser.role !== USER_ROLES.LEAD) {
    return res.status(403).json({ message: 'Only Admin and Co-Admin can modify attendance rules' });
  }

  const { officeStartTime, graceMinutes, halfDayHours, absentCutoffTime } = req.body;

  await db('attendance_rules').update({
    office_start_time: officeStartTime,
    grace_minutes: graceMinutes,
    half_day_hours: halfDayHours,
    absent_cutoff_time: absentCutoffTime,
    updated_at: new Date(),
  });

  await logAdminAction({
    userId: currentUser.id,
    userName: currentUser.name,
    action: 'ATTENDANCE_RULES_UPDATED',
    resourceType: 'ATTENDANCE',
    details: { officeStartTime, graceMinutes, halfDayHours, absentCutoffTime },
    ipAddress: req.ip,
  });

  return res.json({ message: 'Attendance rules updated successfully' });
}

// ----------------------------------------------------------------------
// 5. LEAVE REQUESTS & WORK-FROM-HOME WORKFLOW
// ----------------------------------------------------------------------
export async function requestLeave(req: Request, res: Response) {
  const currentUser = req.user!;
  const {
    startDate,
    endDate,
    leaveCategory = 'full_day',
    partialDayDuration,
    reason,
    supportingDocumentUrl,
  } = req.body;

  if (!startDate || !endDate || !reason) {
    return res.status(400).json({ message: 'Start date, end date, and reason are required' });
  }

  const id = `lr-${Date.now()}`;
  await db('leave_requests').insert({
    id,
    user_id: currentUser.id,
    start_date: startDate,
    end_date: endDate,
    leave_category: leaveCategory,
    partial_day_duration: partialDayDuration || null,
    reason,
    supporting_document_url: supportingDocumentUrl || null,
    status: 'pending',
  });

  // Notify all Admins and Co-Admins in-app
  const admins = await db('users')
    .whereIn('role', [USER_ROLES.ADMIN, USER_ROLES.LEAD])
    .where({ status: 'active' });

  for (const admin of admins) {
    await createNotification({
      userId: admin.id,
      title: `Leave Request: ${currentUser.name}`,
      message: `${currentUser.name} submitted a ${leaveCategory.replace(/_/g, ' ')} request (${startDate} to ${endDate}). Reason: ${reason}`,
      type: 'leave_request',
      resourceType: 'LEAVE',
      resourceId: id,
      actionUrl: '/attendance',
    });
  }

  // Dispatch leave_received notification email
  try {
    for (const admin of admins) {
      await sendSystemNotification({
        eventType: 'leave_received',
        recipientEmail: admin.email,
        recipientName: admin.name,
        variables: {
          applicant_name: currentUser.name,
          leave_category: leaveCategory.replace(/_/g, ' '),
          leave_start_date: startDate,
          leave_end_date: endDate,
          reason,
          action_url: `${req.protocol}://${req.get('host')}/attendance`,
        },
      });
    }
  } catch (err) {
    console.warn('[LeaveRequest] Email notification warning:', err);
  }

  return res.status(201).json({
    message: 'Leave application submitted successfully and sent to Admin/Co-Admin for review',
    id,
  });
}

export async function getLeaveRequests(req: Request, res: Response) {
  const currentUser = req.user!;
  const isManagement = currentUser.role === USER_ROLES.ADMIN || currentUser.role === USER_ROLES.LEAD;

  let query = db('leave_requests as lr')
    .leftJoin('users as u', 'lr.user_id', 'u.id')
    .leftJoin('users as rev', 'lr.reviewed_by', 'rev.id')
    .select(
      'lr.id',
      'lr.user_id as userId',
      'u.name as userName',
      'u.role as userRole',
      'u.email as userEmail',
      'lr.leave_category as leaveCategory',
      'lr.start_date as startDate',
      'lr.end_date as endDate',
      'lr.partial_day_duration as partialDayDuration',
      'lr.reason',
      'lr.supporting_document_url as supportingDocumentUrl',
      'lr.status',
      'lr.review_comment as reviewComment',
      'lr.reviewed_at as reviewedAt',
      'rev.name as reviewerName',
      'lr.created_at as createdAt'
    );

  if (!isManagement) {
    query = query.where({ 'lr.user_id': currentUser.id });
  }

  const requests = await query.orderBy('lr.created_at', 'desc');
  return res.json(requests);
}

export async function reviewLeaveRequest(req: Request, res: Response) {
  const currentUser = req.user!;
  const { id } = req.params;
  const { action, comment } = req.body;

  // Strict backend enforcement: Only Admin and Co-Admin
  if (currentUser.role !== USER_ROLES.ADMIN && currentUser.role !== USER_ROLES.LEAD) {
    return res.status(403).json({ message: 'Only Admin and Co-Admin may review leave requests.' });
  }

  const leave = await db('leave_requests as lr')
    .join('users as u', 'lr.user_id', 'u.id')
    .where({ 'lr.id': id })
    .select('lr.*', 'u.name as userName', 'u.email as userEmail')
    .first();

  if (!leave) {
    return res.status(404).json({ message: 'Leave request not found' });
  }

  // Prevent self-approval
  if (leave.user_id === currentUser.id) {
    return res.status(400).json({ message: 'You cannot review or approve your own leave request.' });
  }

  let newStatus = 'approved';
  let eventType = 'leave_approved';
  if (action === 'reject') {
    newStatus = 'rejected';
    eventType = 'leave_rejected';
  } else if (action === 'more_info') {
    newStatus = 'more_info_needed';
    eventType = 'leave_more_info';
  }

  const now = new Date();
  await db('leave_requests').where({ id }).update({
    status: newStatus,
    reviewed_by: currentUser.id,
    review_comment: comment || null,
    reviewed_at: now,
    updated_at: now,
  });

  // Notify the applicant in-app
  await createNotification({
    userId: leave.user_id,
    title: `Leave Request ${newStatus === 'approved' ? 'Approved' : newStatus === 'rejected' ? 'Rejected' : 'Action Required'}`,
    message: `Your ${leave.leave_category.replace(/_/g, ' ')} request has been marked as ${newStatus}. ${comment ? 'Reviewer notes: ' + comment : ''}`,
    type: 'leave_request',
    resourceType: 'LEAVE',
    resourceId: id,
    actionUrl: '/attendance',
  });

  // Dispatch leave decision email
  try {
    await sendSystemNotification({
      eventType,
      recipientEmail: leave.userEmail,
      recipientName: leave.userName,
      variables: {
        recipient_name: leave.userName,
        leave_category: leave.leave_category.replace(/_/g, ' '),
        leave_start_date: leave.start_date,
        leave_end_date: leave.end_date,
        reviewer_name: currentUser.name,
        review_comment: comment || 'Decision recorded by Central Office administration.',
        action_url: `${req.protocol}://${req.get('host')}/attendance`,
      },
    });
  } catch (err) {
    console.warn('[LeaveReview] Email notification warning:', err);
  }

  await logAdminAction({
    userId: currentUser.id,
    userName: currentUser.name,
    action: `LEAVE_${newStatus.toUpperCase()}`,
    resourceType: 'LEAVE',
    resourceId: id,
    details: { applicant: leave.userName, status: newStatus, comment },
    ipAddress: req.ip,
  });

  return res.json({
    message: `Leave request has been ${newStatus}.`,
    status: newStatus,
  });
}
