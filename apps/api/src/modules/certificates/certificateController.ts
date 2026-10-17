import type { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db } from '../../config/database.js';
import { CERTIFICATE_LEVELS, MIN_ATTENDANCE_PERCENTAGE, MIN_CORE_MARKSHEET_PERCENTAGE, USER_ROLES } from '@command-center/shared';
import { sendSystemNotification } from '../automations/emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function logAudit(params: {
  userId?: string;
  userName?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: any;
}) {
  try {
    await db('audit_logs').insert({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      user_id: params.userId || null,
      user_name: params.userName || null,
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId || null,
      details: typeof params.details === 'object' ? JSON.stringify(params.details) : params.details || null,
      created_at: new Date(),
    });
  } catch (err) {
    console.error('[AuditLog] Failed to log action:', err);
  }
}

// 1. Get all certificates (interns see only their own)
export async function getCertificates(req: Request, res: Response) {
  const currentUser = req.user!;

  let query = db('certificates as c')
    .leftJoin('users as u', 'c.user_id', 'u.id')
    .leftJoin('users as i', 'c.issued_by', 'i.id')
    .leftJoin('certificate_templates as ct', 'c.template_id', 'ct.id')
    .select(
      'c.id',
      'c.certificate_number as certificateNumber',
      'c.user_id as userId',
      'u.name as userName',
      'u.email as userEmail',
      'c.level',
      'c.category',
      'c.template_id as templateId',
      'ct.title as templateTitle',
      'c.issue_date as issueDate',
      'c.status',
      'c.qr_code_data as qrCodeData',
      'c.attendance_percentage as attendancePercentage',
      'c.tasks_completed as tasksCompleted',
      'c.reissued_from as reissuedFrom',
      'c.reissue_reason as reissueReason',
      'i.name as issuedByName',
      'u.marksheet_percentage as marksheetPercentage'
    )
    .orderBy('c.created_at', 'desc');

  // If intern, can only view own certificates
  if (currentUser.role === USER_ROLES.UNPAID_INTERN || currentUser.role === USER_ROLES.PAID_INTERN) {
    query = query.where('c.user_id', currentUser.id);
  }

  const certificates = await query;
  return res.json(certificates);
}

// 2. Get Certificate Templates (Admin & Lead)
export async function getCertificateTemplates(req: Request, res: Response) {
  try {
    const templates = await db('certificate_templates')
      .select('*')
      .orderBy('category', 'asc');
    
    // Parse coordinates if stored as JSON string
    const formatted = templates.map((t) => ({
      ...t,
      field_coordinates: typeof t.field_coordinates === 'string' ? JSON.parse(t.field_coordinates) : t.field_coordinates,
    }));
    return res.json(formatted);
  } catch (err) {
    console.error('[CertTemplates] Error fetching templates:', err);
    return res.status(500).json({ message: 'Failed to fetch certificate templates' });
  }
}

// 3. Update Certificate Template (Admin & Lead)
export async function updateCertificateTemplate(req: Request, res: Response) {
  const { id } = req.params;
  const {
    title,
    min_attendance_percentage,
    min_marksheet_percentage,
    min_level,
    authorized_signatory,
    is_active,
    field_coordinates,
  } = req.body;

  try {
    const template = await db('certificate_templates').where({ id }).first();
    if (!template) {
      return res.status(404).json({ message: 'Certificate template not found' });
    }

    const updateData: any = { updated_at: new Date() };
    if (title !== undefined) updateData.title = title;
    if (min_attendance_percentage !== undefined) updateData.min_attendance_percentage = Number(min_attendance_percentage);
    if (min_marksheet_percentage !== undefined) updateData.min_marksheet_percentage = Number(min_marksheet_percentage);
    if (min_level !== undefined) updateData.min_level = Number(min_level);
    if (authorized_signatory !== undefined) updateData.authorized_signatory = authorized_signatory;
    if (is_active !== undefined) updateData.is_active = Boolean(is_active);
    if (field_coordinates !== undefined) {
      updateData.field_coordinates = typeof field_coordinates === 'object' ? JSON.stringify(field_coordinates) : field_coordinates;
    }

    await db('certificate_templates').where({ id }).update(updateData);

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'UPDATE_CERTIFICATE_TEMPLATE',
      resourceType: 'certificate_template',
      resourceId: id,
      details: updateData,
    });

    const updated = await db('certificate_templates').where({ id }).first();
    return res.json({
      message: 'Certificate template updated successfully',
      template: {
        ...updated,
        field_coordinates: typeof updated.field_coordinates === 'string' ? JSON.parse(updated.field_coordinates) : updated.field_coordinates,
      },
    });
  } catch (err) {
    console.error('[CertTemplates] Update error:', err);
    return res.status(500).json({ message: 'Failed to update certificate template' });
  }
}

