// Stub userService — real user management to be implemented in future
import axiosInstance from './axiosInstance';

export const userService = {
  getUsers: async () => { try { const r = await axiosInstance.get('/users'); return r.data.data || []; } catch { return []; } },
  getUserById: async (id: string) => { try { const r = await axiosInstance.get(`/users/${id}`); return r.data.data; } catch { return null; } },
  createUser: async (data: any) => { const r = await axiosInstance.post('/users', data); return r.data.data; },
  updateUser: async (id: string, data: any) => { const r = await axiosInstance.put(`/users/${id}`, data); return r.data.data; },
  deleteUser: async (id: string) => { await axiosInstance.delete(`/users/${id}`); },
};
