import React, { useEffect, useState } from "react";
import { notificationService, Notification } from "../../services/notificationService";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

interface NotificationPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const response = await notificationService.getNotifications();
            if (response.success) {
                setNotifications(response.data);
            }
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen]);

    const handleMarkAsRead = async (id: string) => {
        try {
            const response = await notificationService.markAsRead(id);
            if (response.success) {
                setNotifications(notifications.map(n => n._id === id ? { ...n, isRead: true } : n));
            }
        } catch (error) {
            console.error("Failed to mark as read", error);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const response = await notificationService.deleteNotification(id);
            if (response.success) {
                setNotifications(notifications.filter(n => n._id !== id));
            }
        } catch (error) {
            console.error("Failed to delete notification", error);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="absolute top-full right-0 mt-4 w-96 z-50">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        className="bg-white rounded-[2rem] border border-gray-100 shadow-2xl shadow-gray-200/50 overflow-hidden"
                    >
                        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                            <h3 className="font-bold text-gray-900">Notifications</h3>
                            <button
                                onClick={onClose}
                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="max-h-[70vh] overflow-y-auto px-2 py-4 space-y-2">
                            {loading ? (
                                <div className="py-12 text-center">
                                    <div className="animate-spin w-8 h-8 border-3 border-violet-100 border-t-violet-600 rounded-full mx-auto" />
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="py-12 text-center">
                                    <p className="text-gray-400 font-medium">No new notifications</p>
                                </div>
                            ) : (
                                notifications.map((n) => (
                                    <div
                                        key={n._id}
                                        className={`group relative p-4 rounded-2xl transition-all border ${n.isRead ? 'bg-white border-transparent' : 'bg-violet-50/30 border-violet-100'}`}
                                    >
                                        <div className="flex gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${n.type === 'success' ? 'bg-emerald-100 text-emerald-600' :
                                                    n.type === 'warning' ? 'bg-amber-100 text-amber-600' :
                                                        n.type === 'error' ? 'bg-red-100 text-red-600' :
                                                            'bg-indigo-100 text-indigo-600'
                                                }`}>
                                                {n.type === 'success' ? '✅' : n.type === 'warning' ? '⚠️' : n.type === 'error' ? '❌' : 'ℹ️'}
                                            </div>
                                            <div className="min-w-0 pr-8">
                                                <p className={`text-sm font-bold ${n.isRead ? 'text-gray-700' : 'text-gray-900'}`}>{n.title}</p>
                                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{n.message}</p>
                                                <p className="text-[10px] text-gray-400 mt-2 font-medium">
                                                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                            {!n.isRead && (
                                                <button
                                                    onClick={() => handleMarkAsRead(n._id)}
                                                    className="p-1 text-violet-600 hover:bg-violet-100 rounded-lg"
                                                    title="Mark as read"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDelete(n._id)}
                                                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                                title="Delete"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {notifications.length > 0 && (
                            <div className="p-4 bg-gray-50/50 border-t border-gray-100">
                                <button className="w-full py-2.5 text-xs font-bold text-gray-500 hover:text-violet-600 transition-all">
                                    View All Activity
                                </button>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default NotificationPanel;