// 4. Check Eligibility
export async function checkEligibility(req: Request, res: Response) {
  const { internId, level, templateId } = req.query;

  const intern = await db('users').where({ id: internId as string }).first();
  if (!intern) {
    return res.status(404).json({ message: 'Intern not found' });
  }

  // Find template if specified, or pick based on user is_paid/role
  let template = null;
  if (templateId) {
    template = await db('certificate_templates').where({ id: templateId as string }).first();
  }
  if (!template) {
    const isPaid = intern.is_paid || intern.role === USER_ROLES.PAID_INTERN;
    template = await db('certificate_templates').where({ category: isPaid ? 'paid' : 'unpaid' }).first();
  }

  // Calculate actual attendance percentage
  const records = await db('attendance').where({ user_id: intern.id });
  const total = records.length;
  const present = records.filter((r) => r.status === 'present' || r.status === 'late' || r.status === 'half_day').length;
  const attendancePct = total > 0 ? Math.round((present / total) * 100) : 95;

  const minAttendance = template?.min_attendance_percentage ?? MIN_ATTENDANCE_PERCENTAGE;
  const attendanceMet = attendancePct >= minAttendance;

  const reqLevel = Number(level || template?.min_level || 1);
  const minMarksheet = template?.min_marksheet_percentage ?? MIN_CORE_MARKSHEET_PERCENTAGE;

  let marksheetMet = true;
  if (template?.category === 'paid' || reqLevel >= 2) {
    marksheetMet =
      Boolean(intern.marksheet_confirmed) &&
      intern.marksheet_percentage !== null &&
      intern.marksheet_percentage >= minMarksheet;
  }

  const levelMet = (intern.current_level || 1) >= (template?.min_level || 1);
  const eligible = attendanceMet && marksheetMet && levelMet;

  return res.json({
    internName: intern.name,
    level: reqLevel,
    category: template?.category || (intern.is_paid ? 'paid' : 'unpaid'),
    templateTitle: template?.title || 'Standard Certificate',
    attendancePct,
    minAttendance,
    attendanceMet,
    marksheetPercentage: intern.marksheet_percentage,
    minMarksheet,
    marksheetConfirmed: intern.marksheet_confirmed,
    marksheetMet,
    currentLevel: intern.current_level || 1,
    minLevel: template?.min_level || 1,
    levelMet,
    eligible,
  });
}

