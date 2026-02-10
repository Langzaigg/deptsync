/**
 * API Client for DeptSync Backend
 * Replaces localStorage-based storage.ts
 */

const API_BASE = '/api';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// Helper: Convert keys to camelCase
const toCamel = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(v => toCamel(v));
  } else if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      result[camelKey] = toCamel(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
};

// Helper: Convert keys to snake_case
const toSnake = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(v => toSnake(v));
  } else if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      result[snakeKey] = toSnake(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
};

// Token management
let accessToken: string | null = localStorage.getItem('deptsync_token');

export const setToken = (token: string | null) => {
  accessToken = token;
  if (token) {
    localStorage.setItem('deptsync_token', token);
  } else {
    localStorage.removeItem('deptsync_token');
  }
};

export const getToken = () => accessToken;

// Generic fetch wrapper
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (accessToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
  }

  // Auto-convert body to snake_case
  let body = options.body;
  if (body && typeof body === 'string') {
    try {
      const parsed = JSON.parse(body);
      body = JSON.stringify(toSnake(parsed));
    } catch (e) {
      // ignore if not json
    }
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    body
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = typeof errorData.detail === 'string'
      ? errorData.detail
      : JSON.stringify(errorData.detail) || `HTTP error ${response.status}`;
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return toCamel(data);
}

// API Methods
export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),

  post: <T>(endpoint: string, data: unknown) =>
    request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  put: <T>(endpoint: string, data: unknown) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};

// File upload (multipart/form-data, separate from JSON api)
export interface FileUploadResponse {
  url: string;
  path?: string;
  name: string;
  size: number;
  contentType: string;
}

export const filesApi = {
  upload: async (file: File, folder?: string, projectName?: string): Promise<FileUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    if (folder) formData.append('folder', folder);
    if (projectName) formData.append('project_name', projectName);

    const headers: Record<string, string> = {};
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${API_BASE}/files/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Upload failed: ${response.status}`);
    }

    const data = await response.json();
    return toCamel(data);
  },
};

// Auth API
export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  userId: string;
  username: string;
  role: string;
}

export const authApi = {
  login: async (jobNumber: string, password: string): Promise<LoginResponse> => {
    // We send camelCase but toSnake in request() handles it
    const response = await api.post<LoginResponse>('/auth/login', {
      jobNumber,
      password,
    });
    setToken(response.accessToken);
    return response;
  },

  register: async (name: string, jobNumber: string, password: string): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/register', {
      name,
      jobNumber,
      password,
    });
    setToken(response.accessToken);
    return response;
  },

  logout: () => {
    setToken(null);
  }
};


// Users API
export const usersApi = {
  getAll: () => api.get<any[]>('/users'),
  getById: (id: string) => api.get<any>(`/users/${id}`),
  update: (id: string, data: any) => api.put<any>(`/users/${id}`, data),
  promote: (id: string) => api.post<any>(`/users/${id}/promote`, {}),
};

// Projects API
export const projectsApi = {
  getAll: () => api.get<any[]>('/projects'),
  getById: (id: string) => api.get<any>(`/projects/${id}`),
  create: (data: any) => api.post<any>('/projects', data),
  update: (id: string, data: any) => api.put<any>(`/projects/${id}`, data),
  delete: (id: string) => api.delete<any>(`/projects/${id}`),
  exportTimeline: async (id: string, eventIds: string[] = []) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

    const response = await fetch(`${API_BASE}/projects/${id}/timeline/export`, {
      method: 'POST',
      headers,
      body: JSON.stringify(eventIds),
    });

    if (!response.ok) throw new Error('Export failed');
    return response.blob();
  },
};

// Tasks API
export const tasksApi = {
  getAll: (projectId?: string) => {
    return api.get<any[]>(projectId ? `/tasks?project_id=${projectId}` : '/tasks');
  },
  getById: (id: string) => api.get<any>(`/tasks/${id}`),
  create: (data: any) => api.post<any>('/tasks', data),
  update: (id: string, data: any) => api.put<any>(`/tasks/${id}`, data),
  delete: (id: string) => api.delete<any>(`/tasks/${id}`),
};

// Reports API
export const reportsApi = {
  getAll: (userId?: string) => {
    return api.get<any[]>(userId ? `/reports?user_id=${userId}` : '/reports');
  },
  create: (data: any) => api.post<any>('/reports', data),
  delete: (id: string) => api.delete<any>(`/reports/${id}`),
  export: async (id: string) => {
    const headers: Record<string, string> = {};
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

    const response = await fetch(`${API_BASE}/reports/${id}/export`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) throw new Error('Export failed');
    return response.blob();
  },
  batchExport: async (ids: string[]) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

    const response = await fetch(`${API_BASE}/reports/batch-export`, {
      method: 'POST',
      headers,
      body: JSON.stringify(ids),
    });

    if (!response.ok) throw new Error('Export failed');
    return response.blob();
  },
};

export const inspirationsApi = {
  getAll: () => api.get<any[]>('/inspirations'),
  create: (data: any) => api.post<any>('/inspirations', data),
  update: (id: string, data: any) => api.put<any>(`/inspirations/${id}`, data),
  delete: (id: string) => api.delete<any>(`/inspirations/${id}`),
};

// Events API (Timeline)
export const eventsApi = {
  getByProject: (projectId: string, startDate?: string, endDate?: string) => {
    let url = `/events?project_id=${projectId}`;
    if (startDate) url += `&start_date=${startDate}`;
    if (endDate) url += `&end_date=${endDate}`;
    return api.get<any[]>(url);
  },
  create: (data: any) => api.post<any>('/events', data),
  update: (id: string, data: any) => api.put<any>(`/events/${id}`, data),
  delete: (id: string) => api.delete<any>(`/events/${id}`),
  export: async (id: string) => {
    const headers: Record<string, string> = {};
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

    const response = await fetch(`${API_BASE}/events/${id}/export`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) throw new Error('Export failed');
    return response.blob();
  },
};

// LLM Services
export const llmApi = {
  generateProjectReport: (project: any, events: any[], tasks: any[], startDate: string, endDate: string) => {
    return api.post<any>('/llm/generate-report', {
      reportType: 'project',
      project,
      events,
      tasks,
      startDate,
      endDate
    });
  },
  generatePersonalReport: async (username: string, projects: any[], inspirations: any[]) => {
    const response = await api.post<any>('/llm/generate-personal-report', {
      username,
      projects,
      inspirations
    });
    return JSON.stringify(response.data);
  },
  generateDeptMonthlyReport: (startDate: string, endDate: string, projects: any[], reports: any[]) => {
    return api.post<any>('/llm/generate-dept-monthly-report', {
      startDate,
      endDate,
      projects,
      reports
    });
  }
};
