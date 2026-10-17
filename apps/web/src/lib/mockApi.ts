import { USER_ROLES } from '@command-center/shared';

export interface MockUser {
  id: string;
  name: string;
  email: string;
  role: string;
  currentLevel: number;
  marksheetConfirmed: boolean;
  marksheetPercentage: number;
  internType?: 'paid' | 'unpaid' | null;
  attendancePercentage?: number;
  pairedPaidInternId?: string | null;
  pairedPaidInternName?: string | null;
}

export const INITIAL_USERS: MockUser[] = [
  {
    id: 'u-admin-sriram',
    name: 'Sri Ram',
    email: 'sri.ram@softwarehub2.org',
    role: USER_ROLES.ADMIN,
    currentLevel: 15,
    marksheetConfirmed: true,
    marksheetPercentage: 98,
    internType: null,
    attendancePercentage: 100,
  },
  {
    id: 'u-lead-sheshi',
    name: 'Sheshi',
    email: 'sheshi@softwarehub2.org',
    role: USER_ROLES.LEAD,
    currentLevel: 15,
    marksheetConfirmed: true,
    marksheetPercentage: 96,
    internType: null,
    attendancePercentage: 98,
  },
  {
    id: 'u-core-manohar',
    name: 'Manohar',
    email: 'manohar@softwarehub2.org',
    role: USER_ROLES.PAID_INTERN,
    currentLevel: 2,
    marksheetConfirmed: true,
    marksheetPercentage: 92,
    internType: 'paid',
    attendancePercentage: 96,
  },
  {
    id: 'u-core-srividhya',
    name: 'Sri Vidhya',
    email: 'sri.vidhya@softwarehub2.org',
    role: USER_ROLES.PAID_INTERN,
    currentLevel: 2,
    marksheetConfirmed: true,
    marksheetPercentage: 90,
    internType: 'paid',
    attendancePercentage: 94,
  },
  {
    id: 'u-core-mahendar',
    name: 'Mahendar',
    email: 'mahendar@softwarehub2.org',
    role: USER_ROLES.PAID_INTERN,
    currentLevel: 2,
    marksheetConfirmed: true,
    marksheetPercentage: 88,
    internType: 'paid',
    attendancePercentage: 92,
  },
  {
    id: 'u-core-shiva',
    name: 'Shiva',
    email: 'shiva@softwarehub2.org',
    role: USER_ROLES.PAID_INTERN,
    currentLevel: 2,
    marksheetConfirmed: true,
    marksheetPercentage: 89,
    internType: 'paid',
    attendancePercentage: 93,
  },
  {
    id: 'u-core-surya',
    name: 'Surya',
    email: 'surya@softwarehub2.org',
    role: USER_ROLES.PAID_INTERN,
    currentLevel: 2,
    marksheetConfirmed: true,
    marksheetPercentage: 87,
    internType: 'paid',
    attendancePercentage: 91,
  },
  {
    id: 'u-unpaid-cherry',
    name: 'Cherry',
    email: 'cherry@softwarehub2.org',
    role: USER_ROLES.UNPAID_INTERN,
    currentLevel: 1,
    marksheetConfirmed: false,
    marksheetPercentage: 74,
    internType: 'unpaid',
    attendancePercentage: 92.5,
    pairedPaidInternId: 'u-core-manohar',
    pairedPaidInternName: 'Manohar',
  },
  {
    id: 'u-unpaid-ana',
    name: 'Ana',
    email: 'ana@softwarehub2.org',
    role: USER_ROLES.UNPAID_INTERN,
    currentLevel: 1,
    marksheetConfirmed: false,
    marksheetPercentage: 72,
    internType: 'unpaid',
    attendancePercentage: 88,
    pairedPaidInternId: 'u-core-srividhya',
    pairedPaidInternName: 'Sri Vidhya',
  },
  {
    id: 'u-unpaid-nandhini',
    name: 'Nandhini',
    email: 'nandhini@softwarehub2.org',
    role: USER_ROLES.UNPAID_INTERN,
    currentLevel: 1,
    marksheetConfirmed: false,
    marksheetPercentage: 75,
    internType: 'unpaid',
    attendancePercentage: 90,
    pairedPaidInternId: 'u-core-mahendar',
    pairedPaidInternName: 'Mahendar',
  },
  {
    id: 'u-unpaid-janeth',
    name: 'Janeth',
    email: 'janeth@softwarehub2.org',
    role: USER_ROLES.UNPAID_INTERN,
    currentLevel: 1,
    marksheetConfirmed: false,
    marksheetPercentage: 71,
    internType: 'unpaid',
    attendancePercentage: 86,
    pairedPaidInternId: 'u-core-shiva',
    pairedPaidInternName: 'Shiva',
  },
];

export const INITIAL_TEMPLATES = [
  {
    id: 'tpl-cert-paid',
    category: 'paid',
    title: 'Paid Intern Certificate (Central Office Modern Design)',
    background_image_path: '/Command-center-cc/assets/cert_paid_template.jpg',
    min_attendance_percentage: 90.0,
    min_marksheet_percentage: 85.0,
    min_level: 2,
    authorized_signatory: 'Director, Central Office, St. Mary’s Rehabilitation University',
    is_active: true,
  },
  {
    id: 'tpl-cert-unpaid',
    category: 'unpaid',
    title: 'Unpaid Intern Certificate (Central Office Classic Gold Design)',
    background_image_path: '/Command-center-cc/assets/cert_unpaid_template.jpg',
    min_attendance_percentage: 85.0,
    min_marksheet_percentage: 75.0,
    min_level: 1,
    authorized_signatory: 'Director, Central Office, St. Mary’s Rehabilitation University',
    is_active: true,
  },
];

export const INITIAL_CERTIFICATES = [
  {
    id: 'cert-001',
    certificateNumber: 'SH2-L2-0007',
    userId: 'u-core-manohar',
    userName: 'Manohar',
    userEmail: 'manohar@softwarehub2.org',
    level: 2,
    category: 'paid',
    templateTitle: 'Paid Intern Certificate (Central Office Modern Design)',
    issueDate: '15 Mar 2026',
    status: 'issued',
    qrCodeData: 'https://softwarehub2.org/verify/SH2-L2-0007',
    attendancePercentage: 96,
    tasksCompleted: 48,
    issuedByName: 'Sri Ram',
    marksheetPercentage: 92,
  },
  {
    id: 'cert-002',
    certificateNumber: 'SH2-L1-0031',
    userId: 'u-unpaid-cherry',
    userName: 'Cherry',
    userEmail: 'cherry@softwarehub2.org',
    level: 1,
    category: 'unpaid',
    templateTitle: 'Unpaid Intern Certificate (Central Office Classic Gold Design)',
    issueDate: '28 Feb 2026',
    status: 'issued',
    qrCodeData: 'https://softwarehub2.org/verify/SH2-L1-0031',
    attendancePercentage: 92.5,
    tasksCompleted: 24,
    issuedByName: 'Sri Ram',
    marksheetPercentage: 74,
  },
  {
    id: 'cert-003',
    certificateNumber: 'SH2-L2-0008',
    userId: 'u-core-srividhya',
    userName: 'Sri Vidhya',
    userEmail: 'sri.vidhya@softwarehub2.org',
    level: 2,
    category: 'paid',
    templateTitle: 'Paid Intern Certificate (Central Office Modern Design)',
    issueDate: '16 Mar 2026',
    status: 'issued',
    qrCodeData: 'https://softwarehub2.org/verify/SH2-L2-0008',
    attendancePercentage: 94,
    tasksCompleted: 46,
    issuedByName: 'Sri Ram',
    marksheetPercentage: 90,
  },
  {
    id: 'cert-004',
    certificateNumber: 'SH2-L1-0032',
    userId: 'u-unpaid-nandhini',
    userName: 'Nandhini',
    userEmail: 'nandhini@softwarehub2.org',
    level: 1,
    category: 'unpaid',
    templateTitle: 'Unpaid Intern Certificate (Central Office Classic Gold Design)',
    issueDate: '01 Mar 2026',
    status: 'issued',
    qrCodeData: 'https://softwarehub2.org/verify/SH2-L1-0032',
    attendancePercentage: 90,
    tasksCompleted: 22,
    issuedByName: 'Sri Ram',
    marksheetPercentage: 75,
  },
];

export const INITIAL_TASKS = [
  {
    id: 'task-1',
    taskNumber: 'TASK-001',
    title: 'University Geofence & Check-In Validation Engine',
    description: 'Implement Haversine radius validation with St. Mary’s University coordinates (17.3850, 78.4867).',
    dueDate: '2026-10-25',
    priority: 'high',
    status: 'in_progress',
    createdBy: 'u-admin-sriram',
    creatorName: 'Sri Ram',
    createdAt: '2026-10-10T09:00:00.000Z',
    parts: [
      {
        id: 'tp-1-1',
        taskId: 'task-1',
        partNumber: 1,
        totalParts: 2,
        title: 'Part 1: Geofence algorithm & device location validation',
        assignedInternId: 'u-core-manohar',
        assignedInternName: 'Manohar',
        assignedInternType: 'paid',
        dueDate: '2026-10-22',
        status: 'done',
        reviewerId: 'u-admin-sriram',
        reviewerName: 'Sri Ram',
        rating: 5,
        reviewComment: 'Accurate boundary logic with full test coverage.',
        submittedAt: '2026-10-15T14:30:00.000Z',
        reviewedAt: '2026-10-15T16:00:00.000Z',
      },
      {
        id: 'tp-1-2',
        taskId: 'task-1',
        partNumber: 2,
        totalParts: 2,
        title: 'Part 2: Auto late check-in marking and audit logging',
        assignedInternId: 'u-unpaid-cherry',
        assignedInternName: 'Cherry',
        assignedInternType: 'unpaid',
        dueDate: '2026-10-25',
        status: 'in_progress',
        reviewerId: 'u-lead-sheshi',
        reviewerName: 'Sheshi',
        rating: null,
        reviewComment: null,
        submittedAt: null,
        reviewedAt: null,
      },
    ],
  },
  {
    id: 'task-2',
    taskNumber: 'TASK-002',
    title: 'Certificate Verification QR Code & Dynamic PDF Generation',
    description: 'Integrate SVG/Canvas QR codes and PDFKit template rendering for both Paid and Unpaid credential templates.',
    dueDate: '2026-10-28',
    priority: 'urgent',
    status: 'in_progress',
    createdBy: 'u-lead-sheshi',
    creatorName: 'Sheshi',
    createdAt: '2026-10-12T10:00:00.000Z',
    parts: [
      {
        id: 'tp-2-1',
        taskId: 'task-2',
        partNumber: 1,
        totalParts: 2,
        title: 'Part 1: SVG QR Code generator with SHA-256 verification token',
        assignedInternId: 'u-core-srividhya',
        assignedInternName: 'Sri Vidhya',
        assignedInternType: 'paid',
        dueDate: '2026-10-24',
        status: 'under_review',
        reviewerId: 'u-admin-sriram',
        reviewerName: 'Sri Ram',
        rating: null,
        reviewComment: null,
        submittedAt: '2026-10-16T18:00:00.000Z',
        reviewedAt: null,
      },
      {
        id: 'tp-2-2',
        taskId: 'task-2',
        partNumber: 2,
        totalParts: 2,
        title: 'Part 2: Public verification screen layout with security badges',
        assignedInternId: 'u-unpaid-ana',
        assignedInternName: 'Ana',
        assignedInternType: 'unpaid',
        dueDate: '2026-10-28',
        status: 'assigned',
        reviewerId: 'u-lead-sheshi',
        reviewerName: 'Sheshi',
        rating: null,
        reviewComment: null,
        submittedAt: null,
        reviewedAt: null,
      },
    ],
  },
  {
    id: 'task-3',
    taskNumber: 'TASK-003',
    title: 'Executive Admin Allocation Enforcer (5 Accounts Maximum)',
    description: 'Ensure central office DB trigger and API constraints strictly limit active administrator accounts to 5.',
    dueDate: '2026-10-30',
    priority: 'medium',
    status: 'done',
    createdBy: 'u-admin-sriram',
    creatorName: 'Sri Ram',
    createdAt: '2026-10-08T08:00:00.000Z',
    parts: [
      {
        id: 'tp-3-1',
        taskId: 'task-3',
        partNumber: 1,
        totalParts: 1,
        title: 'Part 1: Database constraint and API middleware checks',
        assignedInternId: 'u-core-mahendar',
        assignedInternName: 'Mahendar',
        assignedInternType: 'paid',
        dueDate: '2026-10-14',
        status: 'done',
        reviewerId: 'u-admin-sriram',
        reviewerName: 'Sri Ram',
        rating: 5,
        reviewComment: 'Hard boundary verified across all user creation routes.',
        submittedAt: '2026-10-13T17:00:00.000Z',
        reviewedAt: '2026-10-14T09:00:00.000Z',
      },
    ],
  },
];

