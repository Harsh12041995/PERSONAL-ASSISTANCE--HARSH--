import { useState } from 'react';

// ── Types ───────────────────────────────────────────────────────────────────
type JobStatus = 'Applied' | 'Interview' | 'Offer' | 'Rejected' | 'Active';
type CertStatus = 'Active' | 'Expiring' | 'Expired';

interface Job { id: string; company: string; role: string; status: JobStatus; date: string; notes: string; }
interface Cert { id: string; name: string; issuer: string; emoji: string; issued: string; expires: string; status: CertStatus; }
interface Skill { id: string; name: string; level: number; color: string; }
interface Profile { experience: string; currentRole: string; linkedIn: string; naukri: string; }

// ── localStorage helpers (no generics — avoids TSX angle-bracket conflict) ─
const lsGet = (key: string, def: unknown) => {
    try { return JSON.parse(localStorage.getItem(key) || 'null') ?? def; } catch { return def; }
};
const lsSet = (key: string, val: unknown) => localStorage.setItem(key, JSON.stringify(val));
const uid = () => Math.random().toString(36).slice(2);
const today = () => new Date().toISOString().slice(0, 10);

// ── Colour maps ──────────────────────────────────────────────────────────────
const JOB_COLORS: Record<string, string> = {
    Applied: 'bg-amber-100 text-amber-700', Interview: 'bg-blue-100 text-blue-700',
    Offer: 'bg-emerald-100 text-emerald-700', Rejected: 'bg-red-100 text-red-700', Active: 'bg-violet-100 text-violet-700',
};
const SKILL_COLORS = ['bg-sky-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-pink-500', 'bg-indigo-500', 'bg-orange-500', 'bg-teal-500'];

const DEFAULT_SKILLS: Skill[] = [
    { id: '1', name: 'React / TypeScript', level: 85, color: 'bg-sky-500' },
    { id: '2', name: 'Node.js / Express', level: 70, color: 'bg-emerald-500' },
    { id: '3', name: 'MongoDB', level: 65, color: 'bg-violet-500' },
    { id: '4', name: 'Python', level: 55, color: 'bg-amber-500' },
    { id: '5', name: 'AWS', level: 40, color: 'bg-orange-500' },
    { id: '6', name: 'UI/UX Design', level: 60, color: 'bg-pink-500' },
];
const DEFAULT_JOBS: Job[] = [
    { id: '1', company: 'Freelance', role: 'Personal Project Lead', status: 'Active', date: '2026-01-01', notes: '' },
];
const DEFAULT_CERTS: Cert[] = [
    { id: '1', name: 'AWS Cloud Practitioner', issuer: 'Amazon', emoji: '☁️', issued: '2025-10-01', expires: '2027-10-01', status: 'Active' },
    { id: '2', name: 'React Developer Certification', issuer: 'Meta', emoji: '⚛️', issued: '2025-06-15', expires: '', status: 'Active' },
];
const DEFAULT_PROFILE: Profile = { experience: '2.5 yrs', currentRole: 'Full Stack Developer', linkedIn: '', naukri: '' };

