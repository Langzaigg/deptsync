export enum UserRole {
    ADMIN = 'ADMIN',
    EMPLOYEE = 'EMPLOYEE',
}

export interface User {
    id: string;
    jobNumber: string;
    name: string;
    username: string;
    role: UserRole;
    avatar?: string;
    skills?: string[];
}

export interface Attachment {
    name: string;
    url: string;
    caption?: string;
    folder?: string;
}

export interface TimelineEvent {
    id: string;
    projectId: string;
    authorId: string;
    authorName: string;
    content: string;
    date: string;
    type: 'UPDATE' | 'MILESTONE' | 'ISSUE' | 'WEEKLY_REPORT' | 'MONTHLY_REPORT' | 'MEETING_MINUTES' | 'MEETING' | 'DELIVERABLE';
    attachments?: Attachment[];
    important?: boolean;
    createdAt?: string;
}

export interface Project {
    id: string;
    title: string;
    projectNumber?: string;
    customerName?: string;
    priority?: 'NORMAL' | 'HIGH' | 'URGENT';
    description: string;
    businessScenario: string;
    status: 'INITIATION' | 'EXECUTION' | 'ACCEPTANCE' | 'CLOSED';
    startDate: string;
    endDate?: string;
    managerId: string;
    admins?: string[];
    members: string[];
    budget?: string;
}

export interface Inspiration {
    id: string;
    authorId: string;
    authorName: string;
    content: string;
    tags: string[];
    color: string;
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
    content: string;
    details?: WeeklyReportItem[];
    linkedProjectIds: string[];
    linkedInspirationIds: string[];
    attachments?: Attachment[];
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
    projectTitle?: string;
    title: string;
    description: string;
    assigneeIds: string[];
    deadline: string;
    progress: number;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
    priority?: 'NORMAL' | 'HIGH';
    remarks: TaskRemark[];
    creatorId?: string;
    createdAt: string;
}
