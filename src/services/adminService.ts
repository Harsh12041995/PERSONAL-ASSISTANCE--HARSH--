import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api/v1";

const getAuthConfig = () => {
    const token = localStorage.getItem("token");
    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};

export const adminService = {
    getUsers: async () => {
        const response = await axios.get(`${API_BASE_URL}/admin/users`, getAuthConfig());
        return response.data;
    },

    updateUserStatus: async (userId: string, status: 'pending' | 'approved' | 'blocked') => {
        const response = await axios.put(
            `${API_BASE_URL}/admin/users/${userId}/status`,
            { status },
            getAuthConfig()
        );
        return response.data;
    },

    deleteUser: async (userId: string) => {
        const response = await axios.delete(
            `${API_BASE_URL}/admin/users/${userId}`,
            getAuthConfig()
        );
        return response.data;
    },
};