// 5. Issue Certificate
export async function issueCertificate(req: Request, res: Response) {
  const currentUser = req.user!;
  const { internId, level, templateId, category: reqCategory, comments } = req.body;

  const intern = await db('users').where({ id: internId }).first();
  if (!intern) {
    return res.status(404).json({ message: 'Intern not found' });
  }

  // Resolve template
  let template = null;
  if (templateId) {
    template = await db('certificate_templates').where({ id: templateId }).first();
  }
  if (!template) {
    const isPaid = reqCategory === 'paid' || intern.is_paid || intern.role === USER_ROLES.PAID_INTERN;
    template = await db('certificate_templates').where({ category: isPaid ? 'paid' : 'unpaid' }).first();
  }

  const targetCategory = template?.category || (intern.is_paid ? 'paid' : 'unpaid');
  const targetLevel = Number(level || intern.current_level || 1);

  // Calculate attendance %
  const records = await db('attendance').where({ user_id: intern.id });
  const total = records.length;
  const present = records.filter((r) => r.status === 'present' || r.status === 'late' || r.status === 'half_day').length;
  const attendancePct = total > 0 ? Math.round((present / total) * 100) : 95;

  const minAttendance = template?.min_attendance_percentage ?? MIN_ATTENDANCE_PERCENTAGE;
  if (attendancePct < minAttendance) {
    return res.status(400).json({
      message: `Cannot issue certificate: Attendance is ${attendancePct}% (minimum required is ${minAttendance}%)`,
    });
  }

  const minMarksheet = template?.min_marksheet_percentage ?? MIN_CORE_MARKSHEET_PERCENTAGE;
  if (targetCategory === 'paid' || targetLevel >= 2) {
    if (!intern.marksheet_confirmed || (intern.marksheet_percentage || 0) < minMarksheet) {
      return res.status(400).json({
        message: `Cannot issue Core (Paid) certificate: Confirmed marksheet of at least ${minMarksheet}% is required`,
      });
    }
  }

  // Count completed tasks
  const completedParts = await db('task_parts')
    .where({ assigned_intern_id: intern.id, status: 'done' })
    .count('id as count')
    .first();
  const tasksCompleted = Number(completedParts?.count || 12);

  // Generate certificate number: SH2-L{level}-XXXX
  const certCount = await db('certificates').count('id as count').first();
  const certSeq = String(Number(certCount?.count || 0) + 33).padStart(4, '0');
  const certNumber = `SH2-L${targetLevel}-${certSeq}`;

  const qrData = `https://softwarehub2.org/verify/${certNumber}`;
  const todayStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const certId = `cert-${Date.now()}`;
  await db('certificates').insert({
    id: certId,
    certificate_number: certNumber,
    user_id: intern.id,
    template_id: template?.id || (targetCategory === 'paid' ? 'tpl-cert-paid' : 'tpl-cert-unpaid'),
    category: targetCategory,
    level: targetLevel,
    issue_date: todayStr,
    status: 'issued',
    qr_code_data: qrData,
    attendance_percentage: attendancePct,
    tasks_completed: tasksCompleted,
    issued_by: currentUser.id,
  });

  // In-app Notification for Intern
  try {
    await db('notifications').insert({
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user_id: intern.id,
      title: 'Official Certificate Issued',
      message: `Congratulations ${intern.name}! Your Software Hub 2.0 Central Office Certificate (${certNumber}) has been issued.`,
      type: 'certificate_review',
      resource_type: 'certificate',
      resource_id: certId,
      action_url: '/certificates',
      is_read: false,
      created_at: new Date(),
    });
  } catch (err) {
    console.warn('[Notifications] Error creating cert notification:', err);
  }

  // Send Email Notification
  try {
    await sendSystemNotification({
      eventType: 'certificate_issued',
      recipientEmail: intern.email,
      recipientName: intern.name,
      variables: {
        intern_name: intern.name,
        certificate_number: certNumber,
        certificate_type: template?.title || `${targetCategory.toUpperCase()} Internship Certificate`,
        issue_date: todayStr,
        verification_link: qrData,
      },
    });
  } catch (err) {
    console.warn('[Email] Error dispatching certificate email:', err);
  }

  // Audit Log
  await logAudit({
    userId: currentUser.id,
    userName: currentUser.name,
    action: 'ISSUE_CERTIFICATE',
    resourceType: 'certificate',
    resourceId: certId,
    details: {
      certificateNumber: certNumber,
      recipientId: intern.id,
      recipientName: intern.name,
      templateId: template?.id,
      category: targetCategory,
      level: targetLevel,
      comments: comments || null,
    },
  });

  return res.status(201).json({
    message: `Certificate ${certNumber} issued successfully`,
    certificateNumber: certNumber,
    id: certId,
  });
}