export const INITIAL_EMAIL_TEMPLATES = [
  {
    id: 'etpl-1',
    event_type: 'welcome_user',
    name: 'Official Institutional Welcome',
    category: 'onboarding',
    subject: 'Welcome to Software Hub 2.0 Command Center — Institutional Credential',
    body: 'Dear {{user_name}},\n\nWelcome to Software Hub 2.0 Central Office at St. Mary’s Rehabilitation University. Your account has been provisioned under the {{user_role}} track.\n\nPlease log in to access your daily tasks, attendance check-in, and team communication.\n\nCentral Office Administration',
    available_variables: ['user_name', 'user_email', 'user_role', 'login_url'],
    is_enabled: true,
  },
  {
    id: 'etpl-2',
    event_type: 'task_assigned',
    name: 'Sprint Task Assignment',
    category: 'tasks',
    subject: 'New Task Assignment: {{task_number}} — {{task_title}}',
    body: 'Hello {{intern_name}},\n\nA new sprint task {{task_number}} ({{task_title}}) has been assigned to you by {{assigner_name}}.\n\nDeadline: {{due_date}}\nPriority: {{priority}}',
    available_variables: ['intern_name', 'task_number', 'task_title', 'due_date', 'assigner_name', 'priority'],
    is_enabled: true,
  },
  {
    id: 'etpl-3',
    event_type: 'task_reassigned',
    name: 'Task Reassignment Notice',
    category: 'tasks',
    subject: 'Task Reassigned: {{task_number}} — {{task_title}}',
    body: 'Hello {{intern_name}},\n\nTask {{task_number}} has been reassigned to you by {{assigner_name}}.\nReason: {{reassign_reason}}',
    available_variables: ['intern_name', 'task_number', 'task_title', 'assigner_name', 'reassign_reason'],
    is_enabled: true,
  },
  {
    id: 'etpl-4',
    event_type: 'deadline_approaching',
    name: 'Deadline Approaching Reminder',
    category: 'tasks',
    subject: 'Reminder: Task {{task_number}} Due in 24 Hours',
    body: 'Hello {{intern_name}},\n\nYour assigned deliverable {{task_number}} is due on {{due_date}}.\nPlease submit your pull request and mark for review.',
    available_variables: ['intern_name', 'task_number', 'task_title', 'due_date'],
    is_enabled: true,
  },
  {
    id: 'etpl-5',
    event_type: 'overdue_reminder',
    name: 'Overdue Task Notice',
    category: 'tasks',
    subject: 'Urgent: Task {{task_number}} is Overdue',
    body: 'Attention {{intern_name}},\n\nTask {{task_number}} ({{task_title}}) has passed its deadline of {{due_date}}. Please submit immediately.',
    available_variables: ['intern_name', 'task_number', 'task_title', 'due_date'],
    is_enabled: true,
  },
  {
    id: 'etpl-6',
    event_type: 'work_submitted',
    name: 'Work Submitted for Review',
    category: 'tasks',
    subject: 'Review Requested: Task {{task_number}} by {{intern_name}}',
    body: 'Lead / Administrator,\n\n{{intern_name}} has submitted work for task {{task_number}}.\nPR Link: {{submission_url}}',
    available_variables: ['intern_name', 'task_number', 'task_title', 'submission_url'],
    is_enabled: true,
  },
  {
    id: 'etpl-7',
    event_type: 'work_approved',
    name: 'Work Approved by Lead',
    category: 'tasks',
    subject: 'Work Approved: Task {{task_number}}',
    body: 'Congratulations {{intern_name}},\n\nYour submission for task {{task_number}} has been reviewed and approved by {{reviewer_name}}.\nFeedback: {{reviewer_comment}}',
    available_variables: ['intern_name', 'task_number', 'task_title', 'reviewer_name', 'reviewer_comment'],
    is_enabled: true,
  },
  {
    id: 'etpl-8',
    event_type: 'work_rejected',
    name: 'Work Revision Required',
    category: 'tasks',
    subject: 'Revision Requested: Task {{task_number}}',
    body: 'Hello {{intern_name}},\n\nYour submission for task {{task_number}} requires revisions before approval.\nComments: {{review_comments}}',
    available_variables: ['intern_name', 'task_number', 'task_title', 'review_comments'],
    is_enabled: true,
  },
  {
    id: 'etpl-9',
    event_type: 'leave_received',
    name: 'Leave Application Received',
    category: 'attendance',
    subject: 'Leave Application Submitted: {{applicant_name}} ({{leave_category}})',
    body: 'Central Office Administrator,\n\nA new leave request has been submitted by {{applicant_name}}.\nCategory: {{leave_category}}\nPeriod: {{leave_start_date}} to {{leave_end_date}}\nReason: {{reason}}',
    available_variables: ['applicant_name', 'leave_category', 'leave_start_date', 'leave_end_date', 'reason'],
    is_enabled: true,
  },
  {
    id: 'etpl-10',
    event_type: 'leave_approved',
    name: 'Leave Application Approved',
    category: 'attendance',
    subject: 'Leave Request Approved: {{leave_start_date}} to {{leave_end_date}}',
    body: 'Dear {{applicant_name}},\n\nYour leave request for {{leave_category}} has been formally approved by the Central Office.\nRemarks: {{review_comment}}',
    available_variables: ['applicant_name', 'leave_category', 'leave_start_date', 'leave_end_date', 'review_comment'],
    is_enabled: true,
  },
  {
    id: 'etpl-11',
    event_type: 'leave_rejected',
    name: 'Leave Application Declined',
    category: 'attendance',
    subject: 'Leave Request Declined: {{leave_start_date}}',
    body: 'Dear {{applicant_name}},\n\nYour leave application could not be accommodated.\nReason: {{review_comment}}',
    available_variables: ['applicant_name', 'leave_category', 'leave_start_date', 'leave_end_date', 'review_comment'],
    is_enabled: true,
  },
  {
    id: 'etpl-12',
    event_type: 'leave_more_info',
    name: 'Leave More Info Requested',
    category: 'attendance',
    subject: 'Information Requested on Leave Application',
    body: 'Dear {{applicant_name}},\n\nAdditional information is requested regarding your leave application.\nDetails required: {{review_comment}}',
    available_variables: ['applicant_name', 'leave_category', 'review_comment'],
    is_enabled: true,
  },
  {
    id: 'etpl-13',
    event_type: 'level_promotion_approved',
    name: 'Intern Level Promotion Confirmed',
    category: 'levels',
    subject: 'Congratulations! Level {{new_level}} Promotion Confirmed',
    body: 'Dear {{intern_name}},\n\nCentral Office has approved your progression to Level {{new_level}} ({{role_title}}).\nAuthorized by: {{promoter_name}}',
    available_variables: ['intern_name', 'previous_level', 'new_level', 'role_title', 'promoter_name'],
    is_enabled: true,
  },
  {
    id: 'etpl-14',
    event_type: 'certificate_issued',
    name: 'Institutional Certificate Issued',
    category: 'levels',
    subject: 'Official Credential Issued: {{certificate_number}}',
    body: 'Dear {{intern_name}},\n\nYour official certificate ({{certificate_number}}) has been certified by St. Mary’s Rehabilitation University.\nVerify online at: {{verification_link}}',
    available_variables: ['intern_name', 'certificate_number', 'certificate_type', 'issue_date', 'verification_link'],
    is_enabled: true,
  },
  {
    id: 'etpl-15',
    event_type: 'calendar_invitation',
    name: 'Central Office Calendar Event',
    category: 'general',
    subject: 'Calendar Invitation: {{event_title}}',
    body: 'Hello {{user_name}},\n\nYou are invited to {{event_title}} scheduled for {{start_time}}.\nLocation: {{location}}',
    available_variables: ['user_name', 'event_title', 'start_time', 'end_time', 'location'],
    is_enabled: true,
  },
  {
    id: 'etpl-16',
    event_type: 'admin_announcement',
    name: 'Executive Central Office Broadcast',
    category: 'general',
    subject: 'Announcement: {{announcement_title}}',
    body: 'All Software Hub 2.0 Members,\n\n{{announcement_body}}\n\nIssued by Central Office Administration',
    available_variables: ['announcement_title', 'announcement_body', 'issued_by'],
    is_enabled: true,
  },
];

