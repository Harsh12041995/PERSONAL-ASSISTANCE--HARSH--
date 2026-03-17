import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';
const token = () => localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken') || '';

const api = axios.create({ baseURL: `${BASE}/chat` });

api.interceptors.request.use(cfg => {
  const t = token();
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

export const chatApiService = {
  getMessages: async (conversationId: string, _userId: string, page: number, limit: number) => {
    try {
      const response = await api.get(`/conversations/${conversationId}/messages`, {
        params: { page, limit }
      });
      return response.data;
    } catch (error: any) {
      console.error('Failed to get chat messages:', error);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },

  sendMessage: async (content: string, _userId: string, conversationId?: string) => {
    try {
      const response = await api.post('/bot', {
        content,
        conversationId
      });
      return response.data;
    } catch (error: any) {
      console.error('Failed to send chat message:', error);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },

  clearConversation: async (conversationId: string) => {
    try {
      const response = await api.delete(`/conversations/${conversationId}`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to clear conversation:', error);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },
};
