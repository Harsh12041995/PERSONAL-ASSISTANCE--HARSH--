import { useState } from 'react';

type RelType = 'Friend' | 'Family' | 'Colleague' | 'Professional' | 'Mentor' | 'Other';

interface Contact { id: string; name: string; rel: RelType; color: string; lastTalk: string; note: string; phone: string; }
interface ContentIdea { id: string; idea: string; platform: string; emoji: string; }
interface SocialStat { platform: string; followers: string; engagement: string; lastPost: string; emoji: string; gradient: string; }

const lsGet = (key: string, def: unknown) => { try { return JSON.parse(localStorage.getItem(key) || 'null') ?? def; } catch { return def; } };
const lsSet = (key: string, val: unknown) => localStorage.setItem(key, JSON.stringify(val));
const uid = () => Math.random().toString(36).slice(2);
const today = () => new Date().toISOString().slice(0, 10);

const AVATAR_COLORS = ['bg-blue-500', 'bg-pink-500', 'bg-violet-500', 'bg-orange-500', 'bg-emerald-500', 'bg-red-500', 'bg-indigo-500', 'bg-teal-500'];
const REL_TYPES: RelType[] = ['Friend', 'Family', 'Colleague', 'Professional', 'Mentor', 'Other'];
const REL_BADGE: Record<string, string> = {
    Friend: 'bg-blue-100 text-blue-700', Family: 'bg-pink-100 text-pink-700',
    Colleague: 'bg-violet-100 text-violet-700', Professional: 'bg-orange-100 text-orange-700',
    Mentor: 'bg-indigo-100 text-indigo-700', Other: 'bg-gray-100 text-gray-600',
};

const daysSince = (d: string) => { if (!d) return 999; return Math.floor((Date.now() - new Date(d).getTime()) / 86400000); };

const DEF_CONTACTS: Contact[] = [
    { id: '1', name: 'Rahul Sharma', rel: 'Friend', color: 'bg-blue-500', lastTalk: '2026-02-19', note: 'Discuss startup partnership idea', phone: '' },
    { id: '2', name: 'Priya Mehta', rel: 'Family', color: 'bg-pink-500', lastTalk: '2026-02-22', note: 'Birthday next week, plan dinner', phone: '' },
];
const DEF_IDEAS: ContentIdea[] = [
    { id: '1', idea: 'Building my personal assistant app — behind the scenes', platform: 'LinkedIn', emoji: '💻' },
    { id: '2', idea: '5 habits that changed my morning routine', platform: 'Instagram', emoji: '☀️' },
];
const DEF_STATS: SocialStat[] = [
    { platform: 'Instagram', followers: '', engagement: '', lastPost: '', emoji: '📸', gradient: 'from-pink-500 to-purple-500' },
    { platform: 'LinkedIn', followers: '', engagement: '', lastPost: '', emoji: '💼', gradient: 'from-blue-600 to-blue-700' },
];