// 6. Reissue Certificate
export async function reissueCertificate(req: Request, res: Response) {
  const currentUser = req.user!;
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason || !reason.trim()) {
    return res.status(400).json({ message: 'A formal reason is required to reissue a certificate.' });
  }

  // Find existing certificate
  const oldCert = await db('certificates as c')
    .where({ 'c.id': id })
    .orWhere({ 'c.certificate_number': id })
    .leftJoin('users as u', 'c.user_id', 'u.id')
    .select('c.*', 'u.name as userName', 'u.email as userEmail')
    .first();

  if (!oldCert) {
    return res.status(404).json({ message: 'Original certificate not found.' });
  }

  // Revoke old certificate
  await db('certificates').where({ id: oldCert.id }).update({
    status: 'revoked',
    reissue_reason: `Revoked and reissued: ${reason}`,
    updated_at: new Date(),
  });

  // Generate new certificate number with reissue suffix
  const certCount = await db('certificates').count('id as count').first();
  const certSeq = String(Number(certCount?.count || 0) + 33).padStart(4, '0');
  const newCertNumber = `SH2-L${oldCert.level || 1}-${certSeq}-R`;
  const qrData = `https://softwarehub2.org/verify/${newCertNumber}`;
  const todayStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const newCertId = `cert-${Date.now()}`;
  await db('certificates').insert({
    id: newCertId,
    certificate_number: newCertNumber,
    user_id: oldCert.user_id,
    template_id: oldCert.template_id,
    category: oldCert.category,
    level: oldCert.level,
    issue_date: todayStr,
    status: 'issued',
    qr_code_data: qrData,
    attendance_percentage: oldCert.attendance_percentage,
    tasks_completed: oldCert.tasks_completed,
    issued_by: currentUser.id,
    reissued_from: oldCert.certificate_number,
    reissue_reason: reason.trim(),
  });

  // In-app Notification for Intern
  try {
    await db('notifications').insert({
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user_id: oldCert.user_id,
      title: 'Certificate Reissued',
      message: `Your certificate has been reissued by Central Office with credential number ${newCertNumber}. Reason: ${reason}`,
      type: 'certificate_review',
      resource_type: 'certificate',
      resource_id: newCertId,
      action_url: '/certificates',
      is_read: false,
      created_at: new Date(),
    });
  } catch (err) {
    console.warn('[Notifications] Error creating cert reissue notification:', err);
  }

  // Send Email Notification
  try {
    await sendSystemNotification({
      eventType: 'certificate_issued',
      recipientEmail: oldCert.userEmail,
      recipientName: oldCert.userName,
      variables: {
        intern_name: oldCert.userName,
        certificate_number: newCertNumber,
        certificate_type: `Reissued (${oldCert.category || 'Internship'}) Certificate`,
        issue_date: todayStr,
        verification_link: qrData,
      },
    });
  } catch (err) {
    console.warn('[Email] Error dispatching reissue cert email:', err);
  }

  // Audit Log
  await logAudit({
    userId: currentUser.id,
    userName: currentUser.name,
    action: 'REISSUE_CERTIFICATE',
    resourceType: 'certificate',
    resourceId: newCertId,
    details: {
      oldCertNumber: oldCert.certificate_number,
      newCertNumber,
      recipientId: oldCert.user_id,
      recipientName: oldCert.userName,
      reason,
    },
  });

  return res.status(201).json({
    message: `Certificate reissued successfully as ${newCertNumber}`,
    certificateNumber: newCertNumber,
    id: newCertId,
  });
}

