import api from "./axiosInstance";

export interface AdminAnalytics {
    totals: {
        totalUsers: number;
        totalRoles: number;
        usersCreatedLast30Days: number;
        activitiesLast7Days: number;
        customPermissionsUsers?: number;
    };
    statusBreakdown: {
        approved: number;
        pending: number;
        blocked: number;
    };
    roleDistribution: Array<{ role: string; count: number }>;
}

export interface AdminActivity {
    _id: string;
    actor: { userId: string; name: string; email: string; role: string };
    action: string;
    target?: { userId?: string; email?: string; role?: string };
    metadata?: Record<string, unknown>;
    createdAt: string;
}

export interface PermissionCatalogItem {
    id: string;
    name: string;
    category: string;
}

export const adminService = {
    getUsers: async () => (await api.get("/admin/users")).data,
    updateUserStatus: async (userId: string, status: 'pending' | 'approved' | 'blocked') => (await api.put(`/admin/users/${userId}/status`, { status })).data,
    deleteUser: async (userId: string) => (await api.delete(`/admin/users/${userId}`)).data,
    updateRole: async (userId: string, role: string) => (await api.patch(`/admin/users/${userId}/role`, { role })).data,
    updatePermissions: async (userId: string, permissions: string[], mode: 'role' | 'custom') => (await api.patch(`/admin/users/${userId}/permissions`, { permissions, mode })).data,
    updateUserAccountConfig: async (
        userId: string,
        payload: { loginAccess: boolean; mustChangePassword: boolean; twoFactorRequired: boolean }
    ) => (await api.patch(`/admin/users/${userId}/account-config`, payload)).data,

    getRoles: async () => (await api.get("/admin/roles")).data,
    createRole: async (roleData: { name: string; description?: string; permissions: string[] }) => (await api.post("/admin/roles", roleData)).data,
    updateRoleDefinition: async (roleId: string, roleData: { name?: string; description?: string; permissions?: string[] }) => (await api.put(`/admin/roles/${roleId}`, roleData)).data,
    deleteRole: async (roleId: string) => (await api.delete(`/admin/roles/${roleId}`)).data,

    getPermissionCatalog: async (): Promise<{ success: boolean; data: PermissionCatalogItem[] }> => (await api.get('/admin/permissions/catalog')).data,
    getAnalytics: async (): Promise<{ success: boolean; data: AdminAnalytics }> => (await api.get('/admin/analytics')).data,
    getActivities: async (limit = 20): Promise<{ success: boolean; data: AdminActivity[]; count: number }> => (await api.get(`/admin/activities?limit=${limit}`)).data
};
