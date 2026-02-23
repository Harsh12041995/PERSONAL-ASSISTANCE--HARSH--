import React, { useEffect, useState } from "react";
import { adminService } from "../../services/adminService";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "../../components/ui/table";
import { toast } from "react-toastify";
import PageMeta from "../../shared/PageMeta";

interface User {
    _id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: {
        name: string;
    };
    status: 'pending' | 'approved' | 'blocked';
    createdAt: string;
}

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await adminService.getUsers();
            if (response.success) {
                setUsers(response.data);
            }
        } catch (error) {
            toast.error("Failed to fetch users");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleStatusUpdate = async (userId: string, status: 'pending' | 'approved' | 'blocked') => {
        try {
            const response = await adminService.updateUserStatus(userId, status);
            if (response.success) {
                toast.success(`User marked as ${status}`);
                setUsers(users.map(u => u._id === userId ? { ...u, status } : u));
            }
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!window.confirm("Are you sure you want to delete this user?")) return;
        try {
            const response = await adminService.deleteUser(userId);
            if (response.success) {
                toast.success("User deleted successfully");
                setUsers(users.filter(u => u._id !== userId));
            }
        } catch (error) {
            toast.error("Failed to delete user");
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">Approved</span>;
            case 'pending':
                return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Pending</span>;
            case 'blocked':
                return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">Blocked</span>;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            <PageMeta title="Admin - User Management" />

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                    <p className="text-gray-500 text-sm">Review signups and manage portal access.</p>
                </div>
                <button
                    onClick={fetchUsers}
                    className="p-2 text-gray-500 hover:text-violet-600 transition-colors"
                    title="Refresh List"
                >
                    <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {loading && users.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">Loading users...</div>
                ) : users.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">No users found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-gray-50">
                                <TableRow>
                                    <TableCell isHeader className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">User</TableCell>
                                    <TableCell isHeader className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Role</TableCell>
                                    <TableCell isHeader className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</TableCell>
                                    <TableCell isHeader className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Joined</TableCell>
                                    <TableCell isHeader className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</TableCell>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-gray-100">
                                {users.map((user) => (
                                    <TableRow key={user._id} className="hover:bg-gray-50/50 transition-colors">
                                        <TableCell className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-sm">
                                                    {user.first_name[0]}{user.last_name[0]}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-gray-900 truncate">{user.first_name} {user.last_name}</p>
                                                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-6 py-4">
                                            <span className="text-sm text-gray-600">{user.role?.name || 'User'}</span>
                                        </TableCell>
                                        <TableCell className="px-6 py-4">
                                            {getStatusBadge(user.status)}
                                        </TableCell>
                                        <TableCell className="px-6 py-4 text-sm text-gray-500">
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {user.status === 'pending' && (
                                                    <button
                                                        onClick={() => handleStatusUpdate(user._id, 'approved')}
                                                        className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                                                        title="Approve"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </button>
                                                )}
                                                {user.status !== 'blocked' && (
                                                    <button
                                                        onClick={() => handleStatusUpdate(user._id, 'blocked')}
                                                        className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
                                                        title="Block"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                        </svg>
                                                    </button>
                                                )}
                                                {user.status === 'blocked' && (
                                                    <button
                                                        onClick={() => handleStatusUpdate(user._id, 'approved')}
                                                        className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                                                        title="Unblock"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDeleteUser(user._id)}
                                                    className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                                                    title="Delete"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserManagement;
