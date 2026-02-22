// Stub roleService — real role management to be implemented in future
// Features/roles uses this for fetching permissions and role lists
const RoleService = {
    getRoles: async () => [],
    createRole: async (_data: any) => null,
    updateRole: async (_id: string, _data: any) => null,
    deleteRole: async (_id: string) => null,
};

export default RoleService;
export const roleService = RoleService;
