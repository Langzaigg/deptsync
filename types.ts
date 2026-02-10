export enum UserRole {
  ADMIN = 'ADMIN',
  EMPLOYEE = 'EMPLOYEE',
}

export interface User {
  id: string;
  jobNumber: string; // 工号
  name: string;      // 姓名
  password?: string; // 密码
  username: string;  // 显示名称: 姓名(工号)
  role: UserRole;
  avatar?: string;
  skills?: string[]; // 3.4.1 技能标签
}

export interface Attachment {
  name: string;
  url: string;
  caption?: string;
  folder?: string; // Support for folder hierarchy
}

export interface TimelineEvent {
  id: string;
  projectId: string;
  authorId: string;
  authorName: string;
  content: string;
  date: string; // ISO string
  type: 'UPDATE' | 'MILESTONE' | 'ISSUE' | 'WEEKLY_REPORT' | 'MONTHLY_REPORT' | 'MEETING_MINUTES';
  attachments?: Attachment[];
}

export interface Project {
  id: string;
  title: string;
  projectNumber?: string; // 项目编号
  customerName?: string; // New: 客户名称
  priority?: 'NORMAL' | 'HIGH' | 'URGENT'; // New: 优先级
  description: string;
  businessScenario: string; // 3.1.1 业务场景
  status: 'INITIATION' | 'EXECUTION' | 'ACCEPTANCE' | 'CLOSED';
  startDate: string;
  endDate?: string;
  managerId: string; // Project Creator/Admin
  admins?: string[]; // List of additional project admins
  members: string[]; // 3.1.2 组人 (User IDs)
  budget?: string; // 3.2.1 预算
}

export interface Inspiration {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  tags: string[];
  color: string; // hex code for sticky note bg
  createdAt: string;
}

export interface WeeklyReportItem {
  projectId: string;
  projectTitle: string;
  content: string;
  plan: string;
}

export interface WeeklyReport {
  id: string;
  userId: string;
  username: string;
  weekStartDate: string;
  content: string; // Full text summary
  details?: WeeklyReportItem[]; // 分项填报
  linkedProjectIds: string[];
  linkedInspirationIds: string[];
  attachments?: Attachment[]; // New: Attachments for reports
  createdAt: string;
}

export interface TaskRemark {
    authorId: string;
    authorName: string;
    content: string;
    date: string;
}

export interface TaskAssignment {
  id: string;
  projectId: string;
  title: string;
  description: string;
  assigneeIds: string[]; // Who is responsible
  deadline: string;
  progress: number; // 0 - 100
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  remarks: TaskRemark[]; // Member feedback/remarks
}

// Deprecated
export interface ManDayRecord {
  id: string;
  projectId: string;
  userId: string;
  username: string;
  date: string;
  duration: number;
  content: string;
  status: 'PENDING' | 'APPROVED';
}
