import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { settingsApi, IUserSettings } from '../services/personalApi';

const DEFAULTS: IUserSettings = {
    displayName: 'Harsh', bio: 'Building my personal command center 🚀',
    timezone: 'Asia/Kolkata', theme: 'light', geminiApiKey: '',
    currency: 'INR', dateFormat: 'DD/MM/YYYY',
    notifications: { dailyDigest: true, habitReminders: true, goalDeadlines: true, contactFollowUp: true },
};

const TIMEZONES = ['Asia/Kolkata', 'UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Singapore', 'Asia/Dubai'];

function SectionHead({ emoji, title, sub }: { emoji: string; title: string; sub: string }) {
    return (
        <div className="flex items-center gap-3 pb-3 border-b border-gray-100 mb-4">
            <span className="text-2xl">{emoji}</span>
            <div><p className="text-sm font-bold text-gray-800">{title}</p><p className="text-xs text-gray-400">{sub}</p></div>
        </div>
    );
}

function ToggleRow({ label, sub, checked, onChange }: { label: string; sub: string; checked: boolean; onChange: () => void }) {
    return (
        <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
            <div><p className="text-sm font-medium text-gray-700">{label}</p><p className="text-xs text-gray-400">{sub}</p></div>
            <button onClick={onChange}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-violet-600' : 'bg-gray-200'}`}>
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
        </div>
    );
}

