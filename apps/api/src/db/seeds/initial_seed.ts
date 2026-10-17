import type { Knex } from 'knex';
import bcrypt from 'bcryptjs';
import {
  USER_ROLES,
  INTERN_TYPES,
  TASK_STATUSES,
  TASK_PRIORITIES,
  ATTENDANCE_STATUSES,
  CERTIFICATE_LEVELS,
  AUTOMATION_KEYS,
} from '@command-center/shared';

export async function seed(knex: Knex): Promise<void> {
  // Clear tables in reverse dependency order
  const tables = [
    'notifications',
    'certificate_templates',
    'audit_logs',
    'google_calendar_tokens',
    'email_templates',
    'kudos',
    'push_subscriptions',
    'notification_preferences',
    'email_logs',
    'automations',
    'certificates',
    'marksheets',
    'level_reviews',
    'events',
    'message_reactions',
    'chat_messages',
    'channel_members',
    'chat_channels',
    'leave_requests',
    'attendance_rules',
    'attendance',
    'uploads',
    'task_parts',
    'tasks',
    'team_members',
    'teams',
    'users',
  ];

  for (const table of tables) {
    if (await knex.schema.hasTable(table)) {
      await knex(table).del();
    }
  }

  const defaultPasswordHash = await bcrypt.hash('Password123!', 10);

  // ==========================================
  // 1. OFFICIAL ADMINISTRATOR & MEMBER ROSTER
  // ==========================================

  // Primary Admin & Co-Admin
  const adminSriRamId = 'u-admin-sriram';
  const coAdminSheshiId = 'u-coadmin-sheshi';

  // Core Team (5 members)
  const coreManoharId = 'u-core-manohar';
  const coreSriVidhyaId = 'u-core-srividhya';
  const coreMahendarId = 'u-core-mahendar';
  const coreShivaId = 'u-core-shiva';
  const coreSuryaId = 'u-core-surya';

  // Unpaid Interns (4 members)
  const unpaidCherryId = 'u-unpaid-cherry';
  const unpaidAnaId = 'u-unpaid-ana';
  const unpaidNandhiniId = 'u-unpaid-nandhini';
  const unpaidJanethId = 'u-unpaid-janeth';

  await knex('users').insert([
    // Administrators (2 of 5 positions used)
    {
      id: adminSriRamId,
      name: 'Sri Ram',
      email: 'sri.ram@softwarehub2.org',
      password_hash: defaultPasswordHash,
      role: USER_ROLES.ADMIN,
      intern_type: null,
      current_level: 15,
      joining_date: '2025-01-10',
      status: 'active',
    },
    {
      id: coAdminSheshiId,
      name: 'Sheshi',
      email: 'sheshi@softwarehub2.org',
      password_hash: defaultPasswordHash,
      role: USER_ROLES.LEAD,
      intern_type: null,
      current_level: 15,
      joining_date: '2025-02-01',
      status: 'active',
    },

    // Core Team
    {
      id: coreManoharId,
      name: 'Manohar',
      email: 'manohar@softwarehub2.org',
      password_hash: defaultPasswordHash,
      role: USER_ROLES.PAID_INTERN,
      intern_type: INTERN_TYPES.PAID,
      current_level: 15,
      marksheet_percentage: 88.5,
      marksheet_confirmed: true,
      joining_date: '2025-06-15',
      status: 'active',
    },
    {
      id: coreSriVidhyaId,
      name: 'Sri Vidhya',
      email: 'sri.vidhya@softwarehub2.org',
      password_hash: defaultPasswordHash,
      role: USER_ROLES.PAID_INTERN,
      intern_type: INTERN_TYPES.PAID,
      current_level: 15,
      marksheet_percentage: 91.0,
      marksheet_confirmed: true,
      joining_date: '2025-06-15',
      status: 'active',
    },
    {
      id: coreMahendarId,
      name: 'Mahendar',
      email: 'mahendar@softwarehub2.org',
      password_hash: defaultPasswordHash,
      role: USER_ROLES.PAID_INTERN,
      intern_type: INTERN_TYPES.PAID,
      current_level: 15,
      marksheet_percentage: 84.0,
      marksheet_confirmed: true,
      joining_date: '2025-07-01',
      status: 'active',
    },
    {
      id: coreShivaId,
      name: 'Shiva',
      email: 'shiva@softwarehub2.org',
      password_hash: defaultPasswordHash,
      role: USER_ROLES.PAID_INTERN,
      intern_type: INTERN_TYPES.PAID,
      current_level: 14,
      marksheet_percentage: 82.0,
      marksheet_confirmed: true,
      joining_date: '2025-07-15',
      status: 'active',
    },
    {
      id: coreSuryaId,
      name: 'Surya',
      email: 'surya@softwarehub2.org',
      password_hash: defaultPasswordHash,
      role: USER_ROLES.PAID_INTERN,
      intern_type: INTERN_TYPES.PAID,
      current_level: 15,
      marksheet_percentage: 86.5,
      marksheet_confirmed: true,
      joining_date: '2025-08-01',
      status: 'active',
    },

    // Unpaid Interns
    {
      id: unpaidCherryId,
      name: 'Cherry',
      email: 'cherry@softwarehub2.org',
      password_hash: defaultPasswordHash,
      role: USER_ROLES.UNPAID_INTERN,
      intern_type: INTERN_TYPES.UNPAID,
      paired_paid_intern_id: coreManoharId,
      current_level: 4,
      joining_date: '2026-09-01',
      status: 'active',
    },
    {
      id: unpaidAnaId,
      name: 'Ana',
      email: 'ana@softwarehub2.org',
      password_hash: defaultPasswordHash,
      role: USER_ROLES.UNPAID_INTERN,
      intern_type: INTERN_TYPES.UNPAID,
      paired_paid_intern_id: coreSriVidhyaId,
      current_level: 3,
      joining_date: '2026-09-01',
      status: 'active',
    },
    {
      id: unpaidNandhiniId,
      name: 'Nandhini',
      email: 'nandhini@softwarehub2.org',
      password_hash: defaultPasswordHash,
      role: USER_ROLES.UNPAID_INTERN,
      intern_type: INTERN_TYPES.UNPAID,
      paired_paid_intern_id: coreMahendarId,
      current_level: 4,
      joining_date: '2026-09-15',
      status: 'active',
    },
    {
      id: unpaidJanethId,
      name: 'Janeth',
      email: 'janeth@softwarehub2.org',
      password_hash: defaultPasswordHash,
      role: USER_ROLES.UNPAID_INTERN,
      intern_type: INTERN_TYPES.UNPAID,
      paired_paid_intern_id: coreShivaId,
      current_level: 2,
      joining_date: '2026-10-01',
      status: 'active',
    },
  ]);

  // ==========================================
  // 2. OFFICIAL TEAMS & MEMBERSHIPS
  // ==========================================
  const teamCoreId = 'team-core';
  const teamUnpaidId = 'team-unpaid';

  await knex('teams').insert([
    {
      id: teamCoreId,
      name: 'Core Team',
      description: 'Senior development and engineering core operations team',
      lead_id: coAdminSheshiId,
    },
    {
      id: teamUnpaidId,
      name: 'Unpaid Interns',
      description: 'Project cohorts undergoing structured Level 1-4 technical onboarding',
      lead_id: coAdminSheshiId,
    },
  ]);

  // Team Members
  await knex('team_members').insert([
    // Core Team
    { id: 'tm-c-1', team_id: teamCoreId, user_id: coAdminSheshiId },
    { id: 'tm-c-2', team_id: teamCoreId, user_id: coreManoharId },
    { id: 'tm-c-3', team_id: teamCoreId, user_id: coreSriVidhyaId },
    { id: 'tm-c-4', team_id: teamCoreId, user_id: coreMahendarId },
    { id: 'tm-c-5', team_id: teamCoreId, user_id: coreShivaId },
    { id: 'tm-c-6', team_id: teamCoreId, user_id: coreSuryaId },

    // Unpaid Interns Team
    { id: 'tm-u-1', team_id: teamUnpaidId, user_id: coAdminSheshiId },
    { id: 'tm-u-2', team_id: teamUnpaidId, user_id: unpaidCherryId },
    { id: 'tm-u-3', team_id: teamUnpaidId, user_id: unpaidAnaId },
    { id: 'tm-u-4', team_id: teamUnpaidId, user_id: unpaidNandhiniId },
    { id: 'tm-u-5', team_id: teamUnpaidId, user_id: unpaidJanethId },
  ]);

  // ==========================================
  // 3. TASKS & REQUIRED TASK PARTS
  // ==========================================
  const task1Id = 'task-audit';
  const task2Id = 'task-guide';
  const task3Id = 'task-inventory';
  const task4Id = 'task-events';

  await knex('tasks').insert([
    {
      id: task1Id,
      task_number: 'T-140',
      title: 'Q3 University Network Security Audit',
      description: 'Audit network access points, firewall rules, and lab infrastructure across campus.',
      due_date: new Date('2026-10-25T18:00:00Z'),
      priority: TASK_PRIORITIES.HIGH,
      status: TASK_STATUSES.IN_PROGRESS,
      created_by: coAdminSheshiId,
    },
    {
      id: task2Id,
      task_number: 'T-141',
      title: 'Software Hub Onboarding & Workstation Setup Guide',
      description: 'Comprehensive setup instructions and security prerequisites for new student interns.',
      due_date: new Date('2026-10-24T18:00:00Z'),
      priority: TASK_PRIORITIES.MEDIUM,
      status: TASK_STATUSES.TO_DO,
      created_by: coAdminSheshiId,
    },
    {
      id: task3Id,
      task_number: 'T-142',
      title: 'Central Hardware & Peripheral Lab Inventory',
      description: 'Physical audit and serial barcode tracking of test devices in Lab 4.',
      due_date: new Date('2026-10-22T18:00:00Z'),
      priority: TASK_PRIORITIES.MEDIUM,
      status: TASK_STATUSES.IN_REVIEW,
      created_by: coAdminSheshiId,
    },
    {
      id: task4Id,
      task_number: 'T-143',
      title: 'University Events Portal Integration',
      description: 'Full-stack event publishing module and attendee QR badge generator.',
      due_date: new Date('2026-10-26T18:00:00Z'),
      priority: TASK_PRIORITIES.HIGH,
      status: TASK_STATUSES.IN_REVIEW,
      created_by: adminSriRamId,
    },
  ]);

  // Task Parts
  const part1Id = 'part-audit-1';
  const part2Id = 'part-audit-2';
  const part3Id = 'part-guide-1';
  const part4Id = 'part-inventory-1';
  const part5Id = 'part-events-1';

  await knex('task_parts').insert([
    {
      id: part1Id,
      task_id: task1Id,
      part_number: 1,
      total_parts: 2,
      title: 'Part 1: Switchboard & VLAN Inspection',
      assigned_intern_id: coreManoharId,
      due_date: new Date('2026-10-20T18:00:00Z'),
      status: TASK_STATUSES.DONE,
      reviewer_id: coAdminSheshiId,
      rating: 5,
      review_comment: 'Thorough inspection with clean topology diagram.',
      submitted_at: new Date('2026-10-18T10:00:00Z'),
      reviewed_at: new Date('2026-10-18T14:30:00Z'),
    },
    {
      id: part2Id,
      task_id: task1Id,
      part_number: 2,
      total_parts: 2,
      title: 'Part 2: Firewall Rule Validation & Port Scan',
      assigned_intern_id: unpaidCherryId,
      due_date: new Date('2026-10-25T18:00:00Z'),
      status: TASK_STATUSES.IN_PROGRESS,
      reviewer_id: coreManoharId,
      rating: null,
      review_comment: null,
    },
    {
      id: part3Id,
      task_id: task2Id,
      part_number: 1,
      total_parts: 1,
      title: 'Part 1: Linux & Windows Development Environment Setup',
      assigned_intern_id: unpaidAnaId,
      due_date: new Date('2026-10-24T18:00:00Z'),
      status: TASK_STATUSES.TO_DO,
      reviewer_id: coreSriVidhyaId,
    },
    {
      id: part4Id,
      task_id: task3Id,
      part_number: 1,
      total_parts: 1,
      title: 'Part 1: Lab 4 Hardware Serial Reconciliation',
      assigned_intern_id: unpaidNandhiniId,
      due_date: new Date('2026-10-22T18:00:00Z'),
      status: TASK_STATUSES.IN_REVIEW,
      reviewer_id: coreMahendarId,
      submitted_at: new Date('2026-10-16T12:00:00Z'),
    },
    {
      id: part5Id,
      task_id: task4Id,
      part_number: 1,
      total_parts: 1,
      title: 'Part 1: REST API & QR Code Verification Endpoint',
      assigned_intern_id: coreSuryaId,
      due_date: new Date('2026-10-26T18:00:00Z'),
      status: TASK_STATUSES.IN_REVIEW,
      reviewer_id: coAdminSheshiId,
      submitted_at: new Date('2026-10-16T14:00:00Z'),
    },
  ]);

  // Uploads
  await knex('uploads').insert([
    {
      id: 'up-1',
      task_part_id: part1Id,
      kind: 'file',
      url_or_path: '/uploads/network-vlan-diagram.png',
      file_name: 'network-vlan-diagram.png',
      file_size: 420000,
      mime_type: 'image/png',
      uploaded_by: coreManoharId,
      created_at: new Date('2026-10-18T09:45:00Z'),
    },
    {
      id: 'up-2',
      task_part_id: part4Id,
      kind: 'file',
      url_or_path: '/uploads/lab-inventory-sheet.xlsx',
      file_name: 'lab-inventory-sheet.xlsx',
      file_size: 95000,
      mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      uploaded_by: unpaidNandhiniId,
      created_at: new Date('2026-10-16T11:50:00Z'),
    },
  ]);

  // ==========================================
  // 4. ATTENDANCE & ATTENDANCE RULES
  // ==========================================
  await knex('attendance_rules').insert({
    id: 'rule-primary',
    office_start_time: '09:00',
    grace_minutes: 15,
    half_day_hours: 4.0,
    absent_cutoff_time: '11:00',
  });

  const today = '2026-10-16';
  await knex('attendance').insert([
    {
      id: 'att-1',
      user_id: coAdminSheshiId,
      date: today,
      check_in_time: new Date('2026-10-16T08:50:00Z'),
      status: ATTENDANCE_STATUSES.PRESENT,
    },
    {
      id: 'att-2',
      user_id: coreManoharId,
      date: today,
      check_in_time: new Date('2026-10-16T08:58:00Z'),
      status: ATTENDANCE_STATUSES.PRESENT,
    },
    {
      id: 'att-3',
      user_id: coreSriVidhyaId,
      date: today,
      check_in_time: new Date('2026-10-16T09:05:00Z'),
      status: ATTENDANCE_STATUSES.PRESENT,
    },
    {
      id: 'att-4',
      user_id: coreMahendarId,
      date: today,
      check_in_time: new Date('2026-10-16T09:20:00Z'),
      status: ATTENDANCE_STATUSES.LATE,
    },
    {
      id: 'att-5',
      user_id: unpaidCherryId,
      date: today,
      check_in_time: new Date('2026-10-16T09:00:00Z'),
      status: ATTENDANCE_STATUSES.PRESENT,
    },
    {
      id: 'att-6',
      user_id: unpaidAnaId,
      date: today,
      check_in_time: new Date('2026-10-16T09:02:00Z'),
      status: ATTENDANCE_STATUSES.PRESENT,
    },
  ]);

  // ==========================================
  // 5. CHAT CHANNELS & OFFICIAL TEAMS
  // ==========================================
  const channelAnnouncementsId = 'chan-announcements';
  const channelCoreId = 'chan-core-team';
  const channelUnpaidId = 'chan-unpaid-interns';

  await knex('chat_channels').insert([
    {
      id: channelAnnouncementsId,
      name: 'announcements',
      type: 'group',
      created_by: adminSriRamId,
    },
    {
      id: channelCoreId,
      name: 'core-team',
      type: 'team',
      team_id: teamCoreId,
      created_by: coAdminSheshiId,
    },
    {
      id: channelUnpaidId,
      name: 'unpaid-interns',
      type: 'team',
      team_id: teamUnpaidId,
      created_by: coAdminSheshiId,
    },
  ]);

  // Seed channel members
  const allUsers = [
    adminSriRamId,
    coAdminSheshiId,
    coreManoharId,
    coreSriVidhyaId,
    coreMahendarId,
    coreShivaId,
    coreSuryaId,
    unpaidCherryId,
    unpaidAnaId,
    unpaidNandhiniId,
    unpaidJanethId,
  ];

  for (const uid of allUsers) {
    await knex('channel_members').insert({
      id: `cm-ann-${uid}`,
      channel_id: channelAnnouncementsId,
      user_id: uid,
    });
  }

  // Core channel members
  const coreUsers = [coAdminSheshiId, coreManoharId, coreSriVidhyaId, coreMahendarId, coreShivaId, coreSuryaId];
  for (const uid of coreUsers) {
    await knex('channel_members').insert({
      id: `cm-core-${uid}`,
      channel_id: channelCoreId,
      user_id: uid,
    });
  }

  // Unpaid channel members
  const unpaidUsers = [coAdminSheshiId, unpaidCherryId, unpaidAnaId, unpaidNandhiniId, unpaidJanethId];
  for (const uid of unpaidUsers) {
    await knex('channel_members').insert({
      id: `cm-unpaid-${uid}`,
      channel_id: channelUnpaidId,
      user_id: uid,
    });
  }

  // Chat message in #core-team
  await knex('chat_messages').insert([
    {
      id: 'msg-core-1',
      channel_id: channelCoreId,
      sender_id: coAdminSheshiId,
      text: 'Welcome team. Review the network audit milestones and update task progress accordingly.',
      is_pinned: true,
      created_at: new Date('2026-10-16T09:15:00Z'),
    },
    {
      id: 'msg-core-2',
      channel_id: channelCoreId,
      sender_id: coreManoharId,
      text: 'Part 1 completed and diagram uploaded. Cherry is executing the port scan for Part 2.',
      is_pinned: false,
      created_at: new Date('2026-10-16T09:30:00Z'),
    },
  ]);

  // ==========================================
  // 6. CALENDAR EVENTS
  // ==========================================
  await knex('events').insert([
    {
      id: 'evt-1',
      title: 'Weekly Software Hub Operations Briefing',
      type: 'meeting',
      start_time: new Date('2026-10-19T09:30:00Z'),
      end_time: new Date('2026-10-19T10:30:00Z'),
      location: 'Command Center Conference Room A',
      description: 'Weekly alignment for Core Team and leadership review.',
      created_by: coAdminSheshiId,
      is_synced: false,
    },
    {
      id: 'evt-2',
      title: 'University Leadership & VC Review Session',
      type: 'review',
      start_time: new Date('2026-10-23T14:00:00Z'),
      end_time: new Date('2026-10-23T16:00:00Z'),
      location: 'Senate Hall / Virtual VC Suite',
      description: 'Final production assessment of Software Hub 2.0 Command Center.',
      created_by: adminSriRamId,
      is_synced: false,
    },
    {
      id: 'evt-3',
      title: 'Q3 Network Audit Submission Deadline',
      type: 'deadline',
      start_time: new Date('2026-10-25T18:00:00Z'),
      end_time: new Date('2026-10-25T18:00:00Z'),
      description: 'Mandatory completion of all required network security parts.',
      created_by: coAdminSheshiId,
      is_synced: false,
    },
  ]);

  // ==========================================
  // ==========================================
  // 7. OFFICIAL EMAIL TEMPLATES (All 16 Specified Modules)
  // ==========================================
  const emailTemplates = [
    {
      id: 'tpl-welcome-user',
      name: 'New User Welcome',
      event_type: 'welcome_user',
      subject: 'Welcome to the Central Office | Software Hub 2.0',
      body: 'Dear {{recipient_name}},\n\nWelcome to the Central Office at St. Mary’s Rehabilitation University.\n\nWe are pleased to welcome you to the Software Hub 2.0 team. We look forward to your contribution, collaboration, and professional growth as part of our community.\n\nYour details are provided below:\n\nName: {{recipient_name}}\nRole: {{recipient_role}}\nDesignation: {{recipient_designation}}\nTeam: {{team_name}}\n\nPlease sign in to the Command Center to review your responsibilities, assigned activities, important announcements, and relevant team resources.\n\nAccess your Command Center: {{login_url}}\n\nWe wish you a productive and rewarding experience with the Central Office.\n\nWarm regards,\n\nCentral Office\nSoftware Hub 2.0\nSt. Mary’s Rehabilitation University',
      available_variables: JSON.stringify(['recipient_name', 'recipient_role', 'recipient_designation', 'team_name', 'login_url']),
    },
    {
      id: 'tpl-task-assigned',
      name: 'Task Assigned',
      event_type: 'task_assigned',
      subject: 'New Task Assigned — {{task_title}}',
      body: 'Dear {{recipient_name}},\n\nA new operational task has been assigned to you in Software Hub 2.0.\n\nTask: {{task_title}}\nPriority: {{task_priority}}\nDeadline: {{task_deadline}}\nAssigned by: {{assigned_by}}\n\nPlease review your instructions and submit your work before the deadline.\n\nView Task: {{action_url}}\n\nCentral Office, Software Hub 2.0',
      available_variables: JSON.stringify(['recipient_name', 'task_title', 'task_priority', 'task_deadline', 'assigned_by', 'action_url']),
    },
    {
      id: 'tpl-task-reassigned',
      name: 'Task Reassigned',
      event_type: 'task_reassigned',
      subject: 'Task Reassigned — {{task_title}}',
      body: 'Dear {{recipient_name}},\n\nThe task "{{task_title}}" has been reassigned to you.\n\nDeadline: {{task_deadline}}\nPriority: {{task_priority}}\nPrevious Assignee: {{previous_assignee}}\nReason: {{reassign_reason}}\n\nView Task: {{action_url}}\n\nCentral Office, Software Hub 2.0',
      available_variables: JSON.stringify(['recipient_name', 'task_title', 'task_priority', 'task_deadline', 'previous_assignee', 'reassign_reason', 'action_url']),
    },
    {
      id: 'tpl-deadline-approaching',
      name: 'Task Deadline Reminder',
      event_type: 'deadline_approaching',
      subject: 'Reminder: Deadline Approaching — {{task_title}}',
      body: 'Dear {{recipient_name}},\n\nThis is a reminder that your task "{{task_title}}" is due on {{task_deadline}}.\n\nPlease ensure your deliverables and task parts are submitted on time.\n\nView Task: {{action_url}}\n\nCentral Office, Software Hub 2.0',
      available_variables: JSON.stringify(['recipient_name', 'task_title', 'task_deadline', 'action_url']),
    },
    {
      id: 'tpl-overdue-reminder',
      name: 'Overdue Task Reminder',
      event_type: 'overdue_reminder',
      subject: 'URGENT: Overdue Task — {{task_title}}',
      body: 'Dear {{recipient_name}},\n\nThe deadline for task "{{task_title}}" was {{task_deadline}} and is now marked OVERDUE.\n\nPlease upload pending deliverables immediately or reach out to your lead.\n\nView Task: {{action_url}}\n\nCentral Office, Software Hub 2.0',
      available_variables: JSON.stringify(['recipient_name', 'task_title', 'task_deadline', 'action_url']),
    },
    {
      id: 'tpl-work-submitted',
      name: 'Work Submission Received',
      event_type: 'work_submitted',
      subject: 'Deliverable Submitted — {{task_title}}',
      body: 'Dear Reviewer,\n\n{{recipient_name}} has submitted work for Part {{part_number}} of "{{task_title}}".\n\nSubmission details and attachments are ready for your review.\n\nReview Submission: {{action_url}}\n\nCentral Office, Software Hub 2.0',
      available_variables: JSON.stringify(['recipient_name', 'task_title', 'part_number', 'action_url']),
    },
    {
      id: 'tpl-work-approved',
      name: 'Work Approved',
      event_type: 'work_approved',
      subject: 'Task Approved — {{task_title}}',
      body: 'Dear {{recipient_name}},\n\nCongratulations! Your submission for "{{task_title}}" has been approved by {{reviewer_name}}.\n\nRating: {{rating}}/5\nComments: {{review_comment}}\n\nView Details: {{action_url}}\n\nCentral Office, Software Hub 2.0',
      available_variables: JSON.stringify(['recipient_name', 'task_title', 'reviewer_name', 'rating', 'review_comment', 'action_url']),
    },
    {
      id: 'tpl-work-rejected',
      name: 'Changes Requested / Work Rejected',
      event_type: 'work_rejected',
      subject: 'Revision Requested — {{task_title}}',
      body: 'Dear {{recipient_name}},\n\nYour submission for "{{task_title}}" requires revisions before it can be accepted.\n\nReviewer Feedback: {{review_comment}}\n\nPlease make the requested updates and re-submit.\n\nView Task: {{action_url}}\n\nCentral Office, Software Hub 2.0',
      available_variables: JSON.stringify(['recipient_name', 'task_title', 'review_comment', 'action_url']),
    },
    {
      id: 'tpl-leave-received',
      name: 'Leave Application Received',
      event_type: 'leave_received',
      subject: 'New Leave Request Received — {{applicant_name}}',
      body: 'Dear Admin/Co-Admin,\n\nA new leave request has been submitted for your review.\n\nApplicant: {{applicant_name}}\nCategory: {{leave_category}}\nPeriod: {{leave_start_date}} to {{leave_end_date}}\nReason: {{reason}}\n\nPlease review in the Central Office Approval Inbox: {{action_url}}\n\nCentral Office, Software Hub 2.0',
      available_variables: JSON.stringify(['applicant_name', 'leave_category', 'leave_start_date', 'leave_end_date', 'reason', 'action_url']),
    },
    {
      id: 'tpl-leave-approved',
      name: 'Leave Approved',
      event_type: 'leave_approved',
      subject: 'Leave Request Approved — Central Office',
      body: 'Dear {{recipient_name}},\n\nYour request for {{leave_category}} from {{leave_start_date}} to {{leave_end_date}} has been APPROVED.\n\nReviewer: {{reviewer_name}}\nNotes: {{review_comment}}\n\nCentral Office, Software Hub 2.0',
      available_variables: JSON.stringify(['recipient_name', 'leave_category', 'leave_start_date', 'leave_end_date', 'reviewer_name', 'review_comment']),
    },
    {
      id: 'tpl-leave-rejected',
      name: 'Leave Rejected',
      event_type: 'leave_rejected',
      subject: 'Leave Request Update — Central Office',
      body: 'Dear {{recipient_name}},\n\nYour request for {{leave_category}} from {{leave_start_date}} to {{leave_end_date}} could not be approved at this time.\n\nReason/Comments: {{review_comment}}\n\nCentral Office, Software Hub 2.0',
      available_variables: JSON.stringify(['recipient_name', 'leave_category', 'leave_start_date', 'leave_end_date', 'review_comment']),
    },
    {
      id: 'tpl-leave-more-info',
      name: 'Leave More Info Needed',
      event_type: 'leave_more_info',
      subject: 'Additional Information Required: Leave Request',
      body: 'Dear {{recipient_name}},\n\nAdditional information or documentation is required for your leave request for {{leave_start_date}} to {{leave_end_date}}.\n\nReviewer Note: {{review_comment}}\n\nPlease update your request in the Command Center: {{action_url}}\n\nCentral Office, Software Hub 2.0',
      available_variables: JSON.stringify(['recipient_name', 'leave_start_date', 'leave_end_date', 'review_comment', 'action_url']),
    },
    {
      id: 'tpl-level-promotion',
      name: 'Level Promotion Approved',
      event_type: 'level_promotion_approved',
      subject: 'Congratulations on Your Level Promotion! | Software Hub 2.0',
      body: 'Dear {{recipient_name}},\n\nWe are pleased to inform you that your progression to Level {{new_level}} has been officially APPROVED by Central Office administration.\n\nPrevious Level: Level {{previous_level}}\nNew Level: Level {{new_level}}\nApproved by: {{approver_name}}\n\nThank you for your continuous dedication and excellence.\n\nCentral Office, Software Hub 2.0',
      available_variables: JSON.stringify(['recipient_name', 'previous_level', 'new_level', 'approver_name', 'action_url']),
    },
    {
      id: 'tpl-cert-issued',
      name: 'Certificate Issued',
      event_type: 'certificate_issued',
      subject: 'Official Internship Certificate Issued — {{certificate_number}}',
      body: 'Dear {{recipient_name}},\n\nCongratulations! Your official Internship Certificate ({{certificate_number}}) from the Central Office at St. Mary’s Rehabilitation University has been issued.\n\nLevel: Level {{certificate_level}}\nIssue Date: {{issue_date}}\nVerification Link: {{verification_url}}\n\nYou can download the authenticated PDF from your Command Center dashboard.\n\nCentral Office, Software Hub 2.0\nSt. Mary’s Rehabilitation University',
      available_variables: JSON.stringify(['recipient_name', 'certificate_number', 'certificate_level', 'issue_date', 'verification_url']),
    },
    {
      id: 'tpl-calendar-invitation',
      name: 'Calendar Event Invitation and Reminder',
      event_type: 'calendar_invitation',
      subject: 'Calendar Invitation — {{event_title}}',
      body: 'Dear {{recipient_name}},\n\nYou are invited to an upcoming Central Office event:\n\nEvent: {{event_title}}\nDate: {{event_date}}\nTime: {{event_time}}\nLocation: {{event_location}}\n\nView Calendar: {{action_url}}\n\nCentral Office, Software Hub 2.0',
      available_variables: JSON.stringify(['recipient_name', 'event_title', 'event_date', 'event_time', 'event_location', 'action_url']),
    },
    {
      id: 'tpl-admin-announcement',
      name: 'Administrative Announcement',
      event_type: 'admin_announcement',
      subject: 'Important Announcement — Central Office',
      body: 'Attention Central Office Members,\n\n{{announcement_headline}}\n\n{{announcement_body}}\n\nPlease review this announcement in your Command Center: {{action_url}}\n\nCentral Office Administration\nSoftware Hub 2.0',
      available_variables: JSON.stringify(['announcement_headline', 'announcement_body', 'action_url']),
    },
  ];

  for (const tpl of emailTemplates) {
    await knex('email_templates').insert(tpl);
  }

  // ==========================================
  // 7B. OFFICIAL CERTIFICATE TEMPLATES (Paid & Unpaid)
  // ==========================================
  await knex('certificate_templates').insert([
    {
      id: 'tpl-cert-paid',
      category: 'paid',
      title: 'Paid Intern Certificate (Central Office Modern Design)',
      background_image_path: '/assets/cert_paid_template.jpg',
      min_attendance_percentage: 90.0,
      min_marksheet_percentage: 85.0,
      min_level: 15,
      authorized_signatory: 'Director, Central Office, St. Mary’s Rehabilitation University',
      is_active: true,
      field_coordinates: JSON.stringify({
        recipient_name: { x: 50, y: 46, fontSize: 24, font: 'Helvetica-Bold', color: '#0f172a' },
        designation: { x: 25, y: 76, fontSize: 11, font: 'Helvetica', color: '#1e293b' },
        level: { x: 65, y: 76, fontSize: 11, font: 'Helvetica', color: '#1e293b' },
        internship_period: { x: 25, y: 82, fontSize: 11, font: 'Helvetica', color: '#1e293b' },
        date_of_issue: { x: 65, y: 82, fontSize: 11, font: 'Helvetica', color: '#1e293b' },
        authorized_signatory: { x: 25, y: 88, fontSize: 11, font: 'Helvetica-Bold', color: '#0f172a' },
      }),
    },
    {
      id: 'tpl-cert-unpaid',
      category: 'unpaid',
      title: 'Unpaid Intern Certificate (Central Office Classic Gold Design)',
      background_image_path: '/assets/cert_unpaid_template.jpg',
      min_attendance_percentage: 85.0,
      min_marksheet_percentage: 75.0,
      min_level: 4,
      authorized_signatory: 'Director, Central Office, St. Mary’s Rehabilitation University',
      is_active: true,
      field_coordinates: JSON.stringify({
        recipient_name: { x: 50, y: 47, fontSize: 24, font: 'Helvetica-Bold', color: '#0f172a' },
        designation: { x: 25, y: 72, fontSize: 11, font: 'Helvetica', color: '#1e293b' },
        level: { x: 65, y: 72, fontSize: 11, font: 'Helvetica', color: '#1e293b' },
        internship_period: { x: 25, y: 77, fontSize: 11, font: 'Helvetica', color: '#1e293b' },
        date_of_issue: { x: 25, y: 82, fontSize: 11, font: 'Helvetica', color: '#1e293b' },
        authorized_signatory: { x: 25, y: 87, fontSize: 11, font: 'Helvetica-Bold', color: '#0f172a' },
      }),
    },
  ]);


  // ==========================================
  // 8. AUDIT LOGS (Section 1)
  // ==========================================
  await knex('audit_logs').insert([
    {
      id: 'audit-init-1',
      user_id: adminSriRamId,
      user_name: 'Sri Ram',
      action: 'ADMIN_ROSTER_INITIALIZED',
      resource_type: 'SYSTEM',
      resource_id: 'SYSTEM',
      details: JSON.stringify({
        message: 'Official administrator structure initialized with 5-admin maximum limit enforced.',
        activeAdmins: ['Sri Ram (Primary Admin)', 'Sheshi (Co-Admin)'],
        availablePositions: 3,
      }),
      created_at: new Date('2026-10-16T08:00:00Z'),
    },
    {
      id: 'audit-init-2',
      user_id: coAdminSheshiId,
      user_name: 'Sheshi',
      action: 'TEAM_ROSTER_CONFIGURED',
      resource_type: 'TEAM',
      resource_id: teamCoreId,
      details: JSON.stringify({
        message: 'Configured Core Team (Manohar, Sri Vidhya, Mahendar, Shiva, Surya) and Unpaid Interns (Cherry, Ana, Nandhini, Janeth).',
      }),
      created_at: new Date('2026-10-16T08:15:00Z'),
    },
  ]);

  // ==========================================
  // 9. AUTOMATIONS (Section 8)
  // ==========================================
  await knex('automations').insert([
    {
      id: 'auto-1',
      key: AUTOMATION_KEYS.WELCOME_EMAIL,
      name: 'Welcome email',
      trigger_event: 'Admin creates an intern',
      recipient_description: 'New intern',
      channel: 'email',
      is_enabled: true,
      email_subject_template: 'Welcome to Software Hub 2.0 Command Center',
      email_body_template: 'Hi {intern_name},\n\nWelcome to Command Center! Your official account has been configured.',
    },
    {
      id: 'auto-2',
      key: AUTOMATION_KEYS.NEW_TASK_ASSIGNED,
      name: 'New task or part assigned',
      trigger_event: 'Straight away',
      recipient_description: 'Assignee',
      channel: 'both',
      is_enabled: true,
      email_subject_template: 'New task: {task_title}',
      email_body_template: 'Hi {intern_name},\n\n{assigner_name} assigned you Part {part_number} of {task_title}.\nDue: {due_date}',
    },
    {
      id: 'auto-3',
      key: AUTOMATION_KEYS.DUE_TOMORROW,
      name: 'Due tomorrow',
      trigger_event: 'Daily at 09:00',
      schedule_cron: '0 9 * * *',
      recipient_description: 'Assignee',
      channel: 'both',
      is_enabled: true,
      email_subject_template: 'Reminder: Task part due tomorrow',
      email_body_template: 'Hi {intern_name},\n\nYour task part "{part_title}" is due tomorrow at {due_date}.',
    },
    {
      id: 'auto-4',
      key: AUTOMATION_KEYS.OVERDUE_REMINDER,
      name: 'Overdue reminder',
      trigger_event: 'Daily at 10:00',
      schedule_cron: '0 10 * * *',
      recipient_description: 'Assignee and leader',
      channel: 'both',
      is_enabled: true,
      email_subject_template: 'URGENT: Task part overdue',
      email_body_template: 'Hi {intern_name},\n\nYour task part "{part_title}" is past due ({due_date}). Please upload your work.',
    },
    {
      id: 'auto-5',
      key: AUTOMATION_KEYS.WORK_SUBMITTED,
      name: 'Work submitted',
      trigger_event: 'Straight away',
      recipient_description: 'Reviewer',
      channel: 'push',
      is_enabled: true,
      email_subject_template: 'Deliverable ready for review: {part_title}',
      email_body_template: '{intern_name} submitted work for Part {part_number} of {task_title}. Please review.',
    },
    {
      id: 'auto-6',
      key: AUTOMATION_KEYS.REVIEWED_OR_SENT_BACK,
      name: 'Reviewed or sent back',
      trigger_event: 'Straight away',
      recipient_description: 'Assignee',
      channel: 'both',
      is_enabled: true,
      email_subject_template: 'Your submission has been reviewed: {part_title}',
      email_body_template: 'Hi {intern_name},\n\nYour submission was {review_status}. Comments: {review_comment}',
    },
    {
      id: 'auto-7',
      key: AUTOMATION_KEYS.NOT_CHECKED_IN,
      name: 'Not checked in',
      trigger_event: 'Daily at 10:00',
      schedule_cron: '0 10 * * *',
      recipient_description: 'Intern, list to leader',
      channel: 'push',
      is_enabled: true,
      email_subject_template: 'Attendance notice: Not checked in',
      email_body_template: 'Hi {intern_name},\n\nYou have not checked in today as of 10:00 AM.',
    },
    {
      id: 'auto-8',
      key: AUTOMATION_KEYS.MONTH_END_LEVEL_REVIEW,
      name: 'Month-end level review',
      trigger_event: '3 days before month end',
      recipient_description: 'Leaders and admin',
      channel: 'both',
      is_enabled: true,
      email_subject_template: 'Upcoming Month-End Level Reviews',
      email_body_template: 'Leaders and Admin:\n\nMonth-end reviews begin in 3 days. Please review submitted intern work.',
    },
    {
      id: 'auto-9',
      key: AUTOMATION_KEYS.WEEKLY_SUMMARY,
      name: 'Weekly summary',
      trigger_event: 'Monday at 09:00',
      schedule_cron: '0 9 * * 1',
      recipient_description: 'Leaders and admin',
      channel: 'both',
      is_enabled: true,
      email_subject_template: 'Software Hub 2.0 Weekly Operations Summary',
      email_body_template: 'Team leadership summary: active tasks, attendance % and items awaiting review.',
    },
    {
      id: 'auto-10',
      key: AUTOMATION_KEYS.CERTIFICATE_ISSUED,
      name: 'Certificate issued',
      trigger_event: 'Straight away',
      recipient_description: 'Intern, PDF attached',
      channel: 'email',
      is_enabled: true,
      email_subject_template: 'Congratulations! Your Software Hub 2.0 Certificate is Ready',
      email_body_template: 'Hi {intern_name},\n\nYour Level {certificate_level} certificate ({certificate_number}) has been issued.',
    },
  ]);

  // ==========================================
  // 13. CERTIFICATES (Official Roster)
  // ==========================================
  await knex('certificates').insert([
    {
      id: 'cert-1',
      certificate_number: 'SH2-L2-0007',
      user_id: coreManoharId,
      level: 2,
      template_id: 'tpl-cert-paid',
      category: 'paid',
      issue_date: '2026-03-15',
      status: 'issued',
      qr_code_data: 'https://softwarehub2.org/verify/SH2-L2-0007',
      attendance_percentage: 95.0,
      tasks_completed: 48,
      issued_by: adminSriRamId,
    },
    {
      id: 'cert-2',
      certificate_number: 'SH2-L1-0031',
      user_id: unpaidCherryId,
      level: 1,
      template_id: 'tpl-cert-unpaid',
      category: 'unpaid',
      issue_date: '2026-02-28',
      status: 'issued',
      qr_code_data: 'https://softwarehub2.org/verify/SH2-L1-0031',
      attendance_percentage: 92.5,
      tasks_completed: 24,
      issued_by: adminSriRamId,
    },
    {
      id: 'cert-3',
      certificate_number: 'SH2-L2-0008',
      user_id: coreSriVidhyaId,
      level: 2,
      template_id: 'tpl-cert-paid',
      category: 'paid',
      issue_date: '2026-03-20',
      status: 'issued',
      qr_code_data: 'https://softwarehub2.org/verify/SH2-L2-0008',
      attendance_percentage: 96.0,
      tasks_completed: 52,
      issued_by: adminSriRamId,
    },
    {
      id: 'cert-4',
      certificate_number: 'SH2-L1-0032',
      user_id: unpaidNandhiniId,
      level: 1,
      template_id: 'tpl-cert-unpaid',
      category: 'unpaid',
      issue_date: '2026-03-01',
      status: 'issued',
      qr_code_data: 'https://softwarehub2.org/verify/SH2-L1-0032',
      attendance_percentage: 91.0,
      tasks_completed: 22,
      issued_by: adminSriRamId,
    },
  ]);
}

