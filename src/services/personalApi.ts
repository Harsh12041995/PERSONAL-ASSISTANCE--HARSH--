// src/services/personalApi.ts
// Unified API service for all personal module pages

import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';

// ─── Auth token helper ────────────────────────────────────────────────────────
const token = () => {
    // authService.ts stores token under 'accessToken' (TOKEN_KEY constant)
    return (
        localStorage.getItem('accessToken') ||
        sessionStorage.getItem('accessToken') ||
        ''
    );
};

const api = axios.create({ baseURL: `${BASE}/personal` });

api.interceptors.request.use(cfg => {
    const t = token();
    if (t) cfg.headers.Authorization = `Bearer ${t}`;
    return cfg;
});

// ─── Response unpacker ────────────────────────────────────────────────────────
const data = (res: { data: { data: any } }) => res.data.data;

// ═══════════════════════════════════════════════════════════════════════════════
//  CAPTURES
// ═══════════════════════════════════════════════════════════════════════════════
export interface ICapture {
    _id: string;
    type: 'Idea' | 'Task' | 'Article' | 'Follow-up' | 'Money' | 'Urgent' | 'Journal';
    text: string;
    emoji: string;
    createdAt: string;
}

export const captureApi = {
    getAll: () => api.get('/captures').then(data),
    create: (d: Omit<ICapture, '_id' | 'createdAt'>) => api.post('/captures', d).then(data),
    remove: (id: string) => api.delete(`/captures/${id}`).then(data),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  TASKS
// ═══════════════════════════════════════════════════════════════════════════════
export interface ITask {
    _id: string;
    title: string;
    priority: 'high' | 'medium' | 'low';
    area: string;
    tab: 'today' | 'week' | 'someday';
    done: boolean;
    dueDate: string | null;
    createdAt: string;
}

export const taskApi = {
    getAll: () => api.get('/tasks').then(data),
    create: (d: Omit<ITask, '_id' | 'createdAt'>) => api.post('/tasks', d).then(data),
    update: (id: string, d: Partial<ITask>) => api.patch(`/tasks/${id}`, d).then(data),
    remove: (id: string) => api.delete(`/tasks/${id}`).then(data),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  FINANCE
// ═══════════════════════════════════════════════════════════════════════════════
export interface ITransaction {
    _id: string;
    type: 'income' | 'expense';
    amount: number;
    category: string;
    note: string;
    date: string;
    emoji: string;
    createdAt: string;
}

export const financeApi = {
    getAll: () => api.get('/finance').then(data),
    create: (d: Omit<ITransaction, '_id' | 'createdAt'>) => api.post('/finance', d).then(data),
    remove: (id: string) => api.delete(`/finance/${id}`).then(data),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  KNOWLEDGE
// ═══════════════════════════════════════════════════════════════════════════════
export interface INote {
    _id: string;
    title: string;
    type: 'Note' | 'Book' | 'Article' | 'Learning';
    content: string;
    tags: string[];
    emoji: string;
    createdAt: string;
}

export const knowledgeApi = {
    getAll: () => api.get('/knowledge').then(data),
    create: (d: Omit<INote, '_id' | 'createdAt'>) => api.post('/knowledge', d).then(data),
    update: (id: string, d: Partial<INote>) => api.put(`/knowledge/${id}`, d).then(data),
    remove: (id: string) => api.delete(`/knowledge/${id}`).then(data),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  GOALS
// ═══════════════════════════════════════════════════════════════════════════════
export interface IMilestone { _id?: string; text: string; done: boolean; }
export interface IGoal {
    _id: string;
    title: string;
    area: string;
    emoji: string;
    progress: number;
    deadline: string | null;
    milestones: IMilestone[];
    createdAt: string;
}

export const goalApi = {
    getAll: () => api.get('/goals').then(data),
    create: (d: Omit<IGoal, '_id' | 'createdAt'>) => api.post('/goals', d).then(data),
    update: (id: string, d: Partial<IGoal>) => api.put(`/goals/${id}`, d).then(data),
    remove: (id: string) => api.delete(`/goals/${id}`).then(data),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  HEALTH
// ═══════════════════════════════════════════════════════════════════════════════
export interface IHealthDay {
    date: string;
    habits: Record<string, boolean>;
    mood: string | null;
    moodNote: string;
    sleep: { bedtime: string; wakeup: string };
    energy: number;
}

export const healthApi = {
    getDay: (date: string) => api.get(`/health/${date}`).then(data),
    saveDay: (date: string, d: Partial<IHealthDay>) => api.put(`/health/${date}`, d).then(data),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  DASHBOARD STATS
// ═══════════════════════════════════════════════════════════════════════════════
export interface IDashboardStats {
    tasksToday: number;
    tasksDone: number;
    capturedToday: number;
    goalsOnTrack: number;
    goalsTotal: number;
    habitStreak: number;
}

export const statsApi = {
    get: () => api.get('/stats').then(data) as Promise<IDashboardStats>,
};
