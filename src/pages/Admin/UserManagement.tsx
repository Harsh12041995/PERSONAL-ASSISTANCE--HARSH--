import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";
import PageMeta from "../../shared/PageMeta";
import { adminService, type AdminActivity, type AdminAnalytics, type PermissionCatalogItem } from "../../services/adminService";

type PermissionMode = 'role' | 'custom';

interface User {
  _id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: { name: string };
  permissions: string[];
  permissionMode?: PermissionMode;
  accountConfig?: {
    loginAccess?: boolean;
    mustChangePassword?: boolean;
    twoFactorRequired?: boolean;
  };
  status: 'pending' | 'approved' | 'blocked';
  roleMapping?: {
    roleExists: boolean;
    rolePermissions: string[];
    effectivePermissions: string[];
    permissionMode: PermissionMode;
  };
}

interface Role {
  _id: string;
  name: string;
  description: string;
  permissions: string[];
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissionCatalog, setPermissionCatalog] = useState<PermissionCatalogItem[]>([]);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [activities, setActivities] = useState<AdminActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRolesModal, setShowRolesModal] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', description: '', permissions: [] as string[] });
  const [editingRoles, setEditingRoles] = useState<Record<string, Role>>({});

  const refreshAll = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes, catalogRes, analyticsRes, activityRes] = await Promise.all([
        adminService.getUsers(),
        adminService.getRoles(),
        adminService.getPermissionCatalog(),
        adminService.getAnalytics(),
        adminService.getActivities(10)
      ]);
      if (usersRes.success) setUsers(usersRes.data);
      if (rolesRes.success) {
        setRoles(rolesRes.data);
        const roleEditState: Record<string, Role> = {};
        rolesRes.data.forEach((r: Role) => (roleEditState[r._id] = { ...r }));
        setEditingRoles(roleEditState);
      }
      if (catalogRes.success) setPermissionCatalog(catalogRes.data);
      if (analyticsRes.success) setAnalytics(analyticsRes.data);
      if (activityRes.success) setActivities(activityRes.data);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load user management');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const roleMismatchCount = useMemo(() => users.filter((u) => u.roleMapping && !u.roleMapping.roleExists).length, [users]);

  const togglePermission = (list: string[], permissionId: string) => (
    list.includes(permissionId) ? list.filter((p) => p !== permissionId) : [...list, permissionId]
  );

  const handleRoleUpdate = async (userId: string, roleName: string) => {
    try {
      await adminService.updateRole(userId, roleName);
      toast.success('Role updated');
      await refreshAll();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update role');
    }
  };

  const handleStatusUpdate = async (userId: string, status: 'pending' | 'approved' | 'blocked') => {
    try {
      await adminService.updateUserStatus(userId, status);
      toast.success('Status updated');
      await refreshAll();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Delete this user permanently?')) return;
    try {
      await adminService.deleteUser(userId);
      toast.success('User deleted');
      await refreshAll();
    } catch {
      toast.error('Failed to delete user');
    }
  };

  const handlePermissionModeUpdate = async (user: User, mode: PermissionMode, permissions?: string[]) => {
    try {
      await adminService.updatePermissions(user._id, permissions || user.permissions || [], mode);
      toast.success('Permission configuration updated');
      await refreshAll();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update permissions');
    }
  };

  const handleAccountConfigUpdate = async (user: User, patch: { loginAccess?: boolean; mustChangePassword?: boolean; twoFactorRequired?: boolean }) => {
    try {
      await adminService.updateUserAccountConfig(user._id, {
        loginAccess: patch.loginAccess ?? user.accountConfig?.loginAccess ?? true,
        mustChangePassword: patch.mustChangePassword ?? user.accountConfig?.mustChangePassword ?? false,
        twoFactorRequired: patch.twoFactorRequired ?? user.accountConfig?.twoFactorRequired ?? false
      });
      toast.success('Account configuration saved');
      await refreshAll();
    } catch {
      toast.error('Failed to save account configuration');
    }
  };

  const handleCreateRole = async () => {
    if (!newRole.name.trim()) return toast.error('Role name is required');
    try {
      await adminService.createRole(newRole);
      setNewRole({ name: '', description: '', permissions: [] });
      toast.success('Role created');
      await refreshAll();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create role');
    }
  };

  const handleRolePermissionSave = async (role: Role) => {
    try {
      await adminService.updateRoleDefinition(role._id, {
        name: role.name,
        description: role.description,
        permissions: role.permissions
      });
      toast.success(`Saved ${role.name}`);
      await refreshAll();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save role');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-8">
      <PageMeta title="Admin - User Management" />

      <div className="flex items-end justify-between border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">User Management</h1>
          <p className="text-gray-500 mt-1">Role permissions, user permission mode, and account security controls.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={refreshAll} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold">Refresh</button>
          <Link to="/admin/permission-matrix" className="px-4 py-2 rounded-xl border border-indigo-200 text-indigo-700 text-sm font-bold">
            Open Matrix
          </Link>
          <button onClick={() => setShowRolesModal(true)} className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-bold">Permission Manager</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl border bg-white"><p className="text-xs text-gray-500">Users</p><p className="text-2xl font-bold">{analytics?.totals.totalUsers ?? users.length}</p></div>
        <div className="p-4 rounded-2xl border bg-white"><p className="text-xs text-gray-500">Roles</p><p className="text-2xl font-bold">{analytics?.totals.totalRoles ?? roles.length}</p></div>
        <div className="p-4 rounded-2xl border bg-white"><p className="text-xs text-gray-500">Custom Permission Users</p><p className="text-2xl font-bold">{analytics?.totals.customPermissionsUsers ?? 0}</p></div>
        <div className="p-4 rounded-2xl border bg-white"><p className="text-xs text-gray-500">Activities (7d)</p><p className="text-2xl font-bold">{analytics?.totals.activitiesLast7Days ?? 0}</p></div>
        <div className="p-4 rounded-2xl border border-red-100 bg-red-50"><p className="text-xs text-red-600">Role Mapping Issues</p><p className="text-2xl font-bold text-red-700">{roleMismatchCount}</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-3xl border border-gray-100 bg-white overflow-hidden">
          <Table className="w-full">
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableCell isHeader className="px-6 py-4 text-xs">User</TableCell>
                <TableCell isHeader className="px-6 py-4 text-xs">Role</TableCell>
                <TableCell isHeader className="px-6 py-4 text-xs">Permission Mode</TableCell>
                <TableCell isHeader className="px-6 py-4 text-xs">Account Config</TableCell>
                <TableCell isHeader className="px-6 py-4 text-xs text-right">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user._id}>
                  <TableCell className="px-6 py-4">
                    <p className="font-semibold text-sm">{user.first_name} {user.last_name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <select value={user.role?.name || 'User'} onChange={(e) => handleRoleUpdate(user._id, e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1 text-sm">
                      {roles.map((role) => <option key={role._id} value={role.name}>{role.name}</option>)}
                    </select>
                    <p className={`text-[10px] mt-1 font-semibold ${user.roleMapping?.roleExists ? 'text-emerald-600' : 'text-red-600'}`}>
                      {user.roleMapping?.roleExists ? 'Role mapped' : 'Role mapping missing'}
                    </p>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePermissionModeUpdate(user, 'role')}
                        className={`px-2 py-1 rounded text-xs ${user.roleMapping?.permissionMode !== 'custom' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100'}`}
                      >Role Inherited</button>
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowPermissionsModal(true);
                        }}
                        className={`px-2 py-1 rounded text-xs ${user.roleMapping?.permissionMode === 'custom' ? 'bg-violet-100 text-violet-700' : 'bg-gray-100'}`}
                      >Custom</button>
                    </div>
                    <p className="text-[10px] mt-1 text-gray-500">Effective: {user.roleMapping?.effectivePermissions?.length || 0}</p>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="space-y-1 text-xs">
                      <label className="flex items-center gap-2"><input type="checkbox" checked={user.accountConfig?.loginAccess ?? true} onChange={(e) => handleAccountConfigUpdate(user, { loginAccess: e.target.checked })} />Login Access</label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={user.accountConfig?.mustChangePassword ?? false} onChange={(e) => handleAccountConfigUpdate(user, { mustChangePassword: e.target.checked })} />Force Password Reset</label>
                      <label className="flex items-center gap-2 opacity-40 cursor-not-allowed" title="2FA isn't implemented yet"><input type="checkbox" disabled checked={false} />Require 2FA <span className="text-[10px] italic">(coming soon)</span></label>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 text-xs font-bold">
                      <button onClick={() => handleStatusUpdate(user._id, user.status === 'blocked' ? 'approved' : 'blocked')} className="text-amber-700">{user.status === 'blocked' ? 'Unblock' : 'Block'}</button>
                      <button onClick={() => handleDeleteUser(user._id)} className="text-red-700">Delete</button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {loading && <p className="px-6 py-4 text-xs text-gray-500">Loading...</p>}
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-4">
          <h3 className="font-bold text-sm mb-3">Admin Activity</h3>
          <div className="space-y-2 max-h-[550px] overflow-auto">
            {activities.map((activity) => (
              <div key={activity._id} className="border border-gray-100 rounded-lg p-2">
                <p className="text-xs font-bold">{activity.action.split('_').join(' ')}</p>
                <p className="text-[11px] text-gray-600">{activity.actor?.name} &rarr; {activity.target?.email || 'N/A'}</p>
                <p className="text-[10px] text-gray-400">{new Date(activity.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showPermissionsModal && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div className="absolute inset-0 bg-gray-900/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPermissionsModal(false)} />
            <motion.div className="relative bg-white w-full max-w-xl rounded-3xl p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
              <h3 className="text-lg font-extrabold">Custom Permission Manager</h3>
              <p className="text-sm text-gray-500">{selectedUser.first_name} {selectedUser.last_name} ({selectedUser.email})</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
                {permissionCatalog.map((permission) => {
                  const checked = (selectedUser.permissions || []).includes(permission.id);
                  return (
                    <label key={permission.id} className="border border-gray-200 rounded-lg p-2 flex items-center justify-between text-sm">
                      <span>{permission.name}</span>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => setSelectedUser((prev) => prev ? { ...prev, permissions: togglePermission(prev.permissions || [], permission.id) } : prev)}
                      />
                    </label>
                  );
                })}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button className="px-4 py-2 border rounded-xl" onClick={() => setShowPermissionsModal(false)}>Cancel</button>
                <button
                  className="px-4 py-2 bg-violet-600 text-white rounded-xl"
                  onClick={async () => {
                    if (!selectedUser) return;
                    await handlePermissionModeUpdate(selectedUser, 'custom', selectedUser.permissions || []);
                    setShowPermissionsModal(false);
                  }}
                >Save Custom Permissions</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRolesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div className="absolute inset-0 bg-gray-900/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowRolesModal(false)} />
            <motion.div className="relative bg-white w-full max-w-4xl rounded-3xl p-6 max-h-[85vh] overflow-auto" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
              <h3 className="text-xl font-extrabold">Role Permission Manager</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-5">
                <div className="space-y-3 border border-gray-100 rounded-2xl p-4">
                  <p className="text-sm font-bold">Create Role</p>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Role name" value={newRole.name} onChange={(e) => setNewRole((s) => ({ ...s, name: e.target.value }))} />
                  <textarea className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Description" value={newRole.description} onChange={(e) => setNewRole((s) => ({ ...s, description: e.target.value }))} />
                  <div className="grid grid-cols-1 gap-1">
                    {permissionCatalog.map((permission) => (
                      <label key={permission.id} className="text-xs flex items-center justify-between border rounded px-2 py-1">
                        <span>{permission.name}</span>
                        <input type="checkbox" checked={newRole.permissions.includes(permission.id)} onChange={() => setNewRole((s) => ({ ...s, permissions: togglePermission(s.permissions, permission.id) }))} />
                      </label>
                    ))}
                  </div>
                  <button className="w-full bg-gray-900 text-white rounded-lg py-2 text-sm" onClick={handleCreateRole}>Create</button>
                </div>

                <div className="space-y-3">
                  {roles.map((role) => {
                    const editRole = editingRoles[role._id] || role;
                    return (
                      <div key={role._id} className="border border-gray-100 rounded-2xl p-4">
                        <input className="w-full border rounded-lg px-3 py-2 text-sm mb-2" value={editRole.name} onChange={(e) => setEditingRoles((s) => ({ ...s, [role._id]: { ...editRole, name: e.target.value } }))} />
                        <textarea className="w-full border rounded-lg px-3 py-2 text-sm mb-2" value={editRole.description || ''} onChange={(e) => setEditingRoles((s) => ({ ...s, [role._id]: { ...editRole, description: e.target.value } }))} />
                        <div className="grid grid-cols-1 gap-1 max-h-40 overflow-auto">
                          {permissionCatalog.map((permission) => (
                            <label key={permission.id} className="text-xs flex items-center justify-between border rounded px-2 py-1">
                              <span>{permission.name}</span>
                              <input
                                type="checkbox"
                                checked={(editRole.permissions || []).includes(permission.id)}
                                onChange={() => setEditingRoles((s) => ({ ...s, [role._id]: { ...editRole, permissions: togglePermission(editRole.permissions || [], permission.id) } }))}
                              />
                            </label>
                          ))}
                        </div>
                        <div className="flex justify-end mt-2">
                          <button className="px-3 py-1 bg-violet-600 text-white rounded text-xs" onClick={() => handleRolePermissionSave(editRole)}>Save Role</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserManagement;