export const INITIAL_NOTIFICATIONS = [
  {
    id: 'notif-1',
    user_id: 'u-admin-sriram',
    title: 'Leave Request: Cherry',
    message: 'Cherry submitted a work from home request (2026-10-21 to 2026-10-22).',
    type: 'leave_request',
    action_url: '/attendance',
    is_read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: 'notif-2',
    user_id: 'u-admin-sriram',
    title: 'Certificate Issued',
    message: 'Official certificate SH2-L2-0007 verified for Manohar.',
    type: 'certificate_review',
    action_url: '/certificates',
    is_read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
  {
    id: 'notif-3',
    user_id: 'u-admin-sriram',
    title: 'Task Milestone Completed',
    message: 'Sprint Part #2 was marked ready for review by Manohar.',
    type: 'task_review',
    action_url: '/tracker',
    is_read: true,
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
];

export const INITIAL_CHANNELS = [
  {
    id: 'chan-general',
    name: 'general-office',
    type: 'general',
    memberCount: 11,
    description: 'Central Office announcements and university operations',
    leadName: 'Sri Ram',
    pinnedMessage: { text: 'Software Hub 2.0 Command Center production release active.' },
  },
  {
    id: 'chan-core-team',
    name: 'core-paid-interns',
    type: 'team',
    memberCount: 6,
    description: 'Core Engineering Track Sprint Channel',
    leadName: 'Sheshi',
    pinnedMessage: null,
  },
  {
    id: 'chan-unpaid-team',
    name: 'foundational-interns',
    type: 'team',
    memberCount: 5,
    description: 'Unpaid Internship Mentorship & Review Channel',
    leadName: 'Sheshi',
    pinnedMessage: null,
  },
];

export const INITIAL_MESSAGES: Record<string, any[]> = {
  'chan-general': [
    {
      id: 'msg-1',
      senderId: 'u-admin-sriram',
      senderName: 'Sri Ram',
      senderRole: 'ADMIN',
      text: 'Welcome all personnel to Software Hub 2.0 Command Center. Review all sprint tasks in Tracker.',
      createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      reactions: [{ emoji: '👍', count: 4, userReacted: true }],
    },
    {
      id: 'msg-2',
      senderId: 'u-lead-sheshi',
      senderName: 'Sheshi',
      senderRole: 'LEAD',
      text: 'Sprint checkpoints and marksheet confirmations are active in the Reviewer Inbox.',
      createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      reactions: [{ emoji: '✅', count: 3, userReacted: false }],
    },
  ],
};

export const INITIAL_EVENTS = [
  {
    id: 'evt-1',
    title: 'Central Office Executive Sprint Review',
    description: 'Review of Phase 2 deliverables and Level promotions.',
    start_time: '2026-10-20T10:00:00.000Z',
    end_time: '2026-10-20T11:30:00.000Z',
    location: 'Conference Room Alpha / Virtual Sync',
    color: '#2563eb',
    created_by: 'u-admin-sriram',
    creator_name: 'Sri Ram',
  },
  {
    id: 'evt-2',
    title: 'University Accreditation & Audit Prep',
    description: 'Documentation verification with Dean of Academics.',
    start_time: '2026-10-22T14:00:00.000Z',
    end_time: '2026-10-22T15:30:00.000Z',
    location: 'Central Senate Hall',
    color: '#7c3aed',
    created_by: 'u-lead-sheshi',
    creator_name: 'Sheshi',
  },
  {
    id: 'evt-3',
    title: 'Core Engineering Sprint Retrospective',
    description: 'Sprint retrospective and task reassignment check.',
    start_time: '2026-10-24T16:00:00.000Z',
    end_time: '2026-10-24T17:00:00.000Z',
    location: 'Software Hub Lab 301',
    color: '#059669',
    created_by: 'u-core-manohar',
    creator_name: 'Manohar',
  },
];

export const INITIAL_AUDIT_LOGS = [
  {
    id: 'audit-1',
    admin_id: 'u-admin-sriram',
    admin_name: 'Sri Ram',
    action_type: 'CERTIFICATE_ISSUED',
    details: 'Issued Level 2 Paid Intern Certificate SH2-L2-0007 for Manohar.',
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: 'audit-2',
    admin_id: 'u-lead-sheshi',
    admin_name: 'Sheshi',
    action_type: 'TASK_ASSIGNED',
    details: 'Assigned Task TASK-002 Part 1 to Sri Vidhya with deadline 24 Oct.',
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: 'audit-3',
    admin_id: 'u-admin-sriram',
    admin_name: 'Sri Ram',
    action_type: 'LEAVE_APPROVED',
    details: 'Approved WFH leave request for Cherry (21-22 Oct).',
    created_at: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
  },
  {
    id: 'audit-4',
    admin_id: 'u-admin-sriram',
    admin_name: 'Sri Ram',
    action_type: 'ROSTER_CONFIRMED',
    details: 'Confirmed academic marksheet percentage (92%) for Manohar.',
    created_at: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
  },
];

// Client-side in-memory mock store
let mockUsers = [...INITIAL_USERS];
let mockCertificates = [...INITIAL_CERTIFICATES];
let mockTemplates = [...INITIAL_TEMPLATES];
let mockTasks = [...INITIAL_TASKS];
let mockEvents = [...INITIAL_EVENTS];
let mockEmailTemplates = [...INITIAL_EMAIL_TEMPLATES];
let mockNotifications = [...INITIAL_NOTIFICATIONS];
let mockChannels = [...INITIAL_CHANNELS];
let mockMessages = { ...INITIAL_MESSAGES };
let mockAuditLogs = [...INITIAL_AUDIT_LOGS];

export function handleMockApiRequest<T = any>(endpoint: string, options: RequestInit = {}): T {
  const method = (options.method || 'GET').toUpperCase();
  let body: any = {};
  if (options.body && typeof options.body === 'string') {
    try {
      body = JSON.parse(options.body);
    } catch {
      body = {};
    }
  }

  // 1. Auth Login (Works with any official persona or email)
  if (endpoint === '/auth/login' && method === 'POST') {
    const email = (body.email || '').trim().toLowerCase();
    const user = mockUsers.find((u) => u.email.toLowerCase() === email) || mockUsers[0];
    const token = `mock-token-${user.id}`;
    localStorage.setItem('token', token);
    return {
      accessToken: token,
      user,
      message: 'Signed in successfully (University Central Office)',
    } as unknown as T;
  }

  // 2. Google Sign-In
  if (endpoint === '/auth/google-signin' && method === 'POST') {
    const email = (body.email || '').trim().toLowerCase();
    const user = mockUsers.find((u) => u.email.toLowerCase() === email) || mockUsers[0];
    const token = `mock-google-token-${user.id}`;
    localStorage.setItem('token', token);
    return {
      accessToken: token,
      user,
      message: 'Google Workspace authenticated',
    } as unknown as T;
  }

  // 3. Mock SSO / Persona Switch
  if (endpoint === '/auth/mock-sso' && method === 'POST') {
    const role = body.role || USER_ROLES.ADMIN;
    const user = mockUsers.find((u) => u.role === role) || mockUsers[0];
    const token = `mock-sso-token-${user.id}`;
    localStorage.setItem('token', token);
    return {
      accessToken: token,
      user,
    } as unknown as T;
  }

  // 4. Auth Me
  if (endpoint === '/auth/me') {
    const token = localStorage.getItem('token');
    const matched = mockUsers.find((u) => token && token.includes(u.id)) || mockUsers[0];
    return matched as unknown as T;
  }

  // 5. Auth Logout
  if (endpoint === '/auth/logout') {
    localStorage.removeItem('token');
    return { message: 'Logged out successfully' } as unknown as T;
  }

  // 6. Forgot Password
  if (endpoint === '/auth/forgot-password' && method === 'POST') {
    return {
      message: 'Password reset link sent to registered institutional email.',
    } as unknown as T;
  }

  // 7. Users List
  if (endpoint === '/users' && method === 'GET') {
    return mockUsers as unknown as T;
  }

  // 8. Admin allocation summary (Hard Limit of 5)
  if (endpoint === '/users/admins/summary') {
    const admins = mockUsers.filter(
      (u) => u.role === USER_ROLES.ADMIN || u.role === USER_ROLES.LEAD
    );
    return {
      activeAdminsCount: admins.length,
      maxLimit: 5,
      availablePositions: Math.max(0, 5 - admins.length),
      primaryAdmin: 'Sri Ram',
      coAdmin: 'Sheshi',
      admins,
    } as unknown as T;
  }

  // 9. Audit Logs
  if (endpoint === '/users/audit-logs') {
    return mockAuditLogs as unknown as T;
  }

  // 10. Bulk User Import
  if (endpoint === '/users/bulk' && method === 'POST') {
    return {
      success: true,
      message: 'Roster import processed successfully.',
      importedCount: Array.isArray(body.users) ? body.users.length : 1,
    } as unknown as T;
  }

  // 11. Promote User
  if (endpoint === '/users/promote' && method === 'POST') {
    const user = mockUsers.find((u) => u.id === body.userId);
    if (user) {
      user.currentLevel = body.level || (user.currentLevel + 1);
    }
    return {
      success: true,
      message: `User promoted to Level ${body.level || 2}`,
    } as unknown as T;
  }

  // 12. Tasks List
  if (endpoint === '/tasks' && method === 'GET') {
    return mockTasks as unknown as T;
  }

  // 13. Create Task
  if (endpoint === '/tasks' && method === 'POST') {
    const newTask = {
      id: `task-${Date.now()}`,
      taskNumber: `TASK-00${mockTasks.length + 1}`,
      title: body.title || 'New Sprint Deliverable',
      description: body.description || '',
      dueDate: body.dueDate || '2026-10-30',
      priority: body.priority || 'medium',
      status: 'assigned',
      createdBy: 'u-admin-sriram',
      creatorName: 'Sri Ram',
      createdAt: new Date().toISOString(),
      parts: (body.parts || []).map((p: any, idx: number) => ({
        id: `tp-${Date.now()}-${idx + 1}`,
        taskId: `task-${Date.now()}`,
        partNumber: idx + 1,
        totalParts: body.parts?.length || 1,
        title: p.title || `Part ${idx + 1}`,
        assignedInternId: p.assignedInternId || 'u-core-manohar',
        assignedInternName: mockUsers.find((u) => u.id === p.assignedInternId)?.name || 'Manohar',
        assignedInternType: mockUsers.find((u) => u.id === p.assignedInternId)?.internType || 'paid',
        dueDate: p.dueDate || body.dueDate || '2026-10-30',
        status: 'assigned',
        reviewerId: 'u-admin-sriram',
        reviewerName: 'Sri Ram',
        rating: null,
        reviewComment: null,
        submittedAt: null,
        reviewedAt: null,
      })),
    };
    mockTasks.unshift(newTask);
    return newTask as unknown as T;
  }

  // 14. Reassign Task Part
  if (endpoint.includes('/reassign') && method === 'POST') {
    return { message: 'Deliverable reassigned and intern notified by email.' } as unknown as T;
  }

  // 15. Upload Deliverable / PR
  if (endpoint.includes('/upload') && method === 'POST') {
    return { message: 'Deliverable submitted for review.' } as unknown as T;
  }

  // 16. Review Task Part
  if (endpoint.includes('/review') && method === 'POST') {
    return { message: 'Review recorded and points updated.' } as unknown as T;
  }

  // 17. Tracker Metrics
  if (endpoint === '/tracker/metrics') {
    return {
      summary: {
        tasksDone: 42,
        onTimeRate: 91,
        overdueNow: 1,
        averageRating: 4.8,
      },
      interns: [
        {
          id: 'u-core-manohar',
          name: 'Manohar',
          email: 'manohar@softwarehub2.org',
          role: 'PAID_INTERN',
          currentLevel: 2,
          marksheetPercentage: 92,
          marksheetConfirmed: true,
          tasksDone: 48,
          onTimeRate: 95,
          attendancePercentage: 96,
          rating: 4.9,
        },
        {
          id: 'u-core-srividhya',
          name: 'Sri Vidhya',
          email: 'sri.vidhya@softwarehub2.org',
          role: 'PAID_INTERN',
          currentLevel: 2,
          marksheetPercentage: 90,
          marksheetConfirmed: true,
          tasksDone: 46,
          onTimeRate: 93,
          attendancePercentage: 94,
          rating: 4.8,
        },
        {
          id: 'u-unpaid-cherry',
          name: 'Cherry',
          email: 'cherry@softwarehub2.org',
          role: 'UNPAID_INTERN',
          currentLevel: 1,
          marksheetPercentage: 74,
          marksheetConfirmed: false,
          tasksDone: 24,
          onTimeRate: 88,
          attendancePercentage: 92.5,
          rating: 4.5,
        },
        {
          id: 'u-unpaid-ana',
          name: 'Ana',
          email: 'ana@softwarehub2.org',
          role: 'UNPAID_INTERN',
          currentLevel: 1,
          marksheetPercentage: 72,
          marksheetConfirmed: false,
          tasksDone: 20,
          onTimeRate: 85,
          attendancePercentage: 88,
          rating: 4.4,
        },
      ],
      weeklyCompleted: [
        { week: 'W1', count: 8 },
        { week: 'W2', count: 12 },
        { week: 'W3', count: 15 },
        { week: 'W4', count: 18 },
      ],
      currentReview: {
        internId: 'u-unpaid-cherry',
        internName: 'Cherry',
        currentLevel: 1,
        attendanceRate: 92.5,
        tasksCompleted: 24,
        averageRating: 4.5,
        eligibleForPromotion: true,
      },
    } as unknown as T;
  }

  // 18. Tracker Level Review
  if (endpoint === '/tracker/level-review' && method === 'POST') {
    return {
      message: `Month-end review finalized: ${body.decision === 'pass' ? 'Advanced to next Level' : 'Level Repeated'}.`,
    } as unknown as T;
  }

  // 19. Certificates List
  if (endpoint === '/certificates' && method === 'GET') {
    return mockCertificates as unknown as T;
  }

  // 20. Certificate Templates
  if (endpoint === '/certificates/templates' && method === 'GET') {
    return mockTemplates as unknown as T;
  }

  // 21. Public Certificate Verification
  if (endpoint.startsWith('/certificates/verify/')) {
    const certNum = endpoint.replace('/certificates/verify/', '');
    const cert = mockCertificates.find((c) => c.certificateNumber.toLowerCase() === certNum.toLowerCase());
    if (cert) {
      return {
        verified: cert.status === 'issued',
        status: cert.status,
        certificate: {
          ...cert,
          university: "St. Mary's Rehabilitation University",
          office: 'Central Office Software Hub 2.0',
        },
      } as unknown as T;
    }
    return {
      verified: true,
      status: 'issued',
      certificate: {
        certificateNumber: certNum,
        internName: 'Manohar',
        internEmail: 'manohar@softwarehub2.org',
        level: 2,
        category: 'paid',
        templateTitle: 'Paid Intern Certificate (Central Office Modern Design)',
        issueDate: '15 Mar 2026',
        status: 'issued',
        attendancePercentage: 96,
        tasksCompleted: 48,
        issuedByName: 'Sri Ram',
        university: "St. Mary's Rehabilitation University",
        office: 'Central Office Software Hub 2.0',
      },
    } as unknown as T;
  }

  // 22. Issue Certificate
  if (endpoint === '/certificates/issue' && method === 'POST') {
    const intern = mockUsers.find((u) => u.id === body.internId) || mockUsers[2];
    const certNum = `SH2-L${body.level || 2}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newCert = {
      id: `cert-${Date.now()}`,
      certificateNumber: certNum,
      userId: intern.id,
      userName: intern.name,
      userEmail: intern.email,
      level: body.level || 2,
      category: intern.internType || 'paid',
      templateTitle: body.templateId?.includes('unpaid') ? mockTemplates[1].title : mockTemplates[0].title,
      issueDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      status: 'issued',
      qrCodeData: `https://softwarehub2.org/verify/${certNum}`,
      attendancePercentage: intern.attendancePercentage || 95,
      tasksCompleted: 42,
      issuedByName: 'Sri Ram',
      marksheetPercentage: intern.marksheetPercentage,
    };
    mockCertificates.unshift(newCert);
    return {
      message: `Certificate ${certNum} issued successfully to ${intern.name}`,
      certificateNumber: certNum,
      id: newCert.id,
    } as unknown as T;
  }

  // 23. Reissue Certificate
  if (endpoint.includes('/reissue') && method === 'POST') {
    const certId = endpoint.split('/')[2];
    const oldCert = mockCertificates.find((c) => c.id === certId || c.certificateNumber === certId);
    const newNum = `${oldCert?.certificateNumber || 'SH2-L2-0007'}-R`;
    if (oldCert) oldCert.status = 'revoked';
    const newCert = {
      ...oldCert,
      id: `cert-${Date.now()}`,
      certificateNumber: newNum,
      status: 'issued',
      reissuedFrom: oldCert?.certificateNumber,
      reissueReason: body.reason,
      issueDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    };
    mockCertificates.unshift(newCert as any);
    return {
      message: `Certificate reissued successfully as ${newNum}`,
      certificateNumber: newNum,
    } as unknown as T;
  }

  // 24. Attendance Today
  if (endpoint === '/attendance/today') {
    return {
      date: '2026-10-17',
      stats: { in: 8, late: 1, notYet: 2 },
      records: mockUsers.map((u, i) => ({
        userId: u.id,
        name: u.name,
        role: u.role,
        internType: u.internType,
        checkInTime: i < 8 ? '2026-10-17T09:12:00.000Z' : null,
        checkOutTime: null,
        status: i === 0 || i < 7 ? 'present' : i === 7 ? 'late' : 'not_yet',
        withinCampus: i % 2 === 0,
      })),
    } as unknown as T;
  }

  // 25. Attendance Register
  if (endpoint.startsWith('/attendance/register')) {
    return {
      userId: 'u-core-manohar',
      attendanceThisMonth: 95,
      daysPresent: 14,
      lateArrivals: 1,
      leaveTaken: 1,
      records: [
        { date: '2026-10-01', status: 'present' },
        { date: '2026-10-02', status: 'leave' },
        { date: '2026-10-05', status: 'present' },
        { date: '2026-10-06', status: 'present' },
        { date: '2026-10-07', status: 'present' },
        { date: '2026-10-08', status: 'late' },
        { date: '2026-10-09', status: 'present' },
        { date: '2026-10-12', status: 'present' },
        { date: '2026-10-13', status: 'present' },
        { date: '2026-10-14', status: 'present' },
        { date: '2026-10-15', status: 'present' },
        { date: '2026-10-16', status: 'present' },
      ],
    } as unknown as T;
  }

  // 26. Check In / Check Out
  if (endpoint === '/attendance/check-in' && method === 'POST') {
    return {
      message: 'Checked in successfully. Campus Verified (St. Mary’s Rehabilitation University Geofence).',
      status: 'present',
      withinCampus: true,
    } as unknown as T;
  }
  if (endpoint === '/attendance/check-out' && method === 'POST') {
    return {
      message: 'Checked out successfully. Shift total: 8.2 hrs.',
      status: 'present',
    } as unknown as T;
  }

  // 27. Leave Requests
  if (endpoint === '/attendance/leave' && method === 'GET') {
    return [
      {
        id: 'lr-1',
        userName: 'Cherry',
        userRole: 'UNPAID_INTERN',
        leaveCategory: 'work_from_home',
        startDate: '2026-10-21',
        endDate: '2026-10-22',
        reason: 'Requesting permission to Work From Home for sprint deliverable coding milestone.',
        status: 'pending',
      },
      {
        id: 'lr-2',
        userName: 'Ana',
        userRole: 'UNPAID_INTERN',
        leaveCategory: 'half_day',
        partialDayDuration: 'First Half (09:00 - 13:00)',
        startDate: '2026-10-23',
        endDate: '2026-10-23',
        reason: 'Medical appointment in the morning session.',
        status: 'pending',
      },
    ] as unknown as T;
  }
  if (endpoint === '/attendance/leave' && method === 'POST') {
    return { message: 'Leave application submitted successfully to Central Office' } as unknown as T;
  }
  if (endpoint.includes('/attendance/leave/') && endpoint.includes('/review')) {
    return { message: 'Leave review recorded and applicant notified.' } as unknown as T;
  }

  // 28. Notifications
  if (endpoint === '/notifications' && method === 'GET') {
    return {
      unreadCount: mockNotifications.filter((n) => !n.is_read).length,
      notifications: mockNotifications,
    } as unknown as T;
  }
  if (endpoint.includes('/notifications/') && endpoint.includes('/read')) {
    mockNotifications.forEach((n) => (n.is_read = true));
    return { message: 'Notifications marked as read' } as unknown as T;
  }
  if (endpoint === '/notifications/approvals/inbox') {
    return {
      summary: {
        pendingLeavesCount: 2,
        pendingTasksCount: 3,
        eligibleInternsCount: 4,
        totalPending: 5,
      },
      leaves: [],
      tasks: [],
      interns: [],
    } as unknown as T;
  }

  // 29. Automations & Templates
  if (endpoint === '/automations' && method === 'GET') {
    return {
      automations: [
        {
          id: 'auto-1',
          name: 'Welcome Email for New Accounts',
          triggerEvent: 'Immediate on User Creation',
          recipientDescription: 'New Intern / Staff Member',
          isEnabled: true,
        },
        {
          id: 'auto-2',
          name: 'Task Assignment Dispatch',
          triggerEvent: 'Instant on Task Assigned',
          recipientDescription: 'Assigned Intern & Lead',
          isEnabled: true,
        },
        {
          id: 'auto-3',
          name: 'Deadline 24h Reminder',
          triggerEvent: 'Daily Cron at 08:00 AM',
          recipientDescription: 'Pending Assignees',
          isEnabled: true,
        },
        {
          id: 'auto-4',
          name: 'Certificate Issuance Delivery',
          triggerEvent: 'On Certificate Authorized',
          recipientDescription: 'Certified Intern',
          isEnabled: true,
        },
      ],
      metrics: { sentThisWeek: 18, failed: 0 },
    } as unknown as T;
  }
  if (endpoint === '/automations/email-templates/list') {
    return mockEmailTemplates as unknown as T;
  }
  if (endpoint === '/automations/email-logs/list') {
    return [
      {
        id: 'elog-1',
        recipient_email: 'manohar@softwarehub2.org',
        subject: 'Official Credential Issued: SH2-L2-0007',
        sent_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        status: 'delivered',
      },
      {
        id: 'elog-2',
        recipient_email: 'cherry@softwarehub2.org',
        subject: 'Welcome to Software Hub 2.0 Command Center',
        sent_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        status: 'delivered',
      },
    ] as unknown as T;
  }
  if (endpoint === '/automations/email-templates/test') {
    return { message: 'Test email dispatched and logged in Central Office registry.' } as unknown as T;
  }

  // 30. Chat Channels & Teams
  if (endpoint === '/chat/channels') {
    return mockChannels as unknown as T;
  }
  if (endpoint.includes('/chat/channels/') && endpoint.includes('/messages')) {
    const chanId = endpoint.split('/')[3];
    return (mockMessages[chanId] || mockMessages['chan-general'] || []) as unknown as T;
  }
  if (endpoint === '/chat/teams' && method === 'POST') {
    return { message: 'Team channel created successfully.', teamId: 'team-new', channelId: 'chan-new' } as unknown as T;
  }

  // 31. Calendar Events
  if (endpoint === '/calendar' && method === 'GET') {
    return mockEvents as unknown as T;
  }
  if (endpoint === '/calendar' && method === 'POST') {
    const newEvt = {
      id: `evt-${Date.now()}`,
      title: body.title || 'New Event',
      description: body.description || '',
      start_time: body.start_time || new Date().toISOString(),
      end_time: body.end_time || new Date().toISOString(),
      location: body.location || '',
      color: '#2563eb',
      created_by: 'u-admin-sriram',
      creator_name: 'Sri Ram',
    };
    mockEvents.push(newEvt);
    return newEvt as unknown as T;
  }
  if (endpoint === '/calendar/google/status') {
    return { connected: true, email: 'central.office@softwarehub2.org', syncEnabled: true } as unknown as T;
  }
  if (endpoint === '/calendar/google/auth-url') {
    return { authUrl: '' } as unknown as T;
  }
  if (endpoint === '/calendar/google/sync') {
    return { message: 'Calendar synchronization completed successfully.' } as unknown as T;
  }

  // 32. Exports / CSV / PDF downloads
  if (endpoint.startsWith('/exports/') || endpoint.includes('/pdf')) {
    const csvContent =
      'ID,Name,Email,Role,Status,Level,Attendance\n' +
      mockUsers
        .map(
          (u) =>
            `${u.id},${u.name},${u.email},${u.role},Active,${u.currentLevel},${u.attendancePercentage || 90}%`
        )
        .join('\n');
    return new Blob([csvContent], { type: 'text/csv' }) as unknown as T;
  }

  // Fallback default
  return {} as unknown as T;
}
