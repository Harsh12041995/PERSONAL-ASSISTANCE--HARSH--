import { useState, useEffect, useCallback } from 'react';
import { socialApi, IContact, IContentIdea, ISocialPlatform } from '../services/personalApi';

// ── Styles ─────────────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['bg-blue-500', 'bg-pink-500', 'bg-violet-500', 'bg-orange-500', 'bg-emerald-500', 'bg-red-500', 'bg-indigo-500', 'bg-teal-500'];
const REL_TYPES = ['Friend', 'Family', 'Colleague', 'Professional', 'Mentor', 'Other'];
const REL_BADGE: Record<string, string> = {
    Friend: 'bg-blue-100 text-blue-700', Family: 'bg-pink-100 text-pink-700',
    Colleague: 'bg-violet-100 text-violet-700', Professional: 'bg-orange-100 text-orange-700',
    Mentor: 'bg-indigo-100 text-indigo-700', Other: 'bg-gray-100 text-gray-600',
};
const STATUS_BADGE: Record<string, string> = {
    Idea: 'bg-gray-100 text-gray-600', Draft: 'bg-amber-100 text-amber-700',
    Scheduled: 'bg-blue-100 text-blue-700', Published: 'bg-emerald-100 text-emerald-700',
};
const PLATFORM_GRADIENT: Record<string, string> = {
    Instagram: 'from-pink-500 to-purple-500', LinkedIn: 'from-blue-600 to-blue-700',
    Twitter: 'from-sky-400 to-sky-500', YouTube: 'from-red-500 to-red-600', Other: 'from-gray-500 to-gray-600',
};
const daysSince = (d: string) => { if (!d) return 999; return Math.floor((Date.now() - new Date(d).getTime()) / 86400000); };
const today = () => new Date().toISOString().slice(0, 10);

