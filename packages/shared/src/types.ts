import type { UserRole, InternType, TaskStatus, TaskPriority, UploadKind, AttendanceStatus, CertificateLevel, AutomationKey } from './constants.js';

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  internType?: InternType | null;
  pairedPaidInternId?: string | null;
  pairedPaidInternName?: string | null;
  currentLevel: number;
  marksheetPercentage?: number | null;
  marksheetConfirmed?: boolean;
  status: 'active' | 'inactive';
  avatarUrl?: string | null;
  createdAt: string;
}

export interface TaskPartDTO {
  id: string;
  taskId: string;
  partNumber: number;
  totalParts: number;
  title: string;
  assignedInternId: string;
  assignedInternName?: string;
  assignedInternType?: InternType;
  dueDate: string;
  status: TaskStatus;
  reviewerId?: string | null;
  reviewerName?: string | null;
  rating?: number | null;
  reviewComment?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  uploads?: UploadDTO[];
}

export interface UploadDTO {
  id: string;
  taskPartId: string;
  kind: UploadKind;
  urlOrPath: string;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  uploadedBy: string;
  uploaderName?: string;
  createdAt: string;
}

export interface TaskDTO {
  id: string;
  taskNumber: string;
  title: string;
  description?: string | null;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  createdBy: string;
  creatorName?: string;
  createdAt: string;
  parts: TaskPartDTO[];
}

export interface AttendanceRecordDTO {
  id: string;
  userId: string;
  userName?: string;
  date: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  status: AttendanceStatus;
}

export interface AttendanceRulesDTO {
  id: string;
  officeStartTime: string; // "09:00"
  graceMinutes: number; // 15
  halfDayHours: number; // 4.0
  absentCutoffTime: string; // "11:00"
}

export interface ChatChannelDTO {
  id: string;
  name: string;
  description?: string | null;
  type: 'team' | 'group' | 'direct';
  teamId?: string | null;
  leadId?: string | null;
  leadName?: string | null;
  unreadCount?: number;
  memberCount?: number;
  members?: Array<{ id: string; name: string; role?: UserRole; email?: string; avatarUrl?: string | null }>;
  pinnedMessage?: ChatMessageDTO | null;
}

export interface TeamDTO {
  id: string;
  name: string;
  description?: string | null;
  leadId: string;
  leadName?: string;
  channelId?: string;
  memberCount: number;
  members?: Array<{ id: string; name: string; role: UserRole; email: string }>;
  createdAt: string;
}

export interface ChatMessageDTO {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  senderAvatarUrl?: string | null;
  text?: string | null;
  attachments?: Array<{
    url: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  }>;
  linkedTaskId?: string | null;
  linkedTask?: {
    id: string;
    taskNumber: string;
    title: string;
  } | null;
  isPinned: boolean;
  reactions: Array<{
    emoji: string;
    count: number;
    userReacted: boolean;
  }>;
  createdAt: string;
}

export interface CertificateDTO {
  id: string;
  certificateNumber: string; // e.g. "SH2-L1-0030"
  userId: string;
  userName: string;
  level: CertificateLevel;
  issueDate: string;
  status: 'issued' | 'revoked';
  qrCodeData: string;
  attendancePercentage: number;
  tasksCompleted: number;
  issuedByName: string;
  marksheetPercentage?: number | null;
}

export interface AutomationDTO {
  id: string;
  key: AutomationKey;
  name: string;
  triggerEvent: string;
  scheduleCron?: string | null;
  recipientDescription: string;
  channel: 'email' | 'push' | 'both';
  isEnabled: boolean;
  emailSubjectTemplate: string;
  emailBodyTemplate: string;
}
