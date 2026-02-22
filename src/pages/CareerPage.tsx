import { useState, useEffect, useCallback } from 'react';
import { careerApi, IJob, ICert, ISkill, ICareerProfile } from '../services/personalApi';

// ── Colour maps ────────────────────────────────────────────────────────────────
const JOB_COLORS: Record<string, string> = {
    Applied: 'bg-amber-100 text-amber-700', Interview: 'bg-blue-100 text-blue-700',
    Offer: 'bg-emerald-100 text-emerald-700', Rejected: 'bg-red-100 text-red-700',
    Active: 'bg-violet-100 text-violet-700', Withdrawn: 'bg-gray-100 text-gray-600',
};
const SKILL_COLORS = ['bg-sky-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-pink-500', 'bg-indigo-500', 'bg-orange-500', 'bg-teal-500'];
const today = () => new Date().toISOString().slice(0, 10);

export default function CareerPage() {
    const [jobs, setJobs] = useState<IJob[]>([]);
    const [certs, setCerts] = useState<ICert[]>([]);
    const [skills, setSkills] = useState<ISkill[]>([]);
    const [profile, setProfile] = useState<ICareerProfile>({ currentRole: '', experienceYrs: 0, linkedInUrl: '', naukriUrl: '', portfolioUrl: '', summary: '' });
    const [tab, setTab] = useState<'jobs' | 'certs' | 'skills' | 'profile'>('jobs');
    const [loading, setLoading] = useState(true);

    // ── Load all data on mount ────────────────────────────────────────────────
    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [j, c, s, p] = await Promise.all([
                careerApi.getJobs(), careerApi.getCerts(),
                careerApi.getSkills(), careerApi.getProfile(),
            ]);
            setJobs(j || []); setCerts(c || []); setSkills(s || []); setProfile(p || profile);
        } catch (e) { console.error('Career load error', e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    // ── Job form ──────────────────────────────────────────────────────────────
    const [jForm, setJForm] = useState({ company: '', role: '', status: 'Applied', date: today(), notes: '', salary: '', location: '' });
    const [jNew, setJNew] = useState(false);
    const addJob = async () => {
        if (!jForm.company || !jForm.role) return;
        const created = await careerApi.createJob(jForm as any);
        setJobs(prev => [created, ...prev]);
        setJForm({ company: '', role: '', status: 'Applied', date: today(), notes: '', salary: '', location: '' });
        setJNew(false);
    };
    const deleteJob = async (id: string) => {
        await careerApi.deleteJob(id);
        setJobs(prev => prev.filter(j => j._id !== id));
    };
    const updateJobStatus = async (id: string, status: string) => {
        const updated = await careerApi.updateJob(id, { status });
        setJobs(prev => prev.map(j => j._id === id ? { ...j, status } : j));
    };

    // ── Cert form ─────────────────────────────────────────────────────────────
    const [cForm, setCForm] = useState({ name: '', issuer: '', emoji: '🏆', issued: today(), expires: '', status: 'Active', credentialUrl: '' });
    const [cNew, setCNew] = useState(false);
    const addCert = async () => {
        if (!cForm.name || !cForm.issuer) return;
        const created = await careerApi.createCert(cForm as any);
        setCerts(prev => [created, ...prev]);
        setCForm({ name: '', issuer: '', emoji: '🏆', issued: today(), expires: '', status: 'Active', credentialUrl: '' });
        setCNew(false);
    };
    const deleteCert = async (id: string) => {
        await careerApi.deleteCert(id);
        setCerts(prev => prev.filter(c => c._id !== id));
    };

    // ── Skill form ────────────────────────────────────────────────────────────
    const [sForm, setSForm] = useState({ name: '', level: 50, category: 'Technical', emoji: '⚡' });
    const [sNew, setSNew] = useState(false);
    const addSkill = async () => {
        if (!sForm.name) return;
        const created = await careerApi.createSkill(sForm as any);
        setSkills(prev => [...prev, created]);
        setSForm({ name: '', level: 50, category: 'Technical', emoji: '⚡' });
        setSNew(false);
    };
    const deleteSkill = async (id: string) => {
        await careerApi.deleteSkill(id);
        setSkills(prev => prev.filter(s => s._id !== id));
    };
    const updateSkillLevel = async (id: string, level: number) => {
        await careerApi.updateSkill(id, { level });
        setSkills(prev => prev.map(s => s._id === id ? { ...s, level } : s));
    };

    // ── Profile save ──────────────────────────────────────────────────────────
    const [profSaved, setProfSaved] = useState(false);
    const saveProfile = async () => {
        await careerApi.saveProfile(profile);
        setProfSaved(true); setTimeout(() => setProfSaved(false), 2000);
    };

    const TABS = [
        { id: 'jobs' as const, label: '📨 Jobs', count: jobs.length },
        { id: 'certs' as const, label: '🏆 Certs', count: certs.length },
        { id: 'skills' as const, label: '⚡ Skills', count: skills.length },
        { id: 'profile' as const, label: '👤 Profile', count: null },
    ];

    const stats = [
        { label: 'Experience', value: `${profile.experienceYrs || 0} yrs`, emoji: '⏱️', bg: 'bg-orange-50 border-orange-100' },
        { label: 'Certifications', value: String(certs.length), emoji: '🏆', bg: 'bg-amber-50 border-amber-100' },
        { label: 'Skills', value: String(skills.length), emoji: '⚡', bg: 'bg-violet-50 border-violet-100' },
        { label: 'Applications', value: String(jobs.filter(j => j.status !== 'Active').length), emoji: '📨', bg: 'bg-blue-50 border-blue-100' },
    ];

    if (loading) return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading career data…</div>;

    return (
        <div className="space-y-6 pb-8 max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">💼 Career Hub</h1>
                <p className="text-sm text-gray-500 mt-0.5">Professional growth, certifications &amp; job tracker · Synced to MongoDB</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {stats.map(s => (
                    <div key={s.label} className={`rounded-2xl border p-4 ${s.bg}`}>
                        <span className="text-2xl">{s.emoji}</span>
                        <p className="text-xl font-bold text-gray-800 mt-1">{s.value}</p>
                        <p className="text-xs text-gray-500">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 flex-wrap">
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

            {/* ── JOBS ── */}
            {tab === 'jobs' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-gray-50 flex justify-between items-center">
                        <h2 className="text-sm font-bold text-gray-800">Job Applications</h2>
                        <button onClick={() => setJNew(p => !p)} className="text-xs font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-xl transition-colors">
                            {jNew ? '✕ Cancel' : '+ Add'}
                        </button>
                    </div>
                    {jNew && (
                        <div className="p-5 border-b border-gray-50 bg-violet-50/30 space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                                <input value={jForm.company} onChange={e => setJForm(p => ({ ...p, company: e.target.value }))} placeholder="Company *"
                                    className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                                <input value={jForm.role} onChange={e => setJForm(p => ({ ...p, role: e.target.value }))} placeholder="Role *"
                                    className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <select value={jForm.status} onChange={e => setJForm(p => ({ ...p, status: e.target.value }))}
                                    className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
                                    {['Applied', 'Interview', 'Offer', 'Rejected', 'Active', 'Withdrawn'].map(s => <option key={s}>{s}</option>)}
                                </select>
                                <input value={jForm.salary} onChange={e => setJForm(p => ({ ...p, salary: e.target.value }))} placeholder="Salary (optional)"
                                    className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
                                <input type="date" value={jForm.date} onChange={e => setJForm(p => ({ ...p, date: e.target.value }))}
                                    className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
                            </div>
                            <input value={jForm.notes} onChange={e => setJForm(p => ({ ...p, notes: e.target.value }))} placeholder="Notes (optional)"
                                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                            <button onClick={addJob} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold">Save Job</button>
                        </div>
                    )}
                    <div className="divide-y divide-gray-50">
                        {jobs.length === 0 && <p className="text-center text-sm text-gray-400 py-10">No applications yet. Add one above!</p>}
                        {jobs.map(j => (
                            <div key={j._id} className="group flex items-center gap-3 px-5 py-4 hover:bg-gray-50">
                                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">🏢</div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-800">{j.role}</p>
                                    <p className="text-xs text-gray-400">{j.company}{j.location ? ` · ${j.location}` : ''} · {j.date}</p>
                                    {j.salary && <p className="text-xs text-emerald-600 font-medium mt-0.5">💰 {j.salary}</p>}
                                    {j.notes && <p className="text-xs text-gray-500 mt-0.5">📌 {j.notes}</p>}
                                </div>
                                <select value={j.status} onChange={e => updateJobStatus(j._id, e.target.value)}
                                    className={`text-xs font-bold px-2 py-1 rounded-full border-0 cursor-pointer ${JOB_COLORS[j.status] || 'bg-gray-100 text-gray-600'}`}>
                                    {['Applied', 'Interview', 'Offer', 'Rejected', 'Active', 'Withdrawn'].map(s => <option key={s}>{s}</option>)}
                                </select>
                                <button onClick={() => deleteJob(j._id)}
                                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-gray-400 hover:text-red-500 transition-all text-xs">✕</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── CERTS ── */}
            {tab === 'certs' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-gray-50 flex justify-between items-center">
                        <h2 className="text-sm font-bold text-gray-800">Certifications</h2>
                        <button onClick={() => setCNew(p => !p)} className="text-xs font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-xl">
                            {cNew ? '✕ Cancel' : '+ Add'}
                        </button>
                    </div>
                    {cNew && (
                        <div className="p-5 border-b border-gray-50 bg-violet-50/30 space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                                <input value={cForm.name} onChange={e => setCForm(p => ({ ...p, name: e.target.value }))} placeholder="Certification name *"
                                    className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                                <input value={cForm.issuer} onChange={e => setCForm(p => ({ ...p, issuer: e.target.value }))} placeholder="Issuing org *"
                                    className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <input value={cForm.emoji} onChange={e => setCForm(p => ({ ...p, emoji: e.target.value }))} placeholder="🏆"
                                    className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
                                <input type="date" value={cForm.issued} onChange={e => setCForm(p => ({ ...p, issued: e.target.value }))}
                                    className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
                                <input type="date" value={cForm.expires} onChange={e => setCForm(p => ({ ...p, expires: e.target.value }))}
                                    placeholder="Expiry" className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
                            </div>
                            <input value={cForm.credentialUrl} onChange={e => setCForm(p => ({ ...p, credentialUrl: e.target.value }))} placeholder="Credential URL (optional)"
                                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                            <button onClick={addCert} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold">Save Cert</button>
                        </div>
                    )}
                    <div className="divide-y divide-gray-50">
                        {certs.length === 0 && <p className="text-center text-sm text-gray-400 py-10">No certifications yet.</p>}
                        {certs.map(c => (
                            <div key={c._id} className="group flex items-center gap-3 px-5 py-4 hover:bg-gray-50">
                                <span className="text-2xl">{c.emoji}</span>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-gray-800">{c.name}</p>
                                    <p className="text-xs text-gray-400">{c.issuer} · Issued {c.issued}{c.expires ? ` · Exp ${c.expires}` : ' · No expiry'}</p>
                                    {c.credentialUrl && <a href={c.credentialUrl} target="_blank" rel="noreferrer" className="text-xs text-violet-600 underline">🔗 View credential</a>}
                                </div>
                                <span className={`text-xs font-bold px-3 py-1 rounded-full ${c.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{c.status}</span>
                                <button onClick={() => deleteCert(c._id)}
                                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-gray-400 hover:text-red-500 transition-all text-xs">✕</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── SKILLS ── */}
            {tab === 'skills' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-sm font-bold text-gray-800">Skills Matrix</h2>
                        <button onClick={() => setSNew(p => !p)} className="text-xs font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-xl">
                            {sNew ? '✕ Cancel' : '+ Add Skill'}
                        </button>
                    </div>
                    {sNew && (
                        <div className="flex gap-2 mb-4 flex-wrap p-3 bg-violet-50/30 rounded-xl">
                            <input value={sForm.name} onChange={e => setSForm(p => ({ ...p, name: e.target.value }))} placeholder="Skill name *"
                                className="flex-1 min-w-[150px] bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                            <select value={sForm.category} onChange={e => setSForm(p => ({ ...p, category: e.target.value }))}
                                className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
                                {['Technical', 'Soft', 'Domain'].map(c => <option key={c}>{c}</option>)}
                            </select>
                            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
                                <span className="text-xs text-gray-500">{sForm.level}%</span>
                                <input type="range" min={5} max={100} step={5} value={sForm.level} onChange={e => setSForm(p => ({ ...p, level: Number(e.target.value) }))} className="w-24 accent-violet-600" />
                            </div>
                            <button onClick={addSkill} className="px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold">Add</button>
                        </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {skills.map((s, i) => (
                            <div key={s._id} className="group p-3 bg-gray-50 rounded-xl">
                                <div className="flex justify-between items-center text-xs font-medium text-gray-700 mb-2">
                                    <span>{s.emoji} {s.name} <span className="text-gray-400 font-normal">· {s.category}</span></span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-500">{s.level}%</span>
                                        <button onClick={() => deleteSkill(s._id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all">✕</button>
                                    </div>
                                </div>
                                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div className={`h-full ${SKILL_COLORS[i % SKILL_COLORS.length]} rounded-full`} style={{ width: `${s.level}%` }} />
                                </div>
                                <input type="range" min={5} max={100} step={5} value={s.level}
                                    onChange={e => updateSkillLevel(s._id, Number(e.target.value))}
                                    className="w-full mt-2 accent-violet-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── PROFILE ── */}
            {tab === 'profile' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-sm font-bold text-gray-800">Professional Profile</h2>
                        <button onClick={saveProfile}
                            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${profSaved ? 'bg-emerald-500 text-white' : 'bg-violet-600 text-white hover:bg-violet-700'}`}>
                            {profSaved ? '✓ Saved!' : 'Save Profile'}
                        </button>
                    </div>
                    {([
                        { label: 'Current Role / Title', key: 'currentRole', ph: 'e.g. Full Stack Developer' },
                        { label: 'Years of Experience', key: 'experienceYrs', ph: '2.5', type: 'number' },
                        { label: 'LinkedIn Profile URL', key: 'linkedInUrl', ph: 'https://linkedin.com/in/yourprofile' },
                        { label: 'Naukri Profile URL', key: 'naukriUrl', ph: 'https://naukri.com/profile/...' },
                        { label: 'Portfolio URL', key: 'portfolioUrl', ph: 'https://yourportfolio.com' },
                    ] as { label: string; key: keyof ICareerProfile; ph: string; type?: string }[]).map(f => (
                        <div key={f.key}>
                            <label className="text-xs font-semibold text-gray-600 block mb-1">{f.label}</label>
                            <input type={f.type || 'text'} value={String(profile[f.key] || '')}
                                onChange={e => setProfile(p => ({ ...p, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value }))}
                                placeholder={f.ph}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                        </div>
                    ))}
                    <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1">Professional Summary</label>
                        <textarea value={profile.summary} onChange={e => setProfile(p => ({ ...p, summary: e.target.value }))}
                            placeholder="Brief description of your professional background..."
                            rows={3}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none" />
                    </div>
                    <div className="flex gap-3 pt-2">
                        {profile.linkedInUrl && (
                            <a href={profile.linkedInUrl} target="_blank" rel="noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors">
                                💼 Open LinkedIn
                            </a>
                        )}
                        {profile.naukriUrl && (
                            <a href={profile.naukriUrl} target="_blank" rel="noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-xs font-semibold rounded-xl hover:bg-orange-600 transition-colors">
                                🔍 Open Naukri
                            </a>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
