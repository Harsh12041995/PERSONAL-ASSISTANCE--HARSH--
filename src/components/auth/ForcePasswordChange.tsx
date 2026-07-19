import { useState } from "react";
import api from "../../services/axiosInstance";

// Shown (via ProtectedRoute) when an admin has flagged the account with
// accountConfig.mustChangePassword. Blocks the app until a new password is set.
export default function ForcePasswordChange() {
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
        if (password !== confirm) { setError("Passwords do not match."); return; }
        setSaving(true);
        try {
            await api.post("/auth/change-password", { newPassword: password });
            // Clear the flag on the locally-stored user, then reload into the app.
            try {
                const raw = localStorage.getItem("user");
                if (raw) {
                    const u = JSON.parse(raw);
                    u.accountConfig = { ...(u.accountConfig || {}), mustChangePassword: false };
                    localStorage.setItem("user", JSON.stringify(u));
                }
            } catch { /* ignore */ }
            window.location.href = "/";
        } catch (err: unknown) {
            const e2 = err as { response?: { data?: { message?: string } } };
            setError(e2.response?.data?.message || "Couldn't update password. Try again.");
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
            <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-violet-200 mb-4">🔐</div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">Set a new password</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your administrator requires a password change before you continue.</p>
                <form onSubmit={submit} className="mt-5 space-y-3">
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="New password" autoFocus
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-300" />
                    <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirm new password"
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-300" />
                    {error && <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/40 rounded-lg px-3 py-2">{error}</p>}
                    <button type="submit" disabled={saving}
                        className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                        {saving ? "Saving…" : "Set password & continue"}
                    </button>
                </form>
            </div>
        </div>
    );
}