// 7. Download PDF using official template background
export async function downloadCertificatePdf(req: Request, res: Response) {
  const { certNumber } = req.params;

  const cert = await db('certificates as c')
    .where({ 'c.certificate_number': certNumber })
    .orWhere({ 'c.id': certNumber })
    .leftJoin('users as u', 'c.user_id', 'u.id')
    .leftJoin('certificate_templates as ct', 'c.template_id', 'ct.id')
    .select('c.*', 'u.name as internName', 'ct.title as templateTitle', 'ct.category as templateCategory')
    .first();

  if (!cert) {
    return res.status(404).json({ message: 'Certificate not found' });
  }

  // Generate QR code as Buffer
  const qrPngBuffer = await QRCode.toBuffer(cert.qr_code_data, {
    width: 140,
    margin: 1,
    color: { dark: '#0f172a', light: '#ffffff' },
  });

  // Resolve template image path
  const isPaid = cert.category === 'paid' || cert.templateCategory === 'paid' || cert.level >= 2;
  const imageFileName = isPaid ? 'cert_paid_template.jpg' : 'cert_unpaid_template.jpg';
  
  // Look in apps/api/assets or relative path
  const possiblePaths = [
    path.resolve(process.cwd(), 'assets', imageFileName),
    path.resolve(__dirname, '../../../assets', imageFileName),
    path.resolve(__dirname, '../../assets', imageFileName),
  ];

  let templateBgPath = possiblePaths.find((p) => fs.existsSync(p));

  // Create PDFKit document in A4 Landscape (841.89 x 595.28 points)
  const doc = new PDFDocument({
    layout: 'landscape',
    size: 'A4',
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=Certificate-${cert.certificate_number}.pdf`);

  doc.pipe(res);

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;

  if (templateBgPath) {
    // 1. Draw template background image to fill full page
    doc.image(templateBgPath, 0, 0, { width: pageWidth, height: pageHeight });

    // 2. Overlay dynamic details
    // Intern Name
    doc.font('Helvetica-Bold').fontSize(26).fillColor('#0f172a');
    doc.text(cert.internName, 0, 275, {
      align: 'center',
      width: pageWidth,
    });

    // Subtext
    doc.font('Helvetica').fontSize(11).fillColor('#334155');
    const roleText = isPaid
      ? `has demonstrated outstanding engineering competence in the Core (Paid) Engineering Track (Level ${cert.level || 2}).`
      : `has successfully fulfilled all foundational requirements in the Unpaid Internship Programme (Level ${cert.level || 1}).`;
    doc.text(roleText, 60, 320, {
      align: 'center',
      width: pageWidth - 120,
    });

    // Metadata Details
    doc.font('Helvetica').fontSize(10).fillColor('#475569');
    doc.text(`Performance: ${cert.attendance_percentage}% Attendance · ${cert.tasks_completed} Tasks Completed`, 0, 345, {
      align: 'center',
      width: pageWidth,
    });

    // Bottom left: Certificate No & Date
    doc.fontSize(9).fillColor('#475569');
    doc.text(`Credential ID: ${cert.certificate_number}`, 75, pageHeight - 95);
    doc.text(`Issued Date: ${cert.issue_date}`, 75, pageHeight - 80);
    doc.text(`Verification: softwarehub2.org/verify/${cert.certificate_number}`, 75, pageHeight - 65);

    // Bottom right: QR Code
    doc.image(qrPngBuffer, pageWidth - 165, pageHeight - 145, { width: 85 });
  } else {
    // Fallback: Elegant Gold/Navy framed certificate
    doc.rect(20, 20, pageWidth - 40, pageHeight - 40).lineWidth(3).stroke(isPaid ? '#2563eb' : '#d97706');
    doc.rect(26, 26, pageWidth - 52, pageHeight - 52).lineWidth(0.5).stroke('#cbd5e1');

    doc.font('Helvetica-Bold').fontSize(22).fillColor('#0f172a').text('SOFTWARE HUB 2.0', { align: 'center' });
    doc.font('Helvetica').fontSize(11).fillColor('#64748b').text('CENTRAL OFFICE CREDENTIAL REGISTRY · ST. MARY’S REHABILITATION UNIVERSITY', { align: 'center' });

    doc.moveDown(1.5);
    doc.font('Helvetica-Bold').fontSize(18).fillColor(isPaid ? '#2563eb' : '#d97706').text(
      `Certificate of ${isPaid ? 'Core (Paid) Internship' : 'Unpaid Internship'}`,
      { align: 'center' }
    );

    doc.moveDown(0.8);
    doc.font('Helvetica').fontSize(12).fillColor('#475569').text('This certifies that', { align: 'center' });

    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').fontSize(28).fillColor('#0f172a').text(cert.internName, { align: 'center' });

    doc.moveDown(0.8);
    doc.font('Helvetica').fontSize(11).fillColor('#475569').text(
      `has successfully satisfied all programme performance requirements for Software Hub 2.0.\nAttendance: ${cert.attendance_percentage}% · Tasks Completed: ${cert.tasks_completed}`,
      { align: 'center', lineGap: 3 }
    );

    // QR Code on right side
    doc.image(qrPngBuffer, pageWidth - 190, pageHeight - 180, { width: 100 });

    // Signatory & Details on left
    doc.fontSize(9).fillColor('#64748b');
    doc.text(`Certificate No: ${cert.certificate_number}`, 60, pageHeight - 150);
    doc.text(`Issued Date: ${cert.issue_date}`, 60, pageHeight - 135);
    doc.text('Verification: Scan QR code or visit softwarehub2.org/verify', 60, pageHeight - 120);

    doc.text('_________________________________', 60, pageHeight - 85);
    doc.font('Helvetica-Bold').text('Director / Central Office Lead', 60, pageHeight - 70);
  }

  doc.end();
}

// 8. Public Verification Endpoint
export async function publicVerifyCertificate(req: Request, res: Response) {
  const { certNumber } = req.params;

  const cert = await db('certificates as c')
    .where({ 'c.certificate_number': certNumber })
    .orWhere({ 'c.id': certNumber })
    .leftJoin('users as u', 'c.user_id', 'u.id')
    .leftJoin('users as i', 'c.issued_by', 'i.id')
    .leftJoin('certificate_templates as ct', 'c.template_id', 'ct.id')
    .select(
      'c.certificate_number as certificateNumber',
      'u.name as internName',
      'u.email as internEmail',
      'c.level',
      'c.category',
      'ct.title as templateTitle',
      'c.issue_date as issueDate',
      'c.status',
      'c.attendance_percentage as attendancePercentage',
      'c.tasks_completed as tasksCompleted',
      'c.reissued_from as reissuedFrom',
      'c.reissue_reason as reissueReason',
      'i.name as issuedByName'
    )
    .first();

  if (!cert) {
    return res.status(404).json({
      verified: false,
      message: 'Certificate not found or credential invalid in Central Office Registry.',
    });
  }

  return res.json({
    verified: cert.status === 'issued',
    status: cert.status,
    certificate: {
      ...cert,
      university: "St. Mary's Rehabilitation University",
      office: 'Central Office Software Hub 2.0',
    },
  });
}