export default function SettingsPage() {
    const { user, logout } = useAuth() as any;
    const [s, setS] = useState<IUserSettings>(DEFAULTS);
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showKey, setShowKey] = useState(false);
    const [exporting, setExporting] = useState(false);

    // ── Load from MongoDB on mount ──────────────────────────────────────────
    useEffect(() => {
        settingsApi.get()
            .then(data => { if (data && Object.keys(data).length) setS({ ...DEFAULTS, ...data }); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const update = (patch: Partial<IUserSettings>) => setS(prev => ({ ...prev, ...patch }));
    const updateNotif = (k: keyof IUserSettings['notifications']) =>
        update({ notifications: { ...s.notifications, [k]: !s.notifications[k] } });

    // ── Save to MongoDB ─────────────────────────────────────────────────────
    const saveAll = async () => {
        try {
            await settingsApi.save(s);
            setSaved(true); setTimeout(() => setSaved(false), 2000);
        } catch { alert('Save failed — check backend is running'); }
    };

    // ── Export data ─────────────────────────────────────────────────────────
    const exportData = async () => {
        setExporting(true);
        try {
            const token = localStorage.getItem('accessToken') || '';
            const res = await fetch('http://localhost:5001/api/v1/personal/export', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `harsh-data-${new Date().toISOString().slice(0, 10)}.json`; a.click();
            URL.revokeObjectURL(url);
        } catch { alert('Export failed — check backend is running'); }
        finally { setExporting(false); }
    };

    const initials = (s.displayName || user?.name || 'H').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
    if (loading) return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading settings…</div>;

    return (
        <div className="space-y-6 pb-12 max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">⚙️ Settings</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Preferences, profile &amp; integrations · Synced to MongoDB</p>
                </div>
                <button onClick={saveAll}
                    className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${saved ? 'bg-emerald-500 text-white' : 'bg-violet-600 hover:bg-violet-700 text-white'}`}>
                    {saved ? '✓ Saved to Atlas!' : 'Save Changes'}
                </button>
            </div>

            {/* ── Profile ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <SectionHead emoji="👤" title="Profile" sub="Your personal identity in the app" />
                <div className="flex items-center gap-4 mb-5">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-violet-200">
                        {initials}
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-800">{user?.email || 'harsh@personal.app'}</p>
                        <p className="text-xs text-gray-400">Account email — cannot be changed</p>
                    </div>
                </div>
                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1">Display Name</label>
                        <input value={s.displayName} onChange={e => update({ displayName: e.target.value })}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1">Bio / Tagline</label>
                        <input value={s.bio} onChange={e => update({ bio: e.target.value })}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                            placeholder="Building my personal command center 🚀" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-gray-600 block mb-1">Timezone</label>
                            <select value={s.timezone} onChange={e => update({ timezone: e.target.value })}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none">
                                {TIMEZONES.map(tz => <option key={tz}>{tz}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-600 block mb-1">Currency</label>
                            <select value={s.currency} onChange={e => update({ currency: e.target.value })}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none">
                                {['INR', 'USD', 'EUR', 'GBP', 'SGD', 'AED'].map(c => <option key={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Appearance ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <SectionHead emoji="🎨" title="Appearance" sub="Theme and visual preferences" />
                <div className="grid grid-cols-3 gap-3">
                    {(['light', 'dark', 'system'] as const).map(t => (
                        <button key={t} onClick={() => update({ theme: t })}
                            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
                                ${s.theme === t ? 'border-violet-500 bg-violet-50' : 'border-gray-200 hover:border-violet-200 bg-white'}`}>
                            <span className="text-2xl">{t === 'light' ? '☀️' : t === 'dark' ? '🌙' : '💻'}</span>
                            <span className={`text-xs font-semibold capitalize ${s.theme === t ? 'text-violet-700' : 'text-gray-600'}`}>{t}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Notifications ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <SectionHead emoji="🔔" title="Notifications" sub="What to remind you about" />
                <ToggleRow label="Daily Digest" sub="Morning summary of tasks, goals & habits" checked={s.notifications.dailyDigest} onChange={() => updateNotif('dailyDigest')} />
                <ToggleRow label="Habit Reminders" sub="Daily habit completion nudge" checked={s.notifications.habitReminders} onChange={() => updateNotif('habitReminders')} />
                <ToggleRow label="Goal Deadlines" sub="Alert when goals are approaching deadline" checked={s.notifications.goalDeadlines} onChange={() => updateNotif('goalDeadlines')} />
                <ToggleRow label="Contact Follow-Up" sub="Remind when contacts are overdue for a catch-up" checked={s.notifications.contactFollowUp} onChange={() => updateNotif('contactFollowUp')} />
            </div>

            {/* ── AI / API Keys ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <SectionHead emoji="🤖" title="AI Assistant" sub="Connect Gemini for smart features" />
                <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Gemini API Key</label>
                    <div className="relative">
                        <input type={showKey ? 'text' : 'password'} value={s.geminiApiKey} onChange={e => update({ geminiApiKey: e.target.value })}
                            placeholder="AIza..."
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-violet-300" />
                        <button type="button" onClick={() => setShowKey(p => !p)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
                            {showKey ? '🙈' : '👁️'}
                        </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">
                        Get your free key at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-violet-600 underline">aistudio.google.com</a>. Stored in MongoDB, never shared.
                    </p>
                </div>
                {s.geminiApiKey && (
                    <div className="mt-3 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
                        <span className="text-emerald-600 text-sm">✓</span>
                        <span className="text-xs text-emerald-700 font-medium">Gemini API key saved — AI Chat is ready!</span>
                    </div>
                )}
            </div>

            {/* ── Data & Export ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <SectionHead emoji="💾" title="Data & Export" sub="Your data, your control" />
                <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div>
                            <p className="text-sm font-semibold text-gray-800">Export All Data</p>
                            <p className="text-xs text-gray-400">Downloads all 17 collections as JSON from MongoDB Atlas</p>
                        </div>
                        <button onClick={exportData} disabled={exporting}
                            className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50">
                            {exporting ? 'Exporting…' : '⬇ Export JSON'}
                        </button>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl">
                        <div>
                            <p className="text-sm font-semibold text-gray-800">MongoDB Atlas</p>
                            <p className="text-xs text-gray-400">harsh_personal · cluster0.bacgamo.mongodb.net</p>
                        </div>
                        <span className="text-xs font-bold bg-emerald-600 text-white px-3 py-1.5 rounded-full">🟢 Atlas</span>
                    </div>
                </div>
            </div>

            {/* ── Account ── */}
            <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-6">
                <SectionHead emoji="🔐" title="Account" sub="Session management" />
                <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl">
                    <div>
                        <p className="text-sm font-semibold text-gray-800">Sign Out</p>
                        <p className="text-xs text-gray-400">You'll be redirected to the login page</p>
                    </div>
                    <button onClick={() => logout()}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-xl transition-colors">
                        Sign Out
                    </button>
                </div>
            </div>

            <p className="text-center text-xs text-gray-300 pb-4">Harsh's Space v3.0 — Phase 3 ✅ · Atlas Connected 🍃</p>
        </div>
    );
}
