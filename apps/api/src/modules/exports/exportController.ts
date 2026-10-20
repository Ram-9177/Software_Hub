import type { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import { db } from '../../config/database.js';

export async function exportAttendanceExcel(_req: Request, res: Response) {
  const records = await db('attendance as a')
    .leftJoin('users as u', 'a.user_id', 'u.id')
    .select('a.date', 'u.name as internName', 'a.check_in_time', 'a.check_out_time', 'a.status')
    .orderBy('a.date', 'desc');

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Attendance Register');

  worksheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Intern Name', key: 'internName', width: 25 },
    { header: 'Check In', key: 'checkIn', width: 18 },
    { header: 'Check Out', key: 'checkOut', width: 18 },
    { header: 'Status', key: 'status', width: 15 },
  ];

  // Header styling
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' },
  };

  for (const r of records) {
    worksheet.addRow({
      date: r.date,
      internName: r.internName,
      checkIn: r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString() : '-',
      checkOut: r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString() : '-',
      status: r.status.toUpperCase(),
    });
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=Command-Center-Attendance.xlsx');

  await workbook.xlsx.write(res);
  res.end();
}

export async function exportTrackerExcel(_req: Request, res: Response) {
  const interns = await db('users')
    .whereIn('role', ['paid_intern', 'unpaid_intern'])
    .select('id', 'name', 'role', 'intern_type', 'current_level');

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Performance Tracker');

  worksheet.columns = [
    { header: 'Intern Name', key: 'name', width: 25 },
    { header: 'Type', key: 'type', width: 15 },
    { header: 'Level', key: 'level', width: 12 },
    { header: 'Tasks Done', key: 'done', width: 15 },
    { header: 'On-Time %', key: 'onTime', width: 15 },
    { header: 'Overdue', key: 'overdue', width: 12 },
    { header: 'Avg Rating', key: 'rating', width: 12 },
  ];

  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' },
  };

  const now = new Date();
  for (const i of interns) {
    const parts = await db('task_parts').where({ assigned_intern_id: i.id });
    const doneCount = parts.filter((p) => p.status === 'done').length;
    const overdueCount = parts.filter(
      (p) => p.status === 'overdue' || (p.status !== 'done' && now > new Date(p.due_date))
    ).length;
    const onTimeRate =
      parts.length > 0
        ? `${Math.max(0, Math.round(((parts.length - overdueCount) / parts.length) * 100))}%`
        : '100%';

    const ratedParts = parts.filter((p) => p.rating !== null && p.rating !== undefined);
    const avgRating =
      ratedParts.length > 0
        ? Number((ratedParts.reduce((acc, curr) => acc + Number(curr.rating), 0) / ratedParts.length).toFixed(1))
        : (i.intern_type === 'paid' ? 5.0 : 4.5);

    worksheet.addRow({
      name: i.name,
      type: i.intern_type === 'paid' ? 'Core (Paid)' : 'Unpaid',
      level: i.current_level || 1,
      done: doneCount,
      onTime: onTimeRate,
      overdue: overdueCount,
      rating: avgRating,
    });
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=Command-Center-Tracker.xlsx');

  await workbook.xlsx.write(res);
  res.end();
}

export async function exportCertificatesExcel(_req: Request, res: Response) {
  const certs = await db('certificates as c')
    .leftJoin('users as u', 'c.user_id', 'u.id')
    .leftJoin('users as i', 'c.issued_by', 'i.id')
    .select(
      'c.certificate_number as certNumber',
      'u.name as internName',
      'c.level',
      'c.issue_date as issueDate',
      'c.status',
      'c.attendance_percentage as attendance',
      'c.tasks_completed as tasks',
      'i.name as issuedBy'
    )
    .orderBy('c.created_at', 'desc');

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Issued Certificates');

  worksheet.columns = [
    { header: 'Certificate No.', key: 'certNumber', width: 20 },
    { header: 'Intern Name', key: 'internName', width: 25 },
    { header: 'Level', key: 'level', width: 12 },
    { header: 'Issue Date', key: 'issueDate', width: 16 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Attendance %', key: 'attendance', width: 15 },
    { header: 'Tasks Completed', key: 'tasks', width: 18 },
    { header: 'Issued By', key: 'issuedBy', width: 22 },
  ];

  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' },
  };

  for (const c of certs) {
    worksheet.addRow({
      certNumber: c.certNumber,
      internName: c.internName,
      level: `Level ${c.level}`,
      issueDate: c.issueDate,
      status: c.status.toUpperCase(),
      attendance: `${c.attendance}%`,
      tasks: c.tasks,
      issuedBy: c.issuedBy,
    });
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=Command-Center-Certificates.xlsx');

  await workbook.xlsx.write(res);
  res.end();
}
