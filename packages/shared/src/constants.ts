export const USER_ROLES = {
  ADMIN: 'admin',
  LEAD: 'lead',
  PAID_INTERN: 'paid_intern',
  UNPAID_INTERN: 'unpaid_intern',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const INTERN_TYPES = {
  PAID: 'paid',
  UNPAID: 'unpaid',
} as const;

export type InternType = (typeof INTERN_TYPES)[keyof typeof INTERN_TYPES];

export const TASK_STATUSES = {
  TO_DO: 'to_do',
  IN_PROGRESS: 'in_progress',
  IN_REVIEW: 'in_review',
  DONE: 'done',
  OVERDUE: 'overdue',
} as const;

export type TaskStatus = (typeof TASK_STATUSES)[keyof typeof TASK_STATUSES];

export const TASK_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[keyof typeof TASK_PRIORITIES];

export const UPLOAD_KINDS = {
  FILE: 'file',
  GIT_LINK: 'git_link',
  DOCUMENTATION: 'documentation',
} as const;

export type UploadKind = (typeof UPLOAD_KINDS)[keyof typeof UPLOAD_KINDS];

export const ATTENDANCE_STATUSES = {
  PRESENT: 'present',
  LATE: 'late',
  HALF_DAY: 'half_day',
  ABSENT: 'absent',
  LEAVE: 'leave',
  HOLIDAY: 'holiday',
  WEEK_OFF: 'week_off',
} as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[keyof typeof ATTENDANCE_STATUSES];

export const ATTENDANCE_CODES: Record<AttendanceStatus, string> = {
  present: 'P',
  late: 'L',
  half_day: 'H',
  absent: 'A',
  leave: 'V',
  holiday: 'HO',
  week_off: 'WO',
};

export const CERTIFICATE_LEVELS = {
  LEVEL_1: 1, // Unpaid Intern (min 75% attendance)
  LEVEL_2: 2, // Core / Paid Intern (min 75% attendance + confirmed marksheet >= 80%)
} as const;

export type CertificateLevel = (typeof CERTIFICATE_LEVELS)[keyof typeof CERTIFICATE_LEVELS];

export const AUTOMATION_KEYS = {
  WELCOME_EMAIL: 'welcome_email',
  NEW_TASK_ASSIGNED: 'new_task_assigned',
  DUE_TOMORROW: 'due_tomorrow',
  OVERDUE_REMINDER: 'overdue_reminder',
  WORK_SUBMITTED: 'work_submitted',
  REVIEWED_OR_SENT_BACK: 'reviewed_or_sent_back',
  NOT_CHECKED_IN: 'not_checked_in',
  MONTH_END_LEVEL_REVIEW: 'month_end_level_review',
  WEEKLY_SUMMARY: 'weekly_summary',
  CERTIFICATE_ISSUED: 'certificate_issued',
} as const;

export type AutomationKey = (typeof AUTOMATION_KEYS)[keyof typeof AUTOMATION_KEYS];

export const MAX_LEVEL = 15;
export const MIN_ATTENDANCE_PERCENTAGE = 75;
export const MIN_CORE_MARKSHEET_PERCENTAGE = 80;
