// src/services/staff.api.ts
// Client for the CEO OS layer: approval queue, briefs, ghostwriter, portfolio,
// decisions, activity, and ingest sources.

import axios from 'axios';

const BASE = import.meta.env.VITE_API_BASE_URL || '/api';
const token = () => localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken') || '';

const api = axios.create({ baseURL: BASE, timeout: 120000 }); // LLM calls can be slow locally
api.interceptors.request.use(cfg => {
    const t = token();
    if (t) cfg.headers.Authorization = `Bearer ${t}`;
    return cfg;
});

const data = (res: { data: { data: unknown } }) => res.data.data;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IWorkItem {
    _id: string;
    type: 'draft' | 'decision' | 'alert';
    agentRole: 'ghostwriter' | 'analyst' | 'chief_of_staff' | 'system';
    title: string;
    content: string;
    editedContent: string;
    meta: { platform?: string; projectId?: string | null; sourceId?: string };
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
    reviewedAt: string | null;
}

export interface IBrief {
    _id: string;
    kind: 'morning' | 'portfolio';
    date: string;
    content: string;
    generatedBy: 'llm' | 'template';
    stats: Record<string, number>;
    createdAt: string;
}

export interface IProject {
    _id: string;
    name: string;
    slug: string;
    description: string;
    status: 'active' | 'parked' | 'killed' | 'done';
    nextAction: string;
    tractionSignal: string;
    attentionCost: number;
    tags: string[];
    links: { repo?: string; deploy?: string; docs?: string };
    githubRepo: string;
    lastActivityAt: string | null;
    statusChangedAt: string;
    updatedAt: string;
}

export interface IDecision {
    _id: string;
    projectId: string | null;
    title: string;
    rationale: string;
    reviewAt: string;
    outcome: string;
    status: 'open' | 'reviewed';
    createdAt: string;
}

export interface IActivityEvent {
    _id: string;
    projectId: string | null;
    source: 'github' | 'rss' | 'manual';
    type: string;
    summary: string;
    url: string;
    occurredAt: string;
}

export interface IIngestSource {
    _id: string;
    kind: 'rss';
    url: string;
    label: string;
    enabled: boolean;
    lastRunAt: string | null;
    lastStatus: string;
    lastItemCount: number;
}

export interface IBlogPostSummary {
    _id: string;
    title: string;
    link: string;
    publishedAt: string | null;
    ghostwrittenAt: string | null;
}

// ─── Staff: queue + briefs + agents ──────────────────────────────────────────

export const staffApi = {
    getQueue: (status: 'pending' | 'approved' | 'rejected' = 'pending') =>
        api.get(`/staff/queue?status=${status}`).then(data) as Promise<IWorkItem[]>,
    approve: (id: string, editedContent?: string) =>
        api.post(`/staff/queue/${id}/approve`, editedContent !== undefined ? { editedContent } : {}).then(data) as Promise<IWorkItem>,
    reject: (id: string) => api.post(`/staff/queue/${id}/reject`).then(data) as Promise<IWorkItem>,
    saveEdit: (id: string, editedContent: string) =>
        api.put(`/staff/queue/${id}`, { editedContent }).then(data) as Promise<IWorkItem>,

    getTodayBrief: () => api.get('/staff/brief/today').then(data) as Promise<IBrief>,
    listBriefs: (kind?: 'morning' | 'portfolio') =>
        api.get(`/staff/briefs${kind ? `?kind=${kind}` : ''}`).then(data) as Promise<IBrief[]>,
    runBrief: () => api.post('/staff/brief/run').then(data) as Promise<IBrief>,

    ghostwriteText: (title: string, text: string) =>
        api.post('/staff/ghostwrite', { sourceType: 'text', title, text }).then(data) as Promise<IWorkItem[]>,
    ghostwritePost: (blogPostId: string) =>
        api.post('/staff/ghostwrite', { sourceType: 'blogpost', blogPostId }).then(data) as Promise<IWorkItem[]>,
    listPosts: () => api.get('/staff/posts').then(data) as Promise<IBlogPostSummary[]>,

    runReview: () => api.post('/staff/review/run').then(data) as Promise<{ brief: IBrief; decisionsQueued: number; projects: number }>,
};

// ─── Portfolio ────────────────────────────────────────────────────────────────

export const portfolioApi = {
    listProjects: () => api.get('/portfolio/projects').then(data) as Promise<IProject[]>,
    createProject: (d: Partial<IProject>) => api.post('/portfolio/projects', d).then(data) as Promise<IProject>,
    updateProject: (id: string, d: Partial<IProject>) => api.put(`/portfolio/projects/${id}`, d).then(data) as Promise<IProject>,
    deleteProject: (id: string) => api.delete(`/portfolio/projects/${id}`).then(data),
    logActivity: (id: string, summary: string) =>
        api.post(`/portfolio/projects/${id}/activity`, { summary }).then(data) as Promise<IActivityEvent>,
    listActivity: (projectId?: string) =>
        api.get(`/portfolio/activity${projectId ? `?projectId=${projectId}` : ''}`).then(data) as Promise<IActivityEvent[]>,

    listDecisions: () => api.get('/portfolio/decisions').then(data) as Promise<IDecision[]>,
    createDecision: (d: Partial<IDecision>) => api.post('/portfolio/decisions', d).then(data) as Promise<IDecision>,
    updateDecision: (id: string, d: Partial<IDecision>) => api.put(`/portfolio/decisions/${id}`, d).then(data) as Promise<IDecision>,
};

// ─── Ingest sources ───────────────────────────────────────────────────────────

export interface IGithubImportResult {
    repos: number;
    projectsCreated: number;
    projectsUpdated: number;
    activityLogged: number;
}

export const ingestApi = {
    listSources: () => api.get('/ingest/sources').then(data) as Promise<IIngestSource[]>,
    createSource: (url: string, label?: string) =>
        api.post('/ingest/sources', { url, label }).then(data) as Promise<IIngestSource>,
    deleteSource: (id: string) => api.delete(`/ingest/sources/${id}`).then(data),
    runSource: (id: string) => api.post(`/ingest/sources/${id}/run`).then(data) as Promise<{ added: number; total: number }>,

    importGithub: (user?: string) =>
        api.post('/ingest/github/import', user ? { user } : {}).then(data) as Promise<IGithubImportResult>,
    registerGithubWebhooks: () =>
        api.post('/ingest/github/webhooks').then(data) as Promise<{ callbackUrl: string; results: { repo: string; status: string }[] }>,
};
