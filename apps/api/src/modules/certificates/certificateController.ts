import type { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { db } from '../../config/database.js';
import { ENV } from '../../config/env.js';
import {
  CERTIFICATE_LEVELS,
  MIN_ATTENDANCE_PERCENTAGE,
  MIN_CORE_MARKSHEET_PERCENTAGE,
  USER_ROLES,
} from '@command-center/shared';
import { sendSystemNotification } from '../automations/emailService.js';
import { logAdminAction } from '../users/userController.js';

function findTemplateFile(filename: string): string | null {
  const candidateDirs = [
    path.resolve(process.cwd(), 'apps/web/public/assets'),
    path.resolve(process.cwd(), '../web/public/assets'),
    path.resolve(process.cwd(), '../../apps/web/public/assets'),
    path.resolve(process.cwd(), 'public/assets'),
    path.resolve(process.cwd(), 'assets'),
  ];
  for (const dir of candidateDirs) {
    const full = path.join(dir, filename);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

/**
 * Generate publication-grade PDF buffer for a certificate using official SMRU templates
 */
async function generateCertificatePdfBuffer(cert: {
  certificateNumber: string;
  internName: string;
  category: string;
  level: number;
  issueDate: string;
  attendancePercentage: number;
  tasksCompleted: number;
  issuedByName: string;
  qrDataUrl: string;
  designation?: string;
  internshipPeriod?: string;
}): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const qrPngBuffer = await QRCode.toBuffer(cert.qrDataUrl, {
        width: 140,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' },
      });

      const isCore = cert.category === 'paid' || cert.level >= 2;
      const templateFilename = isCore ? 'cert_paid_template.jpg' : 'cert_unpaid_template.jpg';
      const templatePath = findTemplateFile(templateFilename);

      // A4 Landscape: 841.89 x 595.28 points
      const doc = new PDFDocument({
        layout: 'landscape',
        size: 'A4',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;

      if (templatePath) {
        // High-Resolution Official University Background
        doc.image(templatePath, 0, 0, { width: pageWidth, height: pageHeight });

        if (isCore) {
          // Core (Paid) Engineering Credential Layout
          doc
            .fontSize(23)
            .font('Helvetica-Bold')
            .fillColor('#0f2942')
            .text(cert.internName.toUpperCase(), 0, 284, { align: 'center', width: pageWidth });

          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .fillColor('#1e293b')
            .text(cert.designation || 'Core Software Engineering Intern', 255, 455);

          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .fillColor('#1e293b')
            .text(`Level ${cert.level}`, 630, 455);

          doc
            .fontSize(9.5)
            .font('Helvetica-Bold')
            .fillColor('#1e293b')
            .text(cert.internshipPeriod || '01 Aug 2026 – 20 Oct 2026', 305, 510);

          doc
            .fontSize(9.5)
            .font('Helvetica-Bold')
            .fillColor('#1e293b')
            .text(cert.issueDate, 690, 510);

          doc
            .fontSize(9.5)
            .font('Helvetica-Bold')
            .fillColor('#1e293b')
            .text(cert.issuedByName || 'Director, Central Office, SMRU', 340, 568);

          doc.image(qrPngBuffer, 740, 526, { width: 52, height: 52 });
          doc
            .fontSize(7)
            .font('Helvetica-Bold')
            .fillColor('#475569')
            .text(`ID: ${cert.certificateNumber}`, 720, 579, { width: 92, align: 'center' });
        } else {
          // Foundational Central Office Credential Layout
          doc
            .fontSize(23)
            .font('Helvetica-Bold')
            .fillColor('#0f2942')
            .text(cert.internName.toUpperCase(), 0, 282, { align: 'center', width: pageWidth });

          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .fillColor('#1e293b')
            .text(cert.designation || 'Foundational Central Office Intern', 195, 420);

          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .fillColor('#1e293b')
            .text(`Level ${cert.level}`, 595, 420);

          doc
            .fontSize(9.5)
            .font('Helvetica-Bold')
            .fillColor('#1e293b')
            .text(cert.internshipPeriod || '01 Sep 2026 – 20 Oct 2026', 225, 468);

          doc
            .fontSize(9.5)
            .font('Helvetica-Bold')
            .fillColor('#1e293b')
            .text(cert.issueDate, 195, 522);

          doc
            .fontSize(9.5)
            .font('Helvetica-Bold')
            .fillColor('#1e293b')
            .text(cert.issuedByName || 'Lead & Director, Central Office, SMRU', 255, 573);

          doc.image(qrPngBuffer, 650, 470, { width: 70, height: 70 });
          doc
            .fontSize(8)
            .font('Helvetica-Bold')
            .fillColor('#475569')
            .text(`ID: ${cert.certificateNumber}`, 630, 545, { width: 110, align: 'center' });
        }
      } else {
        // Fallback institutional vector design
        doc.rect(20, 20, pageWidth - 40, pageHeight - 40).lineWidth(3).stroke(isCore ? '#0d315c' : '#b45309');
        doc.rect(26, 26, pageWidth - 52, pageHeight - 52).lineWidth(0.75).stroke('#cbd5e1');

        doc.font('Helvetica-Bold').fontSize(22).fillColor('#0d315c').text('ST. MARY’S REHABILITATION UNIVERSITY', 0, 70, { align: 'center', width: pageWidth });
        doc.font('Helvetica').fontSize(11).fillColor('#64748b').text('CENTRAL OFFICE OPERATIONS & CREDENTIAL REGISTRY', 0, 98, { align: 'center', width: pageWidth });
        doc.font('Helvetica-Bold').fontSize(18).fillColor(isCore ? '#0d315c' : '#b45309').text(isCore ? 'CERTIFICATE OF CORE INTERNSHIP' : 'CERTIFICATE OF FOUNDATIONAL INTERNSHIP', 0, 145, { align: 'center', width: pageWidth });
        doc.font('Helvetica').fontSize(12).fillColor('#475569').text('This is to certify that', 0, 190, { align: 'center', width: pageWidth });
        doc.font('Helvetica-Bold').fontSize(26).fillColor('#0f172a').text(cert.internName, 0, 220, { align: 'center', width: pageWidth });

        const desc = isCore
          ? `has fulfilled all requirements of the Core (Paid) Engineering Track (Level ${cert.level}), demonstrating proficiency in university operations management and technical leadership.`
          : `has fulfilled all foundational requirements of the University Central Office Unpaid Internship Programme (Level ${cert.level}) in good standing.`;
        doc.font('Helvetica').fontSize(11).fillColor('#334155').text(desc, 80, 275, { align: 'center', width: pageWidth - 160, lineGap: 4 });
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#475569').text(`Verified Attendance: ${cert.attendancePercentage}%  •  Completed Deliverables: ${cert.tasksCompleted}`, 0, 340, { align: 'center', width: pageWidth });

        const signY = pageHeight - 130;
        doc.lineWidth(1).strokeColor('#94a3b8').moveTo(pageWidth - 320, signY).lineTo(pageWidth - 80, signY).stroke();
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a').text(cert.issuedByName || 'Director, Central Office, SMRU', pageWidth - 320, signY + 6, { width: 240, align: 'center' });
        doc.font('Helvetica').fontSize(8.5).fillColor('#64748b').text('Authorized University Central Office Signatory', pageWidth - 320, signY + 20, { width: 240, align: 'center' });

        doc.font('Helvetica').fontSize(9).fillColor('#475569');
        doc.text(`Credential ID: ${cert.certificateNumber}`, 75, pageHeight - 110);
        doc.text(`Issued Date: ${cert.issueDate}`, 75, pageHeight - 96);
        doc.text(`Verify Online: ${cert.qrDataUrl}`, 75, pageHeight - 82);
        doc.image(qrPngBuffer, 75, pageHeight - 145, { width: 65 });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ----------------------------------------------------------------------
// 1. GET ALL CERTIFICATES
// ----------------------------------------------------------------------
export async function getCertificates(req: Request, res: Response) {
  const currentUser = req.user!;

  let query = db('certificates as c')
    .leftJoin('users as u', 'c.user_id', 'u.id')
    .leftJoin('users as i', 'c.issued_by', 'i.id')
    .select(
      'c.id',
      'c.certificate_number as certificateNumber',
      'c.user_id as userId',
      'u.name as userName',
      'u.email as userEmail',
      'c.level',
      'c.issue_date as issueDate',
      'c.status',
      'c.qr_code_data as qrCodeData',
      'c.attendance_percentage as attendancePercentage',
      'c.tasks_completed as tasksCompleted',
      'i.name as issuedByName',
      'u.marksheet_percentage as marksheetPercentage',
      'u.marksheet_confirmed as marksheetConfirmed'
    )
    .orderBy('c.created_at', 'desc');

  // Role-based visibility scoping
  if (currentUser.role === USER_ROLES.UNPAID_INTERN) {
    query = query.where('c.user_id', currentUser.id);
  } else if (currentUser.role === USER_ROLES.PAID_INTERN) {
    const pairedInternIds = await db('users')
      .where({ paired_paid_intern_id: currentUser.id })
      .pluck('id');
    query = query.whereIn('c.user_id', [currentUser.id, ...pairedInternIds]);
  }

  const certificates = await query;
  return res.json(certificates);
}

// ----------------------------------------------------------------------
// 2. CHECK ELIGIBILITY
// ----------------------------------------------------------------------
export async function checkEligibility(req: Request, res: Response) {
  const { internId, level = 1 } = req.query;

  const intern = await db('users').where({ id: internId as string }).first();
  if (!intern) {
    return res.status(404).json({ message: 'Intern not found' });
  }

  const reqLevel = Number(level);
  const isCore = reqLevel === CERTIFICATE_LEVELS.LEVEL_2 || intern.role === USER_ROLES.PAID_INTERN;

  // Real attendance percentage calculation from rows
  const records = await db('attendance').where({ user_id: intern.id });
  const total = records.length;
  const present = records.filter((r) => r.status === 'present' || r.status === 'late').length;
  const halfDays = records.filter((r) => r.status === 'half_day').length;

  const attendancePct = total > 0 ? Math.round(((present + halfDays * 0.5) / total) * 100) : 0;
  const attendanceMet = attendancePct >= MIN_ATTENDANCE_PERCENTAGE;

  let marksheetMet = true;
  if (isCore) {
    marksheetMet =
      Boolean(intern.marksheet_confirmed) &&
      intern.marksheet_percentage !== null &&
      Number(intern.marksheet_percentage) >= MIN_CORE_MARKSHEET_PERCENTAGE;
  }

  const eligible = attendanceMet && marksheetMet;

  return res.json({
    internName: intern.name,
    level: reqLevel,
    category: isCore ? 'paid' : 'unpaid',
    attendancePct,
    minAttendance: MIN_ATTENDANCE_PERCENTAGE,
    attendanceMet,
    marksheetPercentage: intern.marksheet_percentage,
    minMarksheet: MIN_CORE_MARKSHEET_PERCENTAGE,
    marksheetConfirmed: Boolean(intern.marksheet_confirmed),
    marksheetMet,
    eligible,
  });
}

// ----------------------------------------------------------------------
// 3. ISSUE CERTIFICATE
// ----------------------------------------------------------------------
export async function issueCertificate(req: Request, res: Response) {
  const currentUser = req.user!;
  const { internId, level = 1 } = req.body;

  // Role authorization: Admin or Lead
  if (currentUser.role !== USER_ROLES.ADMIN && currentUser.role !== USER_ROLES.LEAD) {
    return res.status(403).json({ message: 'Only Admin and Co-Admin can issue certificates' });
  }

  const intern = await db('users').where({ id: internId }).first();
  if (!intern) {
    return res.status(404).json({ message: 'Intern not found' });
  }

  const targetLevel = Number(level);
  const isCore = targetLevel === CERTIFICATE_LEVELS.LEVEL_2 || intern.role === USER_ROLES.PAID_INTERN;

  // Strict attendance gate
  const records = await db('attendance').where({ user_id: intern.id });
  const total = records.length;
  const present = records.filter((r) => r.status === 'present' || r.status === 'late').length;
  const halfDays = records.filter((r) => r.status === 'half_day').length;
  const attendancePct = total > 0 ? Math.round(((present + halfDays * 0.5) / total) * 100) : 0;

  if (attendancePct < MIN_ATTENDANCE_PERCENTAGE) {
    return res.status(400).json({
      message: `Cannot issue certificate: Attendance is ${attendancePct}% (minimum required is ${MIN_ATTENDANCE_PERCENTAGE}%).`,
    });
  }

  // Strict Level 2 (Core Intern) marksheet gate
  if (isCore) {
    if (!intern.marksheet_confirmed || (intern.marksheet_percentage || 0) < MIN_CORE_MARKSHEET_PERCENTAGE) {
      return res.status(400).json({
        message: `Cannot issue Core Intern Certificate: A confirmed marksheet of at least ${MIN_CORE_MARKSHEET_PERCENTAGE}% is required. Current: ${intern.marksheet_percentage || 0}%.`,
      });
    }
  }

  // Real count of completed parts
  const completedParts = await db('task_parts')
    .where({ assigned_intern_id: intern.id, status: 'done' })
    .count('id as count')
    .first();
  const tasksCompleted = Number(completedParts?.count || 0);

  // Sequential Certificate Number
  const certCountRecord = await db('certificates').count('id as count').first();
  const certSeq = String(Number(certCountRecord?.count || 0) + 1).padStart(4, '0');
  const certNumber = `SH2-L${targetLevel}-${certSeq}`;

  const qrDataUrl = `${ENV.CLIENT_ORIGIN || 'http://localhost:5173'}/verify/${certNumber}`;
  const todayStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const certId = `cert-${Date.now()}`;
  await db('certificates').insert({
    id: certId,
    certificate_number: certNumber,
    user_id: intern.id,
    level: targetLevel,
    issue_date: todayStr,
    status: 'issued',
    qr_code_data: qrDataUrl,
    attendance_percentage: attendancePct,
    tasks_completed: tasksCompleted,
    issued_by: currentUser.id,
    created_at: new Date(),
    updated_at: new Date(),
  });

  // Generate PDF buffer for attachment
  let pdfBuffer: Buffer | null = null;
  try {
    pdfBuffer = await generateCertificatePdfBuffer({
      certificateNumber: certNumber,
      internName: intern.name,
      category: isCore ? 'paid' : 'unpaid',
      level: targetLevel,
      issueDate: todayStr,
      attendancePercentage: attendancePct,
      tasksCompleted,
      issuedByName: currentUser.name,
      qrDataUrl,
    });
  } catch (pdfErr) {
    console.error('[CertPdf] Error generating certificate PDF buffer:', pdfErr);
  }

  // 10. Certificate Issued Email Automation: immediately to the intern with PDF attached
  if (intern.email) {
    sendSystemNotification({
      ruleKey: 'certificate_issued',
      recipientEmail: intern.email,
      recipientName: intern.name,
      recipientUserId: intern.id,
      idempotencyKey: `cert_issued:${certNumber}`,
      variables: {
        intern_name: intern.name,
        certificate_number: certNumber,
        certificate_type: isCore ? 'Core (Paid) Internship Certificate' : 'Foundational Internship Certificate',
        issue_date: todayStr,
        verification_link: qrDataUrl,
      },
      attachments: pdfBuffer
        ? [
            {
              filename: `Certificate-${certNumber}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf',
            },
          ]
        : undefined,
    }).catch((err) => console.error('[CertEmail] Error dispatching certificate email:', err));
  }

  await logAdminAction({
    userId: currentUser.id,
    userName: currentUser.name,
    action: 'CERTIFICATE_ISSUED',
    resourceType: 'CERTIFICATE',
    resourceId: certId,
    details: { certificateNumber: certNumber, internName: intern.name, level: targetLevel },
    ipAddress: req.ip,
  });

  return res.status(201).json({
    message: `Certificate ${certNumber} issued successfully`,
    certificateNumber: certNumber,
    id: certId,
  });
}

// ----------------------------------------------------------------------
// 4. DOWNLOAD CERTIFICATE PDF
// ----------------------------------------------------------------------
export async function downloadCertificatePdf(req: Request, res: Response) {
  const { certNumber } = req.params;

  const cert = await db('certificates as c')
    .leftJoin('users as u', 'c.user_id', 'u.id')
    .leftJoin('users as i', 'c.issued_by', 'i.id')
    .where('c.certificate_number', certNumber)
    .select(
      'c.*',
      'u.name as internName',
      'i.name as issuedByName'
    )
    .first();

  if (!cert) {
    return res.status(404).json({ message: 'Certificate not found' });
  }

  const qrDataUrl = cert.qr_code_data || `${ENV.CLIENT_ORIGIN || 'http://localhost:5173'}/verify/${certNumber}`;

  const pdfBuffer = await generateCertificatePdfBuffer({
    certificateNumber: cert.certificate_number,
    internName: cert.internName || 'Intern',
    category: cert.level >= 2 ? 'paid' : 'unpaid',
    level: cert.level,
    issueDate: cert.issue_date,
    attendancePercentage: cert.attendance_percentage,
    tasksCompleted: cert.tasks_completed,
    issuedByName: cert.issuedByName || 'Central Office Director',
    qrDataUrl,
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=Certificate-${cert.certificate_number}.pdf`);
  return res.send(pdfBuffer);
}

// ----------------------------------------------------------------------
// 5. PUBLIC VERIFICATION (Open without authentication)
// ----------------------------------------------------------------------
export async function publicVerifyCertificate(req: Request, res: Response) {
  const { certNumber } = req.params;

  const cert = await db('certificates as c')
    .leftJoin('users as u', 'c.user_id', 'u.id')
    .leftJoin('users as i', 'c.issued_by', 'i.id')
    .whereRaw('LOWER(c.certificate_number) = ?', [certNumber.toLowerCase()])
    .select(
      'c.id',
      'c.certificate_number as certificateNumber',
      'u.name as internName',
      'c.level',
      'c.issue_date as issueDate',
      'c.status',
      'c.attendance_percentage as attendancePercentage',
      'c.tasks_completed as tasksCompleted',
      'i.name as issuedByName'
    )
    .first();

  if (!cert) {
    return res.status(404).json({
      verified: false,
      message: `No authentic university credential found matching certificate ID "${certNumber}".`,
    });
  }

  return res.json({
    verified: true,
    certificateNumber: cert.certificateNumber,
    internName: cert.internName,
    level: cert.level,
    programType: cert.level >= 2 ? 'Core (Paid) Internship' : 'Foundational (Unpaid) Internship',
    issueDate: cert.issueDate,
    status: cert.status,
    attendancePercentage: cert.attendancePercentage,
    tasksCompleted: cert.tasksCompleted,
    issuedByName: cert.issuedByName || 'Central Office Signatory',
    institution: 'Software Hub 2.0 Central Office',
  });
}

// ----------------------------------------------------------------------
// 6. CERTIFICATE TEMPLATES (For configuration)
// ----------------------------------------------------------------------
export async function getCertificateTemplates(_req: Request, res: Response) {
  let templates = await db('certificate_templates').select('*');
  if (templates.length === 0) {
    const defaults = [
      {
        id: 'tpl-core-paid',
        category: 'paid',
        title: 'Core (Paid) Engineering Credential',
        background_image_path: '/assets/cert_paid_template.jpg',
        min_attendance_percentage: 75.0,
        min_marksheet_percentage: 80.0,
        min_level: 2,
        authorized_signatory: 'Director, Central Office, St. Mary’s Rehabilitation University',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 'tpl-foundational-unpaid',
        category: 'unpaid',
        title: 'Foundational Central Office Credential',
        background_image_path: '/assets/cert_unpaid_template.jpg',
        min_attendance_percentage: 75.0,
        min_marksheet_percentage: 0.0,
        min_level: 1,
        authorized_signatory: 'Lead & Director, Central Office, St. Mary’s Rehabilitation University',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];
    await db('certificate_templates').insert(defaults);
    templates = await db('certificate_templates').select('*');
  }
  return res.json(templates);
}

export async function updateCertificateTemplate(req: Request, res: Response) {
  const { id } = req.params;
  const updates = req.body;
  await db('certificate_templates').where({ id }).update(updates);
  return res.json({ message: 'Certificate template updated' });
}

export async function reissueCertificate(req: Request, res: Response) {
  const { id } = req.params;
  const { reissueReason } = req.body;
  await db('certificates').where({ id }).update({ reissue_reason: reissueReason, updated_at: new Date() });
  return res.json({ message: 'Certificate reissue recorded' });
}
