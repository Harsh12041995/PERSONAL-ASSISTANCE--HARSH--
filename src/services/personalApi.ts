// src/services/personalApi.ts
// Unified API service for all personal module pages

import axios from 'axios';

const BASE = import.meta.env.VITE_API_BASE_URL || '/api';

// ─── Auth token helper ────────────────────────────────────────────────────────
const token = () => localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken') || '';

const api = axios.create({
    baseURL: `${BASE}/personal`,
    timeout: 60000 // 60s for AI processing 
});

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
    text: string; emoji: string; createdAt: string;
    rawText?: string;
    isRefined?: boolean;
    source?: string;
    archivedAt?: string | null;
    convertedTo?: { kind: 'task' | 'goal' | 'event' | null; id: string };
}
export const captureApi = {
    getAll: () => api.get('/captures').then(data),
    create: (d: Omit<ICapture, '_id' | 'createdAt'>) => api.post('/captures', d).then(data),
    update: (id: string, d: Partial<ICapture>) => api.put(`/captures/${id}`, d).then(data),
    remove: (id: string) => api.delete(`/captures/${id}`).then(data),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  PUSH NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════
//  FOCUS + GAMIFICATION
// ═══════════════════════════════════════════════════════════════════════════════
export interface IFocusSession { _id: string; label: string; taskId?: string | null; minutes: number; date: string; completedAt: string; }
export interface IAchievement { id: string; emoji: string; name: string; desc: string; unlocked: boolean; }
export interface IGamification {
    xp: number; level: number; levelProgress: number; xpIntoLevel: number; xpForNext: number;
    habitStreak: number; focusStreak: number;
    stats: { tasksCompleted: number; goalsCompleted: number; transactions: number; captures: number; habitChecks: number; habitStreak: number; focusMinutes: number; focusSessions: number; focusStreak: number };
    achievements: IAchievement[];
}
export const focusApi = {
    getAll: (): Promise<{ sessions: IFocusSession[]; todayMinutes: number; totalMinutes: number }> => api.get('/focus').then(data),
    create: (d: { label: string; minutes: number; taskId?: string | null }) => api.post('/focus', d).then(data),
    remove: (id: string) => api.delete(`/focus/${id}`).then(data),
};
export const gamificationApi = {
    get: (): Promise<IGamification> => api.get('/gamification').then(data),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  DAILY RITUALS
// ═══════════════════════════════════════════════════════════════════════════════
export interface IRitual {
    _id?: string; date: string;
    morning: { intention: string; priorities: string[]; done: boolean };
    evening: { wins: string[]; gratitude: string; tomorrow: string; rating: number; done: boolean };
}
export interface IRitualContext {
    ritual: IRitual | null;
    context: { tasks: ITask[]; events: ICalendarEvent[] };
}
export interface IWeeklyReview {
    from: string; to: string; daysLogged: number; morningsPlanned: number;
    eveningsReflected: number; avgRating: number;
    wins: { date: string; win: string }[]; rituals: IRitual[];
}
export const ritualApi = {
    getDay: (date: string): Promise<IRitualContext> => api.get(`/rituals/${date}`).then(data),
    save: (date: string, d: Partial<IRitual>) => api.put(`/rituals/${date}`, d).then(data),
    weekly: (): Promise<IWeeklyReview> => api.get('/rituals/weekly').then(data),
};

export interface IPushSub { endpoint: string; keys: { p256dh: string; auth: string }; }
export const pushApi = {
    vapid: (): Promise<{ enabled: boolean; publicKey: string }> => api.get('/push/vapid').then(data),
    subscribe: (sub: IPushSub) => api.post('/push/subscribe', sub).then(data),
    unsubscribe: (endpoint: string) => api.post('/push/unsubscribe', { endpoint }).then(data),
    test: () => api.post('/push/test').then(data),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  TASKS
// ═══════════════════════════════════════════════════════════════════════════════
export interface ITask {
    _id: string; title: string; priority: 'high' | 'medium' | 'low';
    area: string; tab: 'today' | 'week' | 'someday'; done: boolean;
    dueDate: string | null; createdAt: string;
}
export const taskApi = {
    getAll: () => api.get('/tasks').then(data),
    create: (d: Omit<ITask, '_id' | 'createdAt'>) => api.post('/tasks', d).then(data),
    update: (id: string, d: Partial<ITask>) => api.patch(`/tasks/${id}`, d).then(data),
    remove: (id: string) => api.delete(`/tasks/${id}`).then(data),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  FINANCE & BUDGETS
// ═══════════════════════════════════════════════════════════════════════════════
export interface ITransaction {
    _id: string; type: 'income' | 'expense'; amount: number;
    category: string; note: string; date: string; emoji: string; createdAt: string;
    recurrence?: 'none' | 'weekly' | 'monthly'; recurringId?: string | null; lastRun?: string;
}
export interface IBudget { _id: string; category: string; limit: number; emoji: string; period: string; color: string; }
export const financeApi = {
    getAll: () => api.get('/finance').then(data),
    create: (d: Omit<ITransaction, '_id' | 'createdAt'>) => api.post('/finance', d).then(data),
    update: (id: string, d: Partial<ITransaction>) => api.put(`/finance/${id}`, d).then(data),
    remove: (id: string) => api.delete(`/finance/${id}`).then(data),
};
export const budgetApi = {
    getAll: () => api.get('/budgets').then(data),
    upsert: (d: Omit<IBudget, '_id'>) => api.post('/budgets', d).then(data),
    remove: (id: string) => api.delete(`/budgets/${id}`).then(data),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  KNOWLEDGE
// ═══════════════════════════════════════════════════════════════════════════════
export interface INote {
    _id: string; title: string; type: 'Note' | 'Book' | 'Article' | 'Learning';
    content: string; tags: string[]; emoji: string; createdAt: string;
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
    _id: string; title: string; area: string; emoji: string;
    progress: number; deadline: string | null; milestones: IMilestone[]; createdAt: string;
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
    date: string; habits: Record<string, boolean>; mood: string | null;
    moodNote: string; sleep: { bedtime: string; wakeup: string }; energy: number;
}
export const healthApi = {
    getDay: (date: string) => api.get(`/health/${date}`).then(data),
    saveDay: (date: string, d: Partial<IHealthDay>) => api.put(`/health/${date}`, d).then(data),
    getRange: (from: string, to: string): Promise<IHealthDay[]> =>
        api.get(`/health?from=${from}&to=${to}`).then(data),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  JOURNAL
// ═══════════════════════════════════════════════════════════════════════════════
export interface IJournal {
    _id?: string; date: string; content: string; mood: string; tags: string[]; wordCount?: number;
}
export const journalApi = {
    getAll: () => api.get('/journal').then(data),
    getDay: (date: string) => api.get(`/journal/${date}`).then(data),
    saveDay: (date: string, d: Partial<IJournal>) => api.put(`/journal/${date}`, d).then(data),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  CAREER
// ═══════════════════════════════════════════════════════════════════════════════
export interface ICareerProfile {
    currentRole: string; experienceYrs: number; linkedInUrl: string;
    naukriUrl: string; portfolioUrl: string; summary: string;
}
export interface IJob {
    _id: string; company: string; role: string; type: string;
    status: string; date: string; notes: string; salary: string; location: string; url: string;
}
export interface ICert {
    _id: string; name: string; issuer: string; emoji: string;
    issued: string; expires: string; status: string; credentialUrl: string;
}
export interface ISkill { _id: string; name: string; level: number; category: string; emoji: string; }

export const careerApi = {
    getProfile: () => api.get('/career/profile').then(data),
    saveProfile: (d: Partial<ICareerProfile>) => api.put('/career/profile', d).then(data),

    getJobs: () => api.get('/career/jobs').then(data),
    createJob: (d: Omit<IJob, '_id'>) => api.post('/career/jobs', d).then(data),
    updateJob: (id: string, d: Partial<IJob>) => api.put(`/career/jobs/${id}`, d).then(data),
    deleteJob: (id: string) => api.delete(`/career/jobs/${id}`).then(data),

    getCerts: () => api.get('/career/certs').then(data),
    createCert: (d: Omit<ICert, '_id'>) => api.post('/career/certs', d).then(data),
    updateCert: (id: string, d: Partial<ICert>) => api.put(`/career/certs/${id}`, d).then(data),
    deleteCert: (id: string) => api.delete(`/career/certs/${id}`).then(data),

    getSkills: () => api.get('/career/skills').then(data),
    createSkill: (d: Omit<ISkill, '_id'>) => api.post('/career/skills', d).then(data),
    updateSkill: (id: string, d: Partial<ISkill>) => api.put(`/career/skills/${id}`, d).then(data),
    deleteSkill: (id: string) => api.delete(`/career/skills/${id}`).then(data),
    processCv: (cvText: string) => api.post('/career/process-cv', { cvText }).then(data),
    matchJob: (jobDescription: string) => api.post('/career/match-job', { jobDescription }).then(data),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  SOCIAL
// ═══════════════════════════════════════════════════════════════════════════════
export interface IInteraction {
    date?: string; type: 'call' | 'message' | 'meeting' | 'email' | 'note'; note: string;
}
export interface IContact {
    _id: string; name: string; relationship: string; phone: string; email: string;
    lastTalked: string; notes: string; followUpDays: number; tags: string[];
    socialLinks: { instagram: string; linkedin: string; twitter: string; };
    interactions?: IInteraction[];
}
export interface IContentIdea {
    _id: string; title: string; platform: string; status: string;
    notes: string; tags: string[]; dueDate: string;
}
export interface ISocialPlatform {
    _id: string; platform: string; handle: string; followers: number;
    following: number; engagement: string; lastPost: string; profileUrl: string; emoji: string;
}

export const socialApi = {
    getContacts: () => api.get('/social/contacts').then(data),
    createContact: (d: Omit<IContact, '_id'>) => api.post('/social/contacts', d).then(data),
    updateContact: (id: string, d: Partial<IContact>) => api.put(`/social/contacts/${id}`, d).then(data),
    deleteContact: (id: string) => api.delete(`/social/contacts/${id}`).then(data),

    getIdeas: () => api.get('/social/ideas').then(data),
    createIdea: (d: Omit<IContentIdea, '_id'>) => api.post('/social/ideas', d).then(data),
    updateIdea: (id: string, d: Partial<IContentIdea>) => api.put(`/social/ideas/${id}`, d).then(data),
    deleteIdea: (id: string) => api.delete(`/social/ideas/${id}`).then(data),

    getPlatforms: () => api.get('/social/platforms').then(data),
    upsertPlatform: (d: Omit<ISocialPlatform, '_id'>) => api.post('/social/platforms', d).then(data),
    deletePlatform: (id: string) => api.delete(`/social/platforms/${id}`).then(data),
};

// ═══════════════════════════════════════════════════════════════════════════════
//  SETTINGS
// ═══════════════════════════════════════════════════════════════════════════════
export interface IUserSettings {
    displayName: string; profileImage: string; bio: string; timezone: string; theme: 'light' | 'dark' | 'system';
    notifications: {
        dailyDigest: boolean; habitReminders: boolean;
        goalDeadlines: boolean; contactFollowUp: boolean;
    };
    integrations: {
        whatsappEnabled: boolean;
        whatsappNumber: string;
        telegramEnabled: boolean;
        telegramUsername: string;
    };
    workflowManager?: {
        connections: {
            instagram: boolean;
            googleDrive: boolean;
            captionEngine: boolean;
        };
        ioPoints: {
            driveInputFolderId: string;
            dmInputMode: 'webhook' | 'manual' | 'hybrid';
            instagramOutputAccountId: string;
            archiveOutputFolderId: string;
            alertOutputChannel: string;
        };
        dmRules: {
            leadKeywords: string;
            urgentKeywords: string;
            autoAcknowledge: boolean;
            slaMinutes: number;
        };
    };
    geminiApiKey: string; chatgptApiKey: string; currency: string; dateFormat: string;
    habits?: { key: string; label?: string; emoji?: string }[];
}
export const settingsApi = {
    get: () => api.get('/settings').then(data),
    save: (d: Partial<IUserSettings>) => api.put('/settings', d).then(data),
};

export interface ICalendarEvent {
    _id: string;
    title: string;
    start: string;
    end?: string;
    calendar: string;
    allDay?: boolean;
}
export const calendarApi = {
    getAll: () => api.get('/calendar/events').then(data),
    create: (d: Omit<ICalendarEvent, '_id'>) => api.post('/calendar/events', d).then(data),
    update: (id: string, d: Partial<ICalendarEvent>) => api.put(`/calendar/events/${id}`, d).then(data),
    remove: (id: string) => api.delete(`/calendar/events/${id}`).then(data),
};

export interface IWorkflowConfig {
    connections: {
        instagram: boolean;
        googleDrive: boolean;
        captionEngine: boolean;
    };
    ioPoints: {
        driveInputFolderId: string;
        dmInputMode: 'webhook' | 'manual' | 'hybrid';
        instagramOutputAccountId: string;
        archiveOutputFolderId: string;
        alertOutputChannel: string;
    };
    dmRules: {
        leadKeywords: string;
        urgentKeywords: string;
        autoAcknowledge: boolean;
        slaMinutes: number;
    };
    browserWorkspace?: {
        homeUrl: string;
        allowedDomains: string;
        allowAnyUrl?: boolean;
        sessionTracking: boolean;
        recordingEnabled: boolean;
        integrationWebhookUrl: string;
        integrationAuthToken: string;
        emitVisitEvents: boolean;
        emitRecordingEvents: boolean;
        socialMode?: boolean;
    };
}

export interface IWorkflowQueueItem {
    _id: string;
    fileName: string;
    driveFolder: string;
    caption: string;
    status: 'draft' | 'ready' | 'scheduled' | 'posted';
    scheduledAt: string;
}

export interface IWorkflowDMActivity {
    _id: string;
    sender: string;
    message: string;
    category: 'lead' | 'support' | 'spam' | 'general';
    status: 'new' | 'acknowledged' | 'escalated' | 'resolved';
    receivedAt: string;
}

export const workflowApi = {
    getConfig: () => api.get('/workflow/config').then(data) as Promise<IWorkflowConfig>,
    saveConfig: (d: IWorkflowConfig) => api.put('/workflow/config', d).then(data) as Promise<IWorkflowConfig>,

    getQueue: () => api.get('/workflow/queue').then(data) as Promise<IWorkflowQueueItem[]>,
    createQueueItem: (d: Omit<IWorkflowQueueItem, '_id'>) => api.post('/workflow/queue', d).then(data) as Promise<IWorkflowQueueItem>,
    updateQueueItem: (id: string, d: Partial<IWorkflowQueueItem>) => api.put(`/workflow/queue/${id}`, d).then(data) as Promise<IWorkflowQueueItem>,
    deleteQueueItem: (id: string) => api.delete(`/workflow/queue/${id}`).then(data),

    getDMActivity: () => api.get('/workflow/dm-activity').then(data) as Promise<IWorkflowDMActivity[]>,
    createDMActivity: (d: Omit<IWorkflowDMActivity, '_id'>) => api.post('/workflow/dm-activity', d).then(data) as Promise<IWorkflowDMActivity>,
    updateDMActivity: (id: string, d: Partial<IWorkflowDMActivity>) => api.put(`/workflow/dm-activity/${id}`, d).then(data) as Promise<IWorkflowDMActivity>,
};

export const automationApi = {
    run: () => api.post('/automation/run').then(data),
};


// ═══════════════════════════════════════════════════════════════════════════════
//  DASHBOARD STATS
// ═══════════════════════════════════════════════════════════════════════════════
export interface IDashboardStats {
    tasksToday: number; tasksDone: number; capturedToday: number;
    goalsOnTrack: number; goalsTotal: number; habitStreak: number; habitsDoneToday: number;
}
export const statsApi = {
    get: () => api.get('/dashboard/stats').then(data) as Promise<IDashboardStats>,
};
