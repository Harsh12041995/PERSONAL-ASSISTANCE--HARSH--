import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import PageMeta from '../../shared/PageMeta';
import { adminService, type PermissionCatalogItem } from '../../services/adminService';

interface Role {
  _id: string;
  name: string;
  description: string;
  permissions: string[];
}

const PermissionMatrix: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<PermissionCatalogItem[]>([]);
  const [draft, setDraft] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(true);
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [rolesRes, catalogRes] = await Promise.all([
        adminService.getRoles(),
        adminService.getPermissionCatalog()
      ]);

      if (rolesRes.success) {
        setRoles(rolesRes.data);
        const nextDraft: Record<string, Set<string>> = {};
        rolesRes.data.forEach((role: Role) => {
          nextDraft[role._id] = new Set(role.permissions || []);
        });
        setDraft(nextDraft);
      }
      if (catalogRes.success) setPermissions(catalogRes.data);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load permission matrix');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(permissions.map((p) => p.category))),
    [permissions]
  );

  const toggleCell = (roleId: string, permissionId: string) => {
    setDraft((prev) => {
      const set = new Set(prev[roleId] || []);
      if (set.has(permissionId)) set.delete(permissionId);
      else set.add(permissionId);
      return { ...prev, [roleId]: set };
    });
  };

  const bulkSetRole = (roleId: string, enable: boolean) => {
    const all = permissions.map((p) => p.id);
    setDraft((prev) => ({ ...prev, [roleId]: new Set(enable ? all : []) }));
  };

  const bulkSetCategory = (roleId: string, category: string, enable: boolean) => {
    const categoryIds = permissions.filter((p) => p.category === category).map((p) => p.id);
    setDraft((prev) => {
      const set = new Set(prev[roleId] || []);
      categoryIds.forEach((id) => {
        if (enable) set.add(id);
        else set.delete(id);
      });
      return { ...prev, [roleId]: set };
    });
  };

  const saveRole = async (role: Role) => {
    try {
      setSavingRoleId(role._id);
      await adminService.updateRoleDefinition(role._id, {
        permissions: Array.from(draft[role._id] || [])
      });
      toast.success(`${role.name} permissions saved`);
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save role permissions');
    } finally {
      setSavingRoleId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <PageMeta title="Admin - Permission Matrix" />
      <div className="flex items-end justify-between border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Permission Matrix</h1>
          <p className="text-sm text-gray-500 mt-1">Manage role-to-permission mapping with bulk controls.</p>
        </div>
        <button onClick={load} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold">Refresh</button>
      </div>

      {loading ? (
        <div className="p-8 text-sm text-gray-500">Loading permission matrix...</div>
      ) : (
        <div className="space-y-5">
          {roles.map((role) => (
            <div key={role._id} className="border border-gray-100 rounded-2xl bg-white p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <div>
                  <p className="text-lg font-bold text-gray-900">{role.name}</p>
                  <p className="text-xs text-gray-500">{role.description || 'No role description'}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => bulkSetRole(role._id, true)} className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold">Grant All</button>
                  <button onClick={() => bulkSetRole(role._id, false)} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-bold">Revoke All</button>
                  <button onClick={() => saveRole(role)} disabled={savingRoleId === role._id} className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-bold disabled:opacity-60">
                    {savingRoleId === role._id ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>

              {categories.map((category) => (
                <div key={category} className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs uppercase tracking-wider text-gray-500 font-bold">{category}</p>
                    <div className="flex gap-2">
                      <button onClick={() => bulkSetCategory(role._id, category, true)} className="text-[11px] px-2 py-1 rounded bg-gray-100">All</button>
                      <button onClick={() => bulkSetCategory(role._id, category, false)} className="text-[11px] px-2 py-1 rounded bg-gray-100">None</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {permissions.filter((perm) => perm.category === category).map((perm) => {
                      const checked = (draft[role._id] || new Set()).has(perm.id);
                      return (
                        <label key={perm.id} className={`border rounded-lg p-2 flex items-center justify-between text-sm ${checked ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-white'}`}>
                          <span>{perm.name}</span>
                          <input type="checkbox" checked={checked} onChange={() => toggleCell(role._id, perm.id)} />
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PermissionMatrix;
