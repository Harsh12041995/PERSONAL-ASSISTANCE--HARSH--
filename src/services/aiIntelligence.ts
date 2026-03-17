// src/services/aiIntelligence.ts
import axios from 'axios';

const BASE = import.meta.env.VITE_API_BASE_URL || '/api';
const token = () => localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken') || '';

const api = axios.create({ baseURL: `${BASE}/personal` });

api.interceptors.request.use(cfg => {
    const t = token();
    if (t) cfg.headers.Authorization = `Bearer ${t}`;
    return cfg;
});

const unpack = (res: any) => res.data.data;

export const aiIntelligence = {
    /**
     * Get AI prioritization suggestions for current tasks
     */
    analyzeTasks: async () => {
        return api.post('/tasks/analyze').then(unpack);
    },

    /**
     * Generate a TL;DR summary for a specific note
     */
    summarizeNote: async (noteId: string) => {
        return api.post(`/knowledge/${noteId}/summarize`).then(unpack);
    },

    /**
     * Get AI dashboard insights
     */
    getDashboardInsights: async () => {
        return api.get('/intelligence/dashboard').then(unpack);
    },

    /**
     * Refine raw voice transcript using AI
     */
    refineTranscript: async (text: string) => {
        return api.post('/intelligence/refine', { text }).then(unpack);
    }
};