export default function SocialPage() {
    const [contacts, setContacts] = useState(lsGet('social_contacts', DEF_CONTACTS) as Contact[]);
    const [ideas, setIdeas] = useState(lsGet('social_ideas', DEF_IDEAS) as ContentIdea[]);
    const [stats, setStats] = useState(lsGet('social_stats', DEF_STATS) as SocialStat[]);
    const [tab, setTab] = useState<'contacts' | 'ideas' | 'platforms'>('contacts');
    const [search, setSearch] = useState('');
    const [filterDays, setDays] = useState<number | null>(null);

    const saveContacts = (v: Contact[]) => { setContacts(v); lsSet('social_contacts', v); };
    const saveIdeas = (v: ContentIdea[]) => { setIdeas(v); lsSet('social_ideas', v); };
    const saveStats = (v: SocialStat[]) => { setStats(v); lsSet('social_stats', v); };

    // Contact form
    const [cForm, setCForm] = useState({ name: '', rel: 'Friend' as RelType, lastTalk: today(), note: '', phone: '' });
    const [cNew, setCNew] = useState(false);
    const addContact = () => {
        if (!cForm.name) return;
        const color = AVATAR_COLORS[contacts.length % AVATAR_COLORS.length];
        saveContacts([{ id: uid(), color, ...cForm }, ...contacts]);
        setCForm({ name: '', rel: 'Friend', lastTalk: today(), note: '', phone: '' });
        setCNew(false);
    };

    // Idea form
    const [iForm, setIForm] = useState({ idea: '', platform: 'Instagram', emoji: '💡' });
    const [iNew, setINew] = useState(false);
    const addIdea = () => {
        if (!iForm.idea) return;
        saveIdeas([{ id: uid(), ...iForm }, ...ideas]);
        setIForm({ idea: '', platform: 'Instagram', emoji: '💡' });
        setINew(false);
    };

    const touchContact = (id: string) => saveContacts(contacts.map(c => c.id === id ? { ...c, lastTalk: today() } : c));

    const sorted = [...contacts]
        .filter(c => c.name.toLowerCase().includes(search.toLowerCase()) && (filterDays === null || daysSince(c.lastTalk) >= filterDays))
        .sort((a, b) => daysSince(b.lastTalk) - daysSince(a.lastTalk));

    const TABS = [
        { id: 'contacts' as const, label: '👥 Contacts', count: contacts.length },
        { id: 'ideas' as const, label: '💡 Content', count: ideas.length },
        { id: 'platforms' as const, label: '📊 Platforms', count: null },
    ];

    return (
        <div className="space-y-6 pb-8 max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">📱 Social Life Tracker</h1>
                <p className="text-sm text-gray-500 mt-0.5">Stay connected — relationships, content pipeline & social stats</p>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: 'Contacts', value: contacts.length, emoji: '👥', bg: 'bg-blue-50 border-blue-100' },
                    { label: 'Need catch-up', value: contacts.filter(c => daysSince(c.lastTalk) >= 14).length, emoji: '⚠️', bg: 'bg-amber-50 border-amber-100' },
                    { label: 'Content ideas', value: ideas.length, emoji: '💡', bg: 'bg-violet-50 border-violet-100' },
                ].map(s => (
                    <div key={s.label} className={`rounded-2xl border p-4 ${s.bg}`}>
                        <span className="text-2xl">{s.emoji}</span>
                        <p className="text-xl font-bold text-gray-800 mt-1">{s.value}</p>
                        <p className="text-xs text-gray-500">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Tab bar */}
            <div className="flex gap-2">
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all
                            ${tab === t.id ? 'bg-violet-600 text-white shadow-md shadow-violet-200' : 'bg-white text-gray-600 border border-gray-200 hover:border-violet-300'}`}>
                        {t.label}
                        {t.count !== null && (
                            <span className={`text-xs rounded-full px-1.5 py-0.5 ${tab === t.id ? 'bg-violet-500' : 'bg-gray-100 text-gray-500'}`}>{t.count}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── CONTACTS ── */}
            {tab === 'contacts' && (
                <>
                    <div className="flex flex-wrap gap-2">
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts…"
                            className="flex-1 min-w-[180px] bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                        <div className="flex gap-2">
                            {([{ label: 'All', val: null }, { label: '7d+', val: 7 }, { label: '14d+', val: 14 }, { label: '30d+', val: 30 }] as { label: string; val: number | null }[]).map(f => (
                                <button key={String(f.val)} onClick={() => setDays(f.val)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all
                                        ${filterDays === f.val ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-500 border-gray-200'}`}>
                                    {f.label}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setCNew(p => !p)} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl">
                            {cNew ? '✕' : '+ Add'}
                        </button>
                    </div>

                    {cNew && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <input value={cForm.name} onChange={e => setCForm(p => ({ ...p, name: e.target.value }))} placeholder="Name *"
                                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                                <input value={cForm.phone} onChange={e => setCForm(p => ({ ...p, phone: e.target.value }))} placeholder="Phone (optional)"
                                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <select value={cForm.rel} onChange={e => setCForm(p => ({ ...p, rel: e.target.value as RelType }))}
                                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
                                    {REL_TYPES.map(r => <option key={r}>{r}</option>)}
                                </select>
                                <input type="date" value={cForm.lastTalk} onChange={e => setCForm(p => ({ ...p, lastTalk: e.target.value }))}
                                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
                            </div>
                            <input value={cForm.note} onChange={e => setCForm(p => ({ ...p, note: e.target.value }))} placeholder="Follow-up note"
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                            <button onClick={addContact} className="px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold">Save Contact</button>
                        </div>
                    )}

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="divide-y divide-gray-50">
                            {sorted.length === 0 && <p className="text-center text-sm text-gray-400 py-10">No contacts found. Add one above!</p>}
                            {sorted.map(c => {
                                const days = daysSince(c.lastTalk);
                                const overdue = days >= 14;
                                return (
                                    <div key={c.id} className="group flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors">
                                        <div className={`w-10 h-10 rounded-full ${c.color} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                                            {c.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-sm font-semibold text-gray-800">{c.name}</p>
                                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${REL_BADGE[c.rel]}`}>{c.rel}</span>
                                                {overdue && <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">⏰ Overdue</span>}
                                            </div>
                                            {c.note && <p className="text-xs text-gray-400 mt-0.5">📌 {c.note}</p>}
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-[10px] text-gray-400">Last talked</p>
                                            <p className={`text-xs font-medium ${overdue ? 'text-amber-600' : 'text-gray-600'}`}>
                                                {days === 0 ? 'Today' : days === 1 ? 'Yesterday' : `${days}d ago`}
                                            </p>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                            <button onClick={() => touchContact(c.id)} title="Mark talked today" className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 text-xs font-bold">✓</button>
                                            <button onClick={() => saveContacts(contacts.filter(x => x.id !== c.id))} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 text-xs">✕</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}

            {/* ── CONTENT IDEAS ── */}
            {tab === 'ideas' && (
                <>
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-500">{ideas.length} ideas in your pipeline</p>
                        <button onClick={() => setINew(p => !p)} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl">{iNew ? '✕ Cancel' : '+ Add Idea'}</button>
                    </div>
                    {iNew && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                            <textarea value={iForm.idea} onChange={e => setIForm(p => ({ ...p, idea: e.target.value }))} placeholder="Your content idea…" rows={2}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none" />
                            <div className="flex gap-2">
                                <input value={iForm.emoji} onChange={e => setIForm(p => ({ ...p, emoji: e.target.value }))} placeholder="💡"
                                    className="w-16 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
                                <select value={iForm.platform} onChange={e => setIForm(p => ({ ...p, platform: e.target.value }))}
                                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
                                    {['Instagram', 'LinkedIn', 'Twitter', 'YouTube'].map(p => <option key={p}>{p}</option>)}
                                </select>
                                <button onClick={addIdea} className="px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold">Add</button>
                            </div>
                        </div>
                    )}
                    <div className="space-y-2">
                        {ideas.length === 0 && <div className="text-center py-10 text-gray-400"><p className="text-3xl mb-2">💡</p><p className="text-sm">No ideas yet. Add your first!</p></div>}
                        {ideas.map(idea => (
                            <div key={idea.id} className="group flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-violet-200 transition-all">
                                <span className="text-2xl flex-shrink-0">{idea.emoji}</span>
                                <div className="flex-1"><p className="text-sm text-gray-800 font-medium">{idea.idea}</p><span className="text-[10px] text-violet-600 font-semibold">{idea.platform}</span></div>
                                <button onClick={() => saveIdeas(ideas.filter(x => x.id !== idea.id))} className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-gray-400 hover:text-red-500 transition-all text-xs">✕</button>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* ── PLATFORMS ── */}
            {tab === 'platforms' && (
                <div className="space-y-4">
                    <p className="text-sm text-gray-500">Update your social stats manually. Full API integration (Instagram Graph, LinkedIn) coming in Phase 4.</p>
                    {stats.map((s, i) => (
                        <div key={s.platform} className={`bg-gradient-to-br ${s.gradient} rounded-2xl p-5 text-white`}>
                            <div className="flex items-center gap-3 mb-4"><span className="text-3xl">{s.emoji}</span><span className="text-lg font-bold">{s.platform}</span></div>
                            <div className="grid grid-cols-3 gap-3">
                                {([{ label: 'Followers', key: 'followers', ph: '1.2K' }, { label: 'Engagement', key: 'engagement', ph: '4.2%' }, { label: 'Last Post', key: 'lastPost', ph: '3 days ago' }] as { label: string; key: keyof SocialStat; ph: string }[]).map(f => (
                                    <div key={f.key}>
                                        <p className="text-xs text-white/70 mb-1">{f.label}</p>
                                        <input value={s[f.key] as string}
                                            onChange={e => { const updated = stats.map((x, j) => j === i ? { ...x, [f.key]: e.target.value } : x); saveStats(updated); }}
                                            placeholder={f.ph}
                                            className="w-full bg-white/20 text-white placeholder-white/50 rounded-xl px-3 py-1.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-white/30" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
