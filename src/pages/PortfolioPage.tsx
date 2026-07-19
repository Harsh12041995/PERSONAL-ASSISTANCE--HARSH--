// src/pages/PortfolioPage.tsx
// The portfolio: every project is explicitly active, parked, killed, or done.
// Attention is allocated like capital — the Friday question is always visible.

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { portfolioApi, staffApi, IProject, IDecision, IActivityEvent } from '../services/staff.api';
import { localToday } from '../utils/date';

const STATUS_META: Record<IProject['status'], { label: string; chip: string; dot: string }> = {
    active: { label: 'Active', chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300', dot: 'bg-emerald-500' },
    parked: { label: 'Parked', chip: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300', dot: 'bg-amber-500' },
    killed: { label: 'Killed', chip: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300', dot: 'bg-red-500' },
    done: { label: 'Done', chip: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300', dot: 'bg-sky-500' },
};

const DAY_MS = 86400000;
const staleDays = (p: IProject) => {
    const ref = p.lastActivityAt || p.statusChangedAt;
    return ref ? Math.floor((Date.now() - new Date(ref).getTime()) / DAY_MS) : null;
};

const EMPTY_FORM = { name: '', description: '', nextAction: '', githubRepo: '', status: 'active' as IProject['status'] };

// ─── Project card ─────────────────────────────────────────────────────────────

function ProjectCard({ project, onChanged }: { project: IProject; onChanged: () => void }) {
    const [nextAction, setNextAction] = useState(project.nextAction);
    const [logText, setLogText] = useState('');
    const [showLog, setShowLog] = useState(false);
    const stale = staleDays(project);
    const isStale = project.status === 'active' && stale !== null && stale >= 14;

    const setStatus = async (status: IProject['status']) => {
        try {
            await portfolioApi.updateProject(project._id, { status });
            toast.success(`${project.name} → ${STATUS_META[status].label}`);
            onChanged();
        } catch {
            toast.error("Couldn't update the project.");
        }
    };

    const saveNextAction = async () => {
        if (nextAction === project.nextAction) return;
        try {
            await portfolioApi.updateProject(project._id, { nextAction });
            toast.success('Next action saved');
        } catch {
            toast.error("Couldn't save.");
        }
    };

    const logActivity = async () => {
        if (!logText.trim()) return;
        try {
            await portfolioApi.logActivity(project._id, logText.trim());
            setLogText(''); setShowLog(false);
            toast.success('Activity logged');
            onChanged();
        } catch {
            toast.error("Couldn't log activity.");
        }
    };

    const deleteProject = async () => {
        if (!window.confirm(`Permanently delete "${project.name}"? This can't be undone.`)) return;
        try {
            await portfolioApi.deleteProject(project._id);
            toast.success(`${project.name} deleted`);
            onChanged();
        } catch {
            toast.error("Couldn't delete the project.");
        }
    };

    return (
        <div className={`bg-white rounded-2xl border shadow-sm dark:bg-gray-900 p-5 transition-all ${isStale
            ? 'border-amber-300 dark:border-amber-500/40'
            : 'border-gray-100 dark:border-gray-800'}`}>
            <div className="flex items-start gap-3">
                <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${STATUS_META[project.status].dot}`} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">{project.name}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${STATUS_META[project.status].chip}`}>
                            {STATUS_META[project.status].label}
                        </span>
                        {isStale && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                                ⚠️ {stale}d without activity
                            </span>
                        )}
                    </div>
                    {project.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{project.description}</p>}
                    {(project.tags?.length > 0 || project.links?.deploy || project.links?.docs) && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            {project.tags?.map(t => (
                                <span key={t} className="text-[10px] bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 px-2 py-0.5 rounded-full">#{t}</span>
                            ))}
                            {project.links?.deploy && <a href={project.links.deploy} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-[10px] font-semibold text-violet-600 dark:text-violet-300 hover:underline">🌐 deploy</a>}
                            {project.links?.docs && <a href={project.links.docs} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-[10px] font-semibold text-violet-600 dark:text-violet-300 hover:underline">📄 docs</a>}
                        </div>
                    )}
                </div>
            </div>

            {/* Next action — the resume handle */}
            <div className="mt-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Next action</p>
                <input
                    value={nextAction}
                    onChange={e => setNextAction(e.target.value)}
                    onBlur={saveNextAction}
                    onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                    placeholder="What's the single next step?"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-300 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                />
            </div>

            <div className="mt-3 flex items-center gap-2 flex-wrap text-xs">
                {project.status !== 'active' && <button onClick={() => setStatus('active')} className="px-3 py-1.5 rounded-lg font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 transition-colors">▶ Activate</button>}
                {project.status === 'active' && <button onClick={() => setStatus('parked')} className="px-3 py-1.5 rounded-lg font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-300 transition-colors">⏸ Park</button>}
                {project.status !== 'done' && project.status !== 'killed' && <button onClick={() => setStatus('killed')} className="px-3 py-1.5 rounded-lg font-semibold bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-300 transition-colors">🔪 Kill</button>}
                {project.status === 'active' && <button onClick={() => setStatus('done')} className="px-3 py-1.5 rounded-lg font-semibold bg-sky-50 text-sky-700 hover:bg-sky-100 dark:bg-sky-500/10 dark:text-sky-300 transition-colors">✓ Done</button>}
                <button onClick={() => setShowLog(!showLog)} className="px-3 py-1.5 rounded-lg font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 dark:bg-violet-500/10 dark:text-violet-300 transition-colors">+ Log work</button>
                {(project.status === 'killed' || project.status === 'done') && (
                    <button onClick={deleteProject} title="Delete project" className="px-3 py-1.5 rounded-lg font-semibold text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors">🗑 Delete</button>
                )}
                {project.githubRepo && <span className="ml-auto text-[10px] text-gray-400 font-mono truncate">⎇ {project.githubRepo}</span>}
            </div>

            {showLog && (
                <div className="mt-2 flex gap-2">
                    <input value={logText} onChange={e => setLogText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && logActivity()}
                        placeholder="What did you do?" autoFocus
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-300 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200" />
                    <button onClick={logActivity} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 text-white hover:bg-violet-700 transition-colors">Log</button>
                </div>
            )}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PortfolioPage() {
    const [projects, setProjects] = useState<IProject[]>([]);
    const [decisions, setDecisions] = useState<IDecision[]>([]);
    const [activity, setActivity] = useState<IActivityEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [decisionForm, setDecisionForm] = useState({ title: '', rationale: '' });
    const [showDecisionForm, setShowDecisionForm] = useState(false);
    const [reviewRunning, setReviewRunning] = useState(false);

    const load = useCallback(async () => {
        try {
            const [p, d, a] = await Promise.all([
                portfolioApi.listProjects(),
                portfolioApi.listDecisions(),
                portfolioApi.listActivity(),
            ]);
            setProjects(p); setDecisions(d); setActivity(a);
        } catch {
            toast.error("Couldn't load the portfolio — is the backend running?");
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { load(); }, [load]);

    const createProject = async () => {
        if (!form.name.trim()) return;
        try {
            await portfolioApi.createProject(form);
            setForm(EMPTY_FORM); setShowForm(false);
            toast.success('Project added');
            load();
        } catch {
            toast.error("Couldn't create the project.");
        }
    };

    const createDecision = async () => {
        if (!decisionForm.title.trim()) return;
        try {
            await portfolioApi.createDecision(decisionForm);
            setDecisionForm({ title: '', rationale: '' }); setShowDecisionForm(false);
            toast.success('Decision recorded');
            load();
        } catch {
            toast.error("Couldn't record the decision.");
        }
    };

    const reviewDecision = async (d: IDecision) => {
        const outcome = window.prompt(`How did "${d.title}" turn out? (records the outcome and marks it reviewed)`, d.outcome || '');
        if (outcome === null) return;
        try {
            await portfolioApi.updateDecision(d._id, { status: 'reviewed', outcome, reviewAt: localToday() });
            toast.success('Decision marked reviewed');
            load();
        } catch {
            toast.error("Couldn't update the decision.");
        }
    };

    const runReview = async () => {
        setReviewRunning(true);
        try {
            const result = await staffApi.runReview();
            toast.success(`Review done — memo written, ${result.decisionsQueued} decision(s) queued in HQ`);
        } catch {
            toast.error("Couldn't run the review.");
        } finally {
            setReviewRunning(false);
        }
    };

    const active = projects.filter(p => p.status === 'active');
    const parked = projects.filter(p => p.status === 'parked');
    const archived = projects.filter(p => p.status === 'killed' || p.status === 'done');

    return (
        <div className="space-y-6 pb-8">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">🗂️ Portfolio</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        The Friday question for every project: <span className="italic">would you start it today?</span>
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowForm(!showForm)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors">+ Add project</button>
                    <button onClick={runReview} disabled={reviewRunning}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 dark:bg-violet-500/10 dark:text-violet-300 dark:hover:bg-violet-500/20 transition-colors disabled:opacity-50">
                        {reviewRunning ? 'Reviewing…' : '🔪 Run kill review'}
                    </button>
                </div>
            </div>

            {/* WIP warning — the CEO rule */}
            {active.length > 3 && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300 rounded-2xl p-4 text-sm">
                    ⚠️ <strong>{active.length} active projects.</strong> You can't advance more than 2–3 at once — everything else is renting space in your head. Park the rest; parking is free.
                </div>
            )}

            {/* Create form */}
            {showForm && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm dark:bg-gray-900 dark:border-gray-800 p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Project name *" autoFocus
                        className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-300 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200" />
                    <input value={form.githubRepo} onChange={e => setForm({ ...form, githubRepo: e.target.value })} placeholder="GitHub repo (owner/name, optional)"
                        className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-300 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200" />
                    <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="One-line description"
                        className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-300 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200" />
                    <input value={form.nextAction} onChange={e => setForm({ ...form, nextAction: e.target.value })} placeholder="Next single action"
                        className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-300 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200" />
                    <div className="md:col-span-2 flex gap-2">
                        <button onClick={createProject} className="px-4 py-2 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors">Create</button>
                        <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 transition-colors">Cancel</button>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="py-16 flex justify-center"><div className="animate-spin h-8 w-8 border-b-2 border-violet-600 rounded-full" /></div>
            ) : projects.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm dark:bg-gray-900 dark:border-gray-800 p-10 text-center text-gray-400">
                    <p className="text-3xl mb-2">🗂️</p>
                    <p className="text-sm font-medium">No projects yet.</p>
                    <p className="text-xs mt-1">Add each thing you're building — agentic AI, legal assistant, marriage app, reels vault — then let the Friday review keep you honest.</p>
                    <p className="text-xs mt-3">Have GitHub repos? <Link to="/hq" className="text-violet-600 dark:text-violet-300 font-semibold hover:underline">Import them from Command Center →</Link></p>
                </div>
            ) : (
                <>
                    <div>
                        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Active ({active.length})</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {active.map(p => <ProjectCard key={p._id} project={p} onChanged={load} />)}
                            {active.length === 0 && <p className="text-xs text-gray-400">Nothing active. Activate a parked project or add one.</p>}
                        </div>
                    </div>
                    {parked.length > 0 && (
                        <div>
                            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Parked ({parked.length}) — costing you nothing</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {parked.map(p => <ProjectCard key={p._id} project={p} onChanged={load} />)}
                            </div>
                        </div>
                    )}
                    {archived.length > 0 && (
                        <div>
                            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Archive ({archived.length})</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-70">
                                {archived.map(p => <ProjectCard key={p._id} project={p} onChanged={load} />)}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Decisions + Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm dark:bg-gray-900 dark:border-gray-800 p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">⚖️</span>
                        <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">Decision Journal</h2>
                        <button onClick={() => setShowDecisionForm(!showDecisionForm)}
                            className="ml-auto text-xs font-semibold text-violet-600 dark:text-violet-300 hover:underline">+ Record decision</button>
                    </div>
                    {showDecisionForm && (
                        <div className="mb-3 space-y-2">
                            <input value={decisionForm.title} onChange={e => setDecisionForm({ ...decisionForm, title: e.target.value })} placeholder="What did you decide?" autoFocus
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-300 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200" />
                            <input value={decisionForm.rationale} onChange={e => setDecisionForm({ ...decisionForm, rationale: e.target.value })} placeholder="Why? (the part future-you needs)"
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-300 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200" />
                            <button onClick={createDecision} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 text-white hover:bg-violet-700 transition-colors">Save</button>
                        </div>
                    )}
                    {decisions.length === 0 ? (
                        <p className="text-xs text-gray-400 py-4 text-center">No decisions recorded. Tasks are cheap — decisions compound.</p>
                    ) : (
                        <div className="space-y-2 max-h-72 overflow-y-auto">
                            {decisions.slice(0, 20).map(d => (
                                <div key={d._id} className="text-xs bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="font-semibold text-gray-800 dark:text-gray-200">{d.title}</p>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${d.status === 'reviewed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>{d.status === 'reviewed' ? 'reviewed' : 'open'}</span>
                                    </div>
                                    {d.rationale && <p className="text-gray-500 dark:text-gray-400 mt-0.5">{d.rationale}</p>}
                                    {d.outcome && <p className="text-emerald-700 dark:text-emerald-300 mt-1">Outcome: {d.outcome}</p>}
                                    <div className="flex items-center justify-between mt-1">
                                        <p className="text-[10px] text-gray-400">{new Date(d.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                        {d.status !== 'reviewed' && (
                                            <button onClick={() => reviewDecision(d)} className="text-[10px] font-semibold text-violet-600 dark:text-violet-300 hover:underline">Mark reviewed →</button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm dark:bg-gray-900 dark:border-gray-800 p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">📡</span>
                        <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">Activity Feed</h2>
                    </div>
                    {activity.length === 0 ? (
                        <p className="text-xs text-gray-400 py-4 text-center">
                            Nothing yet. Connect GitHub webhooks and your blog feed in Command Center — activity flows in automatically.
                        </p>
                    ) : (
                        <div className="space-y-2 max-h-72 overflow-y-auto">
                            {activity.slice(0, 25).map(a => (
                                <div key={a._id} className="flex items-start gap-2 text-xs">
                                    <span className="mt-0.5">{a.source === 'github' ? '⎇' : a.source === 'rss' ? '🌍' : '✏️'}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-gray-700 dark:text-gray-300 truncate">{a.summary}</p>
                                        <p className="text-[10px] text-gray-400">{new Date(a.occurredAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