export default function CareerPage() {
    const [jobs, setJobs] = useState<Job[]>(lsGet('career_jobs', DEFAULT_JOBS) as Job[]);
    const [certs, setCerts] = useState<Cert[]>(lsGet('career_certs', DEFAULT_CERTS) as Cert[]);
    const [skills, setSkills] = useState<Skill[]>(lsGet('career_skills', DEFAULT_SKILLS) as Skill[]);
    const [profile, setProfile] = useState<Profile>(lsGet('career_profile', DEFAULT_PROFILE) as Profile);
    const [tab, setTab] = useState<'jobs' | 'certs' | 'skills' | 'profile'>('jobs');

    const saveJobs = (v: Job[]) => { setJobs(v); lsSet('career_jobs', v); };
    const saveCerts = (v: Cert[]) => { setCerts(v); lsSet('career_certs', v); };
    const saveSkills = (v: Skill[]) => { setSkills(v); lsSet('career_skills', v); };
    const saveProfile = (p: Profile) => { setProfile(p); lsSet('career_profile', p); };

    // Job form
    const [jForm, setJForm] = useState({ company: '', role: '', status: 'Applied' as JobStatus, date: today(), notes: '' });
    const [jNew, setJNew] = useState(false);
    const addJob = () => {
        if (!jForm.company || !jForm.role) return;
        saveJobs([{ id: uid(), ...jForm }, ...jobs]);
        setJForm({ company: '', role: '', status: 'Applied', date: today(), notes: '' });
        setJNew(false);
    };

    // Cert form
    const [cForm, setCForm] = useState({ name: '', issuer: '', emoji: '🏆', issued: today(), expires: '', status: 'Active' as CertStatus });
    const [cNew, setCNew] = useState(false);
    const addCert = () => {
        if (!cForm.name || !cForm.issuer) return;
        saveCerts([{ id: uid(), ...cForm }, ...certs]);
        setCForm({ name: '', issuer: '', emoji: '🏆', issued: today(), expires: '', status: 'Active' });
        setCNew(false);
    };

    // Skill form
    const [sForm, setSForm] = useState({ name: '', level: 50 });
    const [sNew, setSNew] = useState(false);
    const addSkill = () => {
        if (!sForm.name) return;
        const color = SKILL_COLORS[skills.length % SKILL_COLORS.length];
        saveSkills([...skills, { id: uid(), name: sForm.name, level: sForm.level, color }]);
        setSForm({ name: '', level: 50 }); setSNew(false);
    };

    const TABS = [
        { id: 'jobs' as const, label: '📨 Jobs', count: jobs.length },
        { id: 'certs' as const, label: '🏆 Certs', count: certs.length },
        { id: 'skills' as const, label: '⚡ Skills', count: skills.length },
        { id: 'profile' as const, label: '👤 Profile', count: null },
    ];

    const stats = [
        { label: 'Experience', value: profile.experience, emoji: '⏱️', bg: 'bg-orange-50 border-orange-100' },
        { label: 'Certifications', value: String(certs.length), emoji: '🏆', bg: 'bg-amber-50 border-amber-100' },
        { label: 'Skills', value: String(skills.length), emoji: '⚡', bg: 'bg-violet-50 border-violet-100' },
        { label: 'Applications', value: String(jobs.filter(j => j.status !== 'Active').length), emoji: '📨', bg: 'bg-blue-50 border-blue-100' },
    ];

    return (
        <div className="space-y-6 pb-8 max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">💼 Career Hub</h1>
                <p className="text-sm text-gray-500 mt-0.5">Professional growth, certifications & job tracker</p>
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
                            <div className="grid grid-cols-2 gap-2">
                                <select value={jForm.status} onChange={e => setJForm(p => ({ ...p, status: e.target.value as JobStatus }))}
                                    className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
                                    {(['Applied', 'Interview', 'Offer', 'Rejected', 'Active'] as JobStatus[]).map(s => <option key={s}>{s}</option>)}
                                </select>
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
                            <div key={j.id} className="group flex items-center gap-3 px-5 py-4 hover:bg-gray-50">
                                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">🏢</div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-800">{j.role}</p>
                                    <p className="text-xs text-gray-400">{j.company} · {j.date}</p>
                                    {j.notes && <p className="text-xs text-gray-500 mt-0.5">📌 {j.notes}</p>}
                                </div>
                                <span className={`text-xs font-bold px-3 py-1 rounded-full ${JOB_COLORS[j.status]}`}>{j.status}</span>
                                <button onClick={() => saveJobs(jobs.filter(x => x.id !== j.id))}
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
                            <button onClick={addCert} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold">Save Cert</button>
                        </div>
                    )}
                    <div className="divide-y divide-gray-50">
                        {certs.length === 0 && <p className="text-center text-sm text-gray-400 py-10">No certifications yet.</p>}
                        {certs.map(c => (
                            <div key={c.id} className="group flex items-center gap-3 px-5 py-4 hover:bg-gray-50">
                                <span className="text-2xl">{c.emoji}</span>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-gray-800">{c.name}</p>
                                    <p className="text-xs text-gray-400">{c.issuer} · Issued {c.issued}{c.expires ? ` · Exp ${c.expires}` : ' · No expiry'}</p>
                                </div>
                                <span className={`text-xs font-bold px-3 py-1 rounded-full ${c.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{c.status}</span>
                                <button onClick={() => saveCerts(certs.filter(x => x.id !== c.id))}
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
                        <div className="flex gap-2 mb-4 flex-wrap">
                            <input value={sForm.name} onChange={e => setSForm(p => ({ ...p, name: e.target.value }))} placeholder="Skill name *"
                                className="flex-1 min-w-[150px] bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                                <span className="text-xs text-gray-500">{sForm.level}%</span>
                                <input type="range" min={5} max={100} step={5} value={sForm.level} onChange={e => setSForm(p => ({ ...p, level: Number(e.target.value) }))} className="w-24 accent-violet-600" />
                            </div>
                            <button onClick={addSkill} className="px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold">Add</button>
                        </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {skills.map(s => (
                            <div key={s.id} className="group p-3 bg-gray-50 rounded-xl">
                                <div className="flex justify-between items-center text-xs font-medium text-gray-700 mb-2">
                                    <span>{s.name}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-500">{s.level}%</span>
                                        <button onClick={() => saveSkills(skills.filter(x => x.id !== s.id))}
                                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all">✕</button>
                                    </div>
                                </div>
                                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div className={`h-full ${s.color} rounded-full`} style={{ width: `${s.level}%` }} />
                                </div>
                                <input type="range" min={5} max={100} step={5} value={s.level}
                                    onChange={e => saveSkills(skills.map(x => x.id === s.id ? { ...x, level: Number(e.target.value) } : x))}
                                    className="w-full mt-2 accent-violet-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── PROFILE ── */}
            {tab === 'profile' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                    <h2 className="text-sm font-bold text-gray-800 mb-2">Professional Profile</h2>
                    {([
                        { label: 'Years of Experience', key: 'experience', ph: 'e.g. 2.5 yrs' },
                        { label: 'Current Role / Title', key: 'currentRole', ph: 'e.g. Full Stack Developer' },
                        { label: 'LinkedIn Profile URL', key: 'linkedIn', ph: 'https://linkedin.com/in/yourprofile' },
                        { label: 'Naukri Profile URL', key: 'naukri', ph: 'https://naukri.com/profile/...' },
                    ] as { label: string; key: keyof Profile; ph: string }[]).map(f => (
                        <div key={f.key}>
                            <label className="text-xs font-semibold text-gray-600 block mb-1">{f.label}</label>
                            <input value={profile[f.key]} onChange={e => saveProfile({ ...profile, [f.key]: e.target.value })}
                                placeholder={f.ph}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                        </div>
                    ))}
                    <div className="flex gap-3 pt-2">
                        {profile.linkedIn && (
                            <a href={profile.linkedIn} target="_blank" rel="noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors">
                                💼 Open LinkedIn
                            </a>
                        )}
                        {profile.naukri && (
                            <a href={profile.naukri} target="_blank" rel="noreferrer"
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
