import { User, UserRole, Project, TimelineEvent, Inspiration, WeeklyReport, ManDayRecord, TaskAssignment } from '../types';

// Keys
const KEYS = {
  USERS: 'deptsync_users',
  PROJECTS: 'deptsync_projects',
  EVENTS: 'deptsync_events',
  INSPIRATIONS: 'deptsync_inspirations',
  REPORTS: 'deptsync_reports',
  MANDAYS: 'deptsync_mandays',
  TASKS: 'deptsync_tasks',
  CURRENT_USER: 'deptsync_current_user',
};

// Seed Data
const seedAdmin: User = { 
  id: 'admin-1', 
  jobNumber: 'admin',
  name: '管理员',
  password: 'admin',
  username: '管理员(admin)', 
  role: UserRole.ADMIN,
  skills: ['系统管理']
};

// Helpers
const get = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const set = <T>(key: string, data: T[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Initialization
export const initStorage = () => {
  const users = get<User>(KEYS.USERS);
  const isLegacy = users.length > 0 && !users[0].jobNumber;
  
  if (users.length === 0 || isLegacy) {
    set(KEYS.USERS, [seedAdmin]);
  }
};

// User Service
export const userService = {
  login: (jobNumber: string, password: string): User | null => {
    const users = get<User>(KEYS.USERS);
    return users.find(u => u.jobNumber === jobNumber && u.password === password) || null;
  },
  register: (name: string, jobNumber: string, password: string): User => {
    const users = get<User>(KEYS.USERS);
    if (users.find(u => u.jobNumber === jobNumber)) throw new Error("Job number exists");
    
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      jobNumber,
      name,
      password,
      username: `${name}(${jobNumber})`,
      role: UserRole.EMPLOYEE,
      skills: []
    };
    users.push(newUser);
    set(KEYS.USERS, users);
    return newUser;
  },
  getAll: (): User[] => get<User>(KEYS.USERS),
  getByIds: (ids: string[]): User[] => {
      const users = get<User>(KEYS.USERS);
      return users.filter(u => ids.includes(u.id));
  },
  update: (user: User) => {
    const users = get<User>(KEYS.USERS);
    const index = users.findIndex(u => u.id === user.id);
    if (index !== -1) {
        users[index] = user;
        set(KEYS.USERS, users);
    }
  },
  promote: (userId: string) => {
    const users = get<User>(KEYS.USERS);
    const updated = users.map(u => u.id === userId ? { ...u, role: UserRole.ADMIN } : u);
    set(KEYS.USERS, updated);
  }
};

// Project Service
export const projectService = {
  getAll: (): Project[] => get<Project>(KEYS.PROJECTS),
  create: (project: Project) => {
    const projects = get<Project>(KEYS.PROJECTS);
    set(KEYS.PROJECTS, [...projects, project]);
  },
  update: (project: Project) => {
    const projects = get<Project>(KEYS.PROJECTS);
    const index = projects.findIndex(p => p.id === project.id);
    if (index !== -1) {
      projects[index] = project;
      set(KEYS.PROJECTS, projects);
    }
  },
  delete: (id: string) => {
    const projects = get<Project>(KEYS.PROJECTS);
    const newProjects = projects.filter(p => p.id !== id);
    set(KEYS.PROJECTS, newProjects);
  },
  getById: (id: string): Project | undefined => get<Project>(KEYS.PROJECTS).find(p => p.id === id),
};

// Timeline Service
export const timelineService = {
  getByProject: (projectId: string): TimelineEvent[] => {
    return get<TimelineEvent>(KEYS.EVENTS)
      .filter(e => e.projectId === projectId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },
  addEvent: (event: TimelineEvent) => {
    const events = get<TimelineEvent>(KEYS.EVENTS);
    set(KEYS.EVENTS, [...events, event]);
  },
  updateEvent: (event: TimelineEvent) => {
      const events = get<TimelineEvent>(KEYS.EVENTS);
      const index = events.findIndex(e => e.id === event.id);
      if (index !== -1) {
          events[index] = event;
          set(KEYS.EVENTS, events);
      }
  },
  deleteEvent: (eventId: string) => {
      const events = get<TimelineEvent>(KEYS.EVENTS);
      const newEvents = events.filter(e => e.id !== eventId);
      set(KEYS.EVENTS, newEvents);
  },
  getByProjectAndDateRange: (projectId: string, start: Date, end: Date) => {
    return get<TimelineEvent>(KEYS.EVENTS).filter(e => {
      const d = new Date(e.date);
      return e.projectId === projectId && d >= start && d <= end;
    });
  }
};

// Inspiration Service
export const inspirationService = {
  getAll: (): Inspiration[] => get<Inspiration>(KEYS.INSPIRATIONS),
  create: (inspiration: Inspiration) => {
    const inspirations = get<Inspiration>(KEYS.INSPIRATIONS);
    set(KEYS.INSPIRATIONS, [inspiration, ...inspirations]);
  },
  update: (inspiration: Inspiration) => {
    const inspirations = get<Inspiration>(KEYS.INSPIRATIONS);
    const index = inspirations.findIndex(i => i.id === inspiration.id);
    if (index !== -1) {
        inspirations[index] = inspiration;
        set(KEYS.INSPIRATIONS, inspirations);
    }
  },
  delete: (id: string) => {
    const inspirations = get<Inspiration>(KEYS.INSPIRATIONS);
    const newInspirations = inspirations.filter(i => i.id !== id);
    set(KEYS.INSPIRATIONS, newInspirations);
  }
};

// Report Service
export const reportService = {
  create: (report: WeeklyReport) => {
    const reports = get<WeeklyReport>(KEYS.REPORTS);
    set(KEYS.REPORTS, [report, ...reports]);
  },
  getByUser: (userId: string): WeeklyReport[] => {
    return get<WeeklyReport>(KEYS.REPORTS)
      .filter(r => r.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
  getAll: (): WeeklyReport[] => {
    return get<WeeklyReport>(KEYS.REPORTS)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
  getByProjectAndDateRange: (projectId: string, start: Date, end: Date): WeeklyReport[] => {
      const reports = get<WeeklyReport>(KEYS.REPORTS);
      return reports.filter(r => {
          const d = new Date(r.createdAt);
          const hasProject = r.linkedProjectIds.includes(projectId) || r.details?.some(d => d.projectId === projectId);
          return hasProject && d >= start && d <= end;
      });
  },
  delete: (id: string) => {
    const reports = get<WeeklyReport>(KEYS.REPORTS);
    const newReports = reports.filter(r => r.id !== id);
    set(KEYS.REPORTS, newReports);
  }
};

// Task Service
export const taskService = {
    getAll: (): TaskAssignment[] => get<TaskAssignment>(KEYS.TASKS),
    getByProject: (projectId: string): TaskAssignment[] => {
        return get<TaskAssignment>(KEYS.TASKS)
            .filter(t => t.projectId === projectId)
            .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
    },
    create: (task: TaskAssignment) => {
        const tasks = get<TaskAssignment>(KEYS.TASKS);
        set(KEYS.TASKS, [...tasks, task]);
    },
    update: (task: TaskAssignment) => {
        const tasks = get<TaskAssignment>(KEYS.TASKS);
        const index = tasks.findIndex(t => t.id === task.id);
        if (index !== -1) {
            tasks[index] = task;
            set(KEYS.TASKS, tasks);
        }
    },
    delete: (id: string) => {
        const tasks = get<TaskAssignment>(KEYS.TASKS);
        const newTasks = tasks.filter(t => t.id !== id);
        set(KEYS.TASKS, newTasks);
    }
};

// ManDay Service
export const manDayService = {
    getAll: (): ManDayRecord[] => get<ManDayRecord>(KEYS.MANDAYS),
    add: (record: ManDayRecord) => {
        const records = get<ManDayRecord>(KEYS.MANDAYS);
        set(KEYS.MANDAYS, [...records, record]);
    },
    getByProject: (projectId: string): ManDayRecord[] => {
        return get<ManDayRecord>(KEYS.MANDAYS)
            .filter(r => r.projectId === projectId)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
    approve: (id: string) => {
        const records = get<ManDayRecord>(KEYS.MANDAYS);
        const index = records.findIndex(r => r.id === id);
        if (index !== -1) {
            records[index].status = 'APPROVED';
            set(KEYS.MANDAYS, records);
        }
    }
};