import api from "./axiosInstance";

export interface Notification {
    _id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    isRead: boolean;
    createdAt: string;
}

export const notificationService = {
    getNotifications: async () => {
        const response = await api.get("/notifications");
        return response.data;
    },

    markAsRead: async (id: string) => {
        const response = await api.patch(`/notifications/${id}/read`);
        return response.data;
    },

    deleteNotification: async (id: string) => {
        const response = await api.delete(`/notifications/${id}`);
        return response.data;
    }
};