export default function SocialPage() {
    const [contacts, setContacts] = useState<IContact[]>([]);
    const [ideas, setIdeas] = useState<IContentIdea[]>([]);
    const [platforms, setPlatforms] = useState<ISocialPlatform[]>([]);
    const [tab, setTab] = useState<'contacts' | 'ideas' | 'platforms'>('contacts');
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // ── Load on mount ─────────────────────────────────────────────────────────
    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [c, i, p] = await Promise.all([
                socialApi.getContacts(), socialApi.getIdeas(), socialApi.getPlatforms(),
            ]);
            setContacts(c || []); setIdeas(i || []); setPlatforms(p || []);
        } catch (e) { console.error('Social load error', e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    // ── Contact handlers ──────────────────────────────────────────────────────
    const [cForm, setCForm] = useState({ name: '', relationship: 'Friend', lastTalked: today(), notes: '', phone: '', followUpDays: 14 });
    const [cNew, setCNew] = useState(false);
    const addContact = async () => {
        if (!cForm.name) return;
        const created = await socialApi.createContact({ ...cForm, email: '', tags: [], socialLinks: { instagram: '', linkedin: '', twitter: '' } } as any);
        setContacts(prev => [created, ...prev]);
        setCForm({ name: '', relationship: 'Friend', lastTalked: today(), notes: '', phone: '', followUpDays: 14 });
        setCNew(false);
    };
    const deleteContact = async (id: string) => {
        await socialApi.deleteContact(id);
        setContacts(prev => prev.filter(c => c._id !== id));
    };
    const touchContact = async (id: string) => {
        await socialApi.updateContact(id, { lastTalked: today() });
        setContacts(prev => prev.map(c => c._id === id ? { ...c, lastTalked: today() } : c));
    };

    // ── Content idea handlers ─────────────────────────────────────────────────
    const [iForm, setIForm] = useState({ title: '', platform: 'Instagram', status: 'Idea', notes: '', dueDate: '' });
    const [iNew, setINew] = useState(false);
    const addIdea = async () => {
        if (!iForm.title) return;
        const created = await socialApi.createIdea({ ...iForm, tags: [] } as any);
        setIdeas(prev => [created, ...prev]);
        setIForm({ title: '', platform: 'Instagram', status: 'Idea', notes: '', dueDate: '' });
        setINew(false);
    };
    const deleteIdea = async (id: string) => {
        await socialApi.deleteIdea(id);
        setIdeas(prev => prev.filter(i => i._id !== id));
    };
    const updateIdeaStatus = async (id: string, status: string) => {
        await socialApi.updateIdea(id, { status });
        setIdeas(prev => prev.map(i => i._id === id ? { ...i, status } : i));
    };

    // ── Platform handlers ─────────────────────────────────────────────────────
    const [pForm, setPForm] = useState({ platform: 'Instagram', handle: '', followers: 0, engagement: '0%', emoji: '📸', profileUrl: '', lastPost: '' });
    const [pNew, setPNew] = useState(false);
    const upsertPlatform = async () => {
        if (!pForm.platform) return;
        const created = await socialApi.upsertPlatform({ ...pForm, following: 0 } as any);
        setPlatforms(prev => {
            const exists = prev.find(p => p.platform === created.platform);
            return exists ? prev.map(p => p._id === created._id ? created : p) : [created, ...prev];
        });
        setPForm({ platform: 'Instagram', handle: '', followers: 0, engagement: '0%', emoji: '📸', profileUrl: '', lastPost: '' });
        setPNew(false);
    };
    const deletePlatform = async (id: string) => {
        await socialApi.deletePlatform(id);
        setPlatforms(prev => prev.filter(p => p._id !== id));
    };

    // ── Filtered contacts ─────────────────────────────────────────────────────
    const filtered = contacts.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
    const overdue = contacts.filter(c => daysSince(c.lastTalked) > (c.followUpDays || 14));

    const TABS = [
        { id: 'contacts' as const, label: '👥 Contacts', count: contacts.length },
        { id: 'ideas' as const, label: '💡 Content', count: ideas.length },
        { id: 'platforms' as const, label: '📱 Platforms', count: platforms.length },
    ];

    if (loading) return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading social data…</div>;

    return (
        <div className="space-y-6 pb-8 max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">🌐 Social Hub</h1>
                <p className="text-sm text-gray-500 mt-0.5">Relationships, content pipeline &amp; social stats · Synced to MongoDB</p>
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl border bg-blue-50 border-blue-100 p-4">
                    <span className="text-2xl">👥</span>
                    <p className="text-xl font-bold text-gray-800 mt-1">{contacts.length}</p>
                    <p className="text-xs text-gray-500">Contacts</p>
                </div>
                <div className="rounded-2xl border bg-red-50 border-red-100 p-4">
                    <span className="text-2xl">⏰</span>
                    <p className="text-xl font-bold text-gray-800 mt-1">{overdue.length}</p>
                    <p className="text-xs text-gray-500">Overdue Follow-ups</p>
                </div>
                <div className="rounded-2xl border bg-amber-50 border-amber-100 p-4">
                    <span className="text-2xl">💡</span>
                    <p className="text-xl font-bold text-gray-800 mt-1">{ideas.filter(i => i.status !== 'Published').length}</p>
                    <p className="text-xs text-gray-500">Ideas in Pipeline</p>
                </div>
                <div className="rounded-2xl border bg-violet-50 border-violet-100 p-4">
                    <span className="text-2xl">📱</span>
                    <p className="text-xl font-bold text-gray-800 mt-1">{platforms.length}</p>
                    <p className="text-xs text-gray-500">Platforms</p>
                </div>
            </div>

            {/* Overdue alert */}
            {overdue.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                    <p className="text-sm font-semibold text-red-700">⏰ {overdue.length} contact{overdue.length > 1 ? 's' : ''} need{overdue.length === 1 ? 's' : ''} a follow-up</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {overdue.map(c => (
                            <button key={c._id} onClick={() => touchContact(c._id)}
                                className="text-xs bg-white border border-red-200 rounded-lg px-3 py-1.5 text-red-700 hover:bg-red-100 transition-colors">
                                ✓ {c.name} ({daysSince(c.lastTalked)}d ago)
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2">
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all
                            ${tab === t.id ? 'bg-violet-600 text-white shadow-md shadow-violet-200' : 'bg-white text-gray-600 border border-gray-200 hover:border-violet-300'}`}>
                        {t.label}
                        <span className={`text-xs rounded-full px-1.5 py-0.5 ${tab === t.id ? 'bg-violet-500' : 'bg-gray-100 text-gray-500'}`}>{t.count}</span>
                    </button>
                ))}
            </div>

            {/* ── CONTACTS ── */}
            {tab === 'contacts' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-gray-50 flex gap-3 items-center">
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search contacts…"
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                        <button onClick={() => setCNew(p => !p)} className="text-xs font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 px-3 py-2 rounded-xl whitespace-nowrap">
                            {cNew ? '✕ Cancel' : '+ Add'}
                        </button>
                    </div>
                    {cNew && (
                        <div className="p-5 border-b border-gray-50 bg-violet-50/30 space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                                <input value={cForm.name} onChange={e => setCForm(p => ({ ...p, name: e.target.value }))} placeholder="Name *"
                                    className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                                <input value={cForm.phone} onChange={e => setCForm(p => ({ ...p, phone: e.target.value }))} placeholder="Phone"
                                    className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <select value={cForm.relationship} onChange={e => setCForm(p => ({ ...p, relationship: e.target.value }))}
                                    className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
                                    {REL_TYPES.map(r => <option key={r}>{r}</option>)}
                                </select>
                                <input type="date" value={cForm.lastTalked} onChange={e => setCForm(p => ({ ...p, lastTalked: e.target.value }))}
                                    className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
                                <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-3 py-2">
                                    <span className="text-xs text-gray-500">Follow-up:</span>
                                    <input type="number" value={cForm.followUpDays} onChange={e => setCForm(p => ({ ...p, followUpDays: Number(e.target.value) }))}
                                        className="w-10 text-sm focus:outline-none" />
                                    <span className="text-xs text-gray-400">d</span>
                                </div>
                            </div>
                            <input value={cForm.notes} onChange={e => setCForm(p => ({ ...p, notes: e.target.value }))} placeholder="Note (optional)"
                                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                            <button onClick={addContact} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold">Save Contact</button>
                        </div>
                    )}
                    <div className="divide-y divide-gray-50">
                        {filtered.length === 0 && <p className="text-center text-sm text-gray-400 py-10">{search ? 'No contacts match your search.' : 'No contacts yet. Add one above!'}</p>}
                        {filtered.map((c, i) => {
                            const ds = daysSince(c.lastTalked);
                            const isOverdue = ds > (c.followUpDays || 14);
                            return (
                                <div key={c._id} className="group flex items-center gap-3 px-5 py-4 hover:bg-gray-50">
                                    <div className={`w-10 h-10 rounded-xl ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                                        {c.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-800">{c.name}</p>
                                        <p className="text-xs text-gray-400">
                                            {c.phone && `${c.phone} · `}
                                            Last: {c.lastTalked ? `${ds}d ago` : 'never'}
                                            {isOverdue && <span className="text-red-500 ml-1">· Follow up!</span>}
                                        </p>
                                        {c.notes && <p className="text-xs text-gray-500 truncate">💬 {c.notes}</p>}
                                    </div>
                                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${REL_BADGE[c.relationship] || 'bg-gray-100 text-gray-600'}`}>{c.relationship}</span>
                                    <button onClick={() => touchContact(c._id)} className="opacity-0 group-hover:opacity-100 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg hover:bg-emerald-100 transition-all">✓ Talked</button>
                                    <button onClick={() => deleteContact(c._id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all text-xs px-1">✕</button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── CONTENT IDEAS ── */}
            {tab === 'ideas' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-gray-50 flex justify-between items-center">
                        <h2 className="text-sm font-bold text-gray-800">Content Pipeline</h2>
                        <button onClick={() => setINew(p => !p)} className="text-xs font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-xl">
                            {iNew ? '✕ Cancel' : '+ Add Idea'}
                        </button>
                    </div>
                    {iNew && (
                        <div className="p-5 border-b border-gray-50 bg-violet-50/30 space-y-2">
                            <input value={iForm.title} onChange={e => setIForm(p => ({ ...p, title: e.target.value }))} placeholder="Content idea / title *"
                                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                            <div className="grid grid-cols-3 gap-2">
                                <select value={iForm.platform} onChange={e => setIForm(p => ({ ...p, platform: e.target.value }))}
                                    className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
                                    {['Instagram', 'LinkedIn', 'Twitter', 'YouTube', 'Blog', 'Other'].map(pl => <option key={pl}>{pl}</option>)}
                                </select>
                                <select value={iForm.status} onChange={e => setIForm(p => ({ ...p, status: e.target.value }))}
                                    className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
                                    {['Idea', 'Draft', 'Scheduled', 'Published'].map(s => <option key={s}>{s}</option>)}
                                </select>
                                <input type="date" value={iForm.dueDate} onChange={e => setIForm(p => ({ ...p, dueDate: e.target.value }))}
                                    className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
                            </div>
                            <input value={iForm.notes} onChange={e => setIForm(p => ({ ...p, notes: e.target.value }))} placeholder="Notes"
                                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
                            <button onClick={addIdea} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold">Save Idea</button>
                        </div>
                    )}
                    <div className="divide-y divide-gray-50">
                        {ideas.length === 0 && <p className="text-center text-sm text-gray-400 py-10">No content ideas yet.</p>}
                        {ideas.map(idea => (
                            <div key={idea._id} className="group flex items-center gap-3 px-5 py-4 hover:bg-gray-50">
                                <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-lg flex-shrink-0">
                                    {idea.platform === 'Instagram' ? '📸' : idea.platform === 'LinkedIn' ? '💼' : idea.platform === 'YouTube' ? '🎥' : '✍️'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-800 truncate">{idea.title}</p>
                                    <p className="text-xs text-gray-400">{idea.platform}{idea.dueDate ? ` · Due ${idea.dueDate}` : ''}</p>
                                    {idea.notes && <p className="text-xs text-gray-500">📝 {idea.notes}</p>}
                                </div>
                                <select value={idea.status} onChange={e => updateIdeaStatus(idea._id, e.target.value)}
                                    className={`text-xs font-bold px-2 py-1 rounded-full border-0 cursor-pointer ${STATUS_BADGE[idea.status] || 'bg-gray-100 text-gray-600'}`}>
                                    {['Idea', 'Draft', 'Scheduled', 'Published'].map(s => <option key={s}>{s}</option>)}
                                </select>
                                <button onClick={() => deleteIdea(idea._id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all text-xs px-1">✕</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── PLATFORMS ── */}
            {tab === 'platforms' && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <button onClick={() => setPNew(p => !p)} className="text-xs font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-xl">
                            {pNew ? '✕ Cancel' : '+ Add Platform'}
                        </button>
                    </div>
                    {pNew && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-2">
                            <div className="grid grid-cols-3 gap-2">
                                <select value={pForm.platform} onChange={e => setPForm(p => ({ ...p, platform: e.target.value }))}
                                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
                                    {['Instagram', 'LinkedIn', 'Twitter', 'YouTube', 'Other'].map(pl => <option key={pl}>{pl}</option>)}
                                </select>
                                <input value={pForm.handle} onChange={e => setPForm(p => ({ ...p, handle: e.target.value }))} placeholder="@handle"
                                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
                                <input type="number" value={pForm.followers} onChange={e => setPForm(p => ({ ...p, followers: Number(e.target.value) }))} placeholder="Followers"
                                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <input value={pForm.engagement} onChange={e => setPForm(p => ({ ...p, engagement: e.target.value }))} placeholder="Engagement % (e.g. 4.2%)"
                                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
                                <input value={pForm.profileUrl} onChange={e => setPForm(p => ({ ...p, profileUrl: e.target.value }))} placeholder="Profile URL"
                                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
                            </div>
                            <button onClick={upsertPlatform} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold">Save Platform</button>
                        </div>
                    )}
                    {platforms.length === 0 && <p className="text-center text-sm text-gray-400 py-10 bg-white rounded-2xl border border-gray-100">No platforms added yet.</p>}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {platforms.map(pl => (
                            <div key={pl._id} className={`group relative rounded-2xl bg-gradient-to-br ${PLATFORM_GRADIENT[pl.platform] || 'from-gray-500 to-gray-600'} p-5 text-white shadow-lg`}>
                                <button onClick={() => deletePlatform(pl._id)}
                                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-white/60 hover:text-white transition-all text-xs">✕</button>
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="text-3xl">{pl.emoji}</span>
                                    <div>
                                        <p className="font-bold">{pl.platform}</p>
                                        {pl.handle && <p className="text-sm opacity-75">{pl.handle}</p>}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white/20 rounded-xl p-3 text-center">
                                        <p className="text-xl font-bold">{pl.followers.toLocaleString()}</p>
                                        <p className="text-xs opacity-75">Followers</p>
                                    </div>
                                    <div className="bg-white/20 rounded-xl p-3 text-center">
                                        <p className="text-xl font-bold">{pl.engagement || '—'}</p>
                                        <p className="text-xs opacity-75">Engagement</p>
                                    </div>
                                </div>
                                {pl.lastPost && <p className="text-xs opacity-60 mt-3">Last post: {pl.lastPost}</p>}
                                {pl.profileUrl && (
                                    <a href={pl.profileUrl} target="_blank" rel="noreferrer"
                                        className="mt-3 block text-center text-xs bg-white/20 hover:bg-white/30 rounded-xl py-2 transition-colors">
                                        Open Profile →
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
