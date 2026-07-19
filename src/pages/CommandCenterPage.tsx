// src/pages/CommandCenterPage.tsx
// The CEO interface: the morning brief comes to you, agent output waits in an
// approval queue, and the ghostwriter turns one source into platform drafts.

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
    staffApi, ingestApi,
    IWorkItem, IBrief, IIngestSource, IBlogPostSummary,
} from '../services/staff.api';

// ─── Tiny markdown renderer (headings, bullets, bold) ────────────────────────

function MarkdownLite({ text }: { text: string }) {
    const renderInline = (line: string) => {
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return parts.map((part, i) =>
            part.startsWith('**') && part.endsWith('**')
                ? <strong key={i} className="font-semibold text-gray-900 dark:text-gray-100">{part.slice(2, -2)}</strong>
                : <span key={i}>{part}</span>
        );
    };
    return (
        <div className="space-y-1.5">
            {text.split('\n').map((line, i) => {
                const trimmed = line.trim();
                if (!trimmed) return <div key={i} className="h-1" />;
                if (trimmed.startsWith('# ')) return <h1 key={i} className="text-lg font-bold text-gray-900 dark:text-white">{renderInline(trimmed.slice(2))}</h1>;
                if (trimmed.startsWith('## ')) return <h2 key={i} className="text-sm font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wide mt-3">{renderInline(trimmed.slice(3))}</h2>;
                if (trimmed.startsWith('### ')) return <h3 key={i} className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-2">{renderInline(trimmed.slice(4))}</h3>;
                if (trimmed.startsWith('- ')) return <p key={i} className="text-sm text-gray-700 dark:text-gray-300 pl-4 relative"><span className="absolute left-0 text-violet-400">•</span>{renderInline(trimmed.slice(2))}</p>;
                if (trimmed.startsWith('_') && trimmed.endsWith('_')) return <p key={i} className="text-xs italic text-gray-500 dark:text-gray-400">{trimmed.slice(1, -1)}</p>;
                return <p key={i} className="text-sm text-gray-700 dark:text-gray-300">{renderInline(trimmed)}</p>;
            })}
        </div>
    );
}

// ─── Queue item card ──────────────────────────────────────────────────────────

const TYPE_BADGE: Record<string, string> = {
    draft: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    decision: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    alert: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
};
const PLATFORM_EMOJI: Record<string, string> = { linkedin: '💼', x: '🐦', instagram: '🎬', blog: '🌍' };

function QueueCard({ item, onDone }: { item: IWorkItem; onDone: () => void }) {
    const [expanded, setExpanded] = useState(false);
    const [editText, setEditText] = useState(item.editedContent || item.content);
    const [busy, setBusy] = useState(false);

    const act = async (action: 'approve' | 'reject') => {
        setBusy(true);
        try {
            if (action === 'approve') {
                await staffApi.approve(item._id, editText !== item.content ? editText : undefined);
                toast.success(item.type === 'decision' ? 'Decision recorded' : 'Approved');
            } else {
                await staffApi.reject(item._id);
                toast.info('Rejected');
            }
            onDone();
        } catch {
            toast.error("Couldn't update the item — is the backend running?");
        } finally {
            setBusy(false);
        }
    };

    const copy = async () => {
        await navigator.clipboard.writeText(editText);
        toast.success('Copied to clipboard');
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm dark:bg-gray-900 dark:border-gray-800 overflow-hidden">
            <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-3 p-4 text-left">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${TYPE_BADGE[item.type]}`}>{item.type}</span>
                {item.meta?.platform && <span className="text-base">{PLATFORM_EMOJI[item.meta.platform] || '📄'}</span>}
                <span className="flex-1 text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{item.title}</span>
                <span className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                <span className={`text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}>▾</span>
            </button>

            {expanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-gray-50 dark:border-gray-800 pt-3">
                    {item.type === 'draft' ? (
                        <textarea
                            value={editText}
                            onChange={e => setEditText(e.target.value)}
                            rows={Math.min(14, Math.max(5, editText.split('\n').length + 1))}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-300 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 font-mono"
                        />
                    ) : (
                        <MarkdownLite text={item.content} />
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                        <button disabled={busy} onClick={() => act('approve')}
                            className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50">
                            ✓ {item.type === 'decision' ? 'Approve (park it)' : 'Approve'}
                        </button>
                        <button disabled={busy} onClick={() => act('reject')}
                            className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors disabled:opacity-50">
                            ✕ {item.type === 'decision' ? 'Keep active' : 'Reject'}
                        </button>
                        {item.type === 'draft' && (
                            <button onClick={copy}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 dark:bg-violet-500/10 dark:text-violet-300 dark:hover:bg-violet-500/20 transition-colors">
                                ⧉ Copy
                            </button>
                        )}
                        <span className="ml-auto text-[10px] text-gray-400 uppercase">by {item.agentRole.replace('_', ' ')}</span>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CommandCenterPage() {
    const [brief, setBrief] = useState<IBrief | null>(null);
    const [briefLoading, setBriefLoading] = useState(true);
    const [briefRunning, setBriefRunning] = useState(false);
    const [queue, setQueue] = useState<IWorkItem[]>([]);
    const [queueTab, setQueueTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
    const [offline, setOffline] = useState(false);

    // Ghostwriter panel
    const [gwTitle, setGwTitle] = useState('');
    const [gwText, setGwText] = useState('');
    const [gwBusy, setGwBusy] = useState(false);
    const [posts, setPosts] = useState<IBlogPostSummary[]>([]);

    // Sources panel
    const [sources, setSources] = useState<IIngestSource[]>([]);
    const [newFeedUrl, setNewFeedUrl] = useState('');
    const [reviewRunning, setReviewRunning] = useState(false);
    const [ghUser, setGhUser] = useState('');
    const [importing, setImporting] = useState(false);
    const [registering, setRegistering] = useState(false);

    const loadQueue = useCallback(async (tab = queueTab) => {
        try {
            setQueue(await staffApi.getQueue(tab));
            setOffline(false);
        } catch {
            setOffline(true);
        }
    }, [queueTab]);

    const loadBrief = useCallback(async () => {
        setBriefLoading(true);
        try {
            setBrief(await staffApi.getTodayBrief());
        } catch {
            setBrief(null); // 404 = not generated yet; other errors = offline (queue call decides)
        } finally {
            setBriefLoading(false);
        }
    }, []);

    useEffect(() => {
        loadBrief();
        loadQueue();
        staffApi.listPosts().then(setPosts).catch(() => setPosts([]));
        ingestApi.listSources().then(setSources).catch(() => setSources([]));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => { loadQueue(queueTab); }, [queueTab, loadQueue]);

    const runBrief = async () => {
        setBriefRunning(true);
        try {
            setBrief(await staffApi.runBrief());
            toast.success('Brief generated');
        } catch {
            toast.error("Couldn't generate the brief — is the backend running?");
        } finally {
            setBriefRunning(false);
        }
    };

    const runReview = async () => {
        setReviewRunning(true);
        try {
            const result = await staffApi.runReview();
            toast.success(`Review done — ${result.decisionsQueued} decision(s) queued`);
            loadQueue();
        } catch {
            toast.error("Couldn't run the review — is the backend running?");
        } finally {
            setReviewRunning(false);
        }
    };

    const ghostwrite = async (postId?: string) => {
        setGwBusy(true);
        try {
            const items = postId
                ? await staffApi.ghostwritePost(postId)
                : await staffApi.ghostwriteText(gwTitle, gwText);
            toast.success(`${items.length} draft(s) queued for approval`);
            setGwText(''); setGwTitle('');
            setQueueTab('pending');
            loadQueue('pending');
        } catch (err: unknown) {
            const e = err as { response?: { status?: number } };
            toast.error(e.response?.status === 503
                ? 'AI engine (Ollama) is offline — start it and retry.'
                : "Ghostwriter failed — check the backend.");
        } finally {
            setGwBusy(false);
        }
    };

    const addSource = async () => {
        if (!newFeedUrl.trim()) return;
        try {
            const s = await ingestApi.createSource(newFeedUrl.trim());
            setSources(prev => [s, ...prev]);
            setNewFeedUrl('');
            toast.success('Feed added — pulling now…');
            const result = await ingestApi.runSource(s._id);
            toast.success(`Ingested ${result.added} new post(s) of ${result.total}`);
            staffApi.listPosts().then(setPosts).catch(() => undefined);
        } catch {
            toast.error("Couldn't add/pull the feed.");
        }
    };

    const runSourceNow = async (id: string) => {
        try {
            const result = await ingestApi.runSource(id);
            toast.success(`Ingested ${result.added} new post(s) of ${result.total}`);
            setSources(await ingestApi.listSources());
            staffApi.listPosts().then(setPosts).catch(() => undefined);
        } catch {
            toast.error('Feed pull failed — check the URL.');
        }
    };

    const importGithub = async () => {
        setImporting(true);
        try {
            const r = await ingestApi.importGithub(ghUser.trim() || undefined);
            toast.success(`Imported ${r.projectsCreated} project(s), ${r.activityLogged} commits logged. Open Portfolio to activate your focus projects.`);
        } catch (err: unknown) {
            const e = err as { response?: { data?: { error?: { message?: string } } } };
            toast.error(e.response?.data?.error?.message || "Import failed — set GITHUB_USER/GITHUB_TOKEN in the backend .env.");
        } finally {
            setImporting(false);
        }
    };

    const registerWebhooks = async () => {
        setRegistering(true);
        try {
            const r = await ingestApi.registerGithubWebhooks();
            const ok = r.results.filter(x => x.status === 'registered' || x.status === 'already-exists').length;
            toast.success(`Webhooks: ${ok}/${r.results.length} repos ready at ${r.callbackUrl}`);
        } catch (err: unknown) {
            const e = err as { response?: { data?: { error?: { message?: string } } } };
            toast.error(e.response?.data?.error?.message || "Needs PUBLIC_BASE_URL + GITHUB_TOKEN (admin:repo_hook) in the backend .env.");
        } finally {
            setRegistering(false);
        }
    };

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">🎯 Command Center</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Your staff worked — you decide. Approve, edit, or kill.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={runBrief} disabled={briefRunning}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-50">
                        {briefRunning ? 'Writing…' : '☀️ Generate brief now'}
                    </button>
                    <button onClick={runReview} disabled={reviewRunning}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 dark:bg-violet-500/10 dark:text-violet-300 dark:hover:bg-violet-500/20 transition-colors disabled:opacity-50">
                        {reviewRunning ? 'Reviewing…' : '🔪 Run kill review'}
                    </button>
                </div>
            </div>

            {offline && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300 rounded-2xl p-4 text-sm">
                    ⚠️ The agent tier isn't reachable. Start it with <code className="font-mono text-xs bg-amber-100 dark:bg-amber-500/20 px-1.5 py-0.5 rounded">docker compose -f infra/docker-compose.yml up -d</code> — briefs, queue, and ghostwriter live there.
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ── Morning brief ── */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm dark:bg-gray-900 dark:border-gray-800 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-lg">☀️</span>
                        <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">Morning Brief</h2>
                        {brief && (
                            <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 uppercase">
                                {brief.generatedBy === 'llm' ? '🤖 written by your agent' : 'data template'}
                            </span>
                        )}
                    </div>
                    {briefLoading ? (
                        <div className="py-10 flex justify-center"><div className="animate-spin h-6 w-6 border-b-2 border-violet-600 rounded-full" /></div>
                    ) : brief ? (
                        <MarkdownLite text={brief.content} />
                    ) : (
                        <div className="text-center py-10 text-gray-400">
                            <p className="text-3xl mb-2">🌅</p>
                            <p className="text-sm">No brief for today yet.</p>
                            <p className="text-xs mt-1">Generate it now, or automate it: enable the scheduler on the Docker tier, or the GitHub-Actions cron on serverless (see DEPLOYMENT.md).</p>
                        </div>
                    )}
                </div>

                {/* ── Ghostwriter ── */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm dark:bg-gray-900 dark:border-gray-800 p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">✍️</span>
                        <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">Ghostwriter</h2>
                    </div>
                    <p className="text-xs text-gray-400 mb-3">One source in → LinkedIn + X + reel drafts out, queued for your approval.</p>
                    <input
                        value={gwTitle} onChange={e => setGwTitle(e.target.value)} placeholder="Title (optional)"
                        className="w-full mb-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-300 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                    />
                    <textarea
                        value={gwText} onChange={e => setGwText(e.target.value)} rows={5}
                        placeholder="Paste a blog post, an experience, a lesson learned…"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-300 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                    />
                    <button onClick={() => ghostwrite()} disabled={gwBusy || !gwText.trim()}
                        className="w-full mt-2 py-2.5 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-50">
                        {gwBusy ? 'Drafting (local LLM)…' : '✨ Generate 3 drafts'}
                    </button>

                    {posts.length > 0 && (
                        <div className="mt-4 border-t border-gray-50 dark:border-gray-800 pt-3">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Or draft from your blog</p>
                            <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                {posts.slice(0, 6).map(p => (
                                    <button key={p._id} onClick={() => ghostwrite(p._id)} disabled={gwBusy}
                                        className="w-full text-left text-xs px-3 py-2 rounded-lg bg-gray-50 hover:bg-violet-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-violet-500/10 transition-colors disabled:opacity-50">
                                        {p.ghostwrittenAt ? '✅ ' : '📝 '}{p.title}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Approval queue ── */}
            <div>
                <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Approval Queue</h2>
                    <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                        {(['pending', 'approved', 'rejected'] as const).map(tab => (
                            <button key={tab} onClick={() => setQueueTab(tab)}
                                className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-colors ${queueTab === tab
                                    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                                    : 'text-gray-500 dark:text-gray-400'}`}>
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>
                {queue.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm dark:bg-gray-900 dark:border-gray-800 p-8 text-center text-gray-400">
                        <p className="text-2xl mb-1">{queueTab === 'pending' ? '🏝️' : '📭'}</p>
                        <p className="text-sm">{queueTab === 'pending' ? 'Queue is clear — your staff has nothing waiting on you.' : `No ${queueTab} items.`}</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {queue.map(item => <QueueCard key={item._id} item={item} onDone={() => loadQueue()} />)}
                    </div>
                )}
            </div>

            {/* ── Data sources ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm dark:bg-gray-900 dark:border-gray-800 p-5">
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🔌</span>
                    <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">Data Sources</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Blog feed (RSS/Atom)</p>
                        <div className="flex gap-2">
                            <input value={newFeedUrl} onChange={e => setNewFeedUrl(e.target.value)}
                                placeholder="https://yourblog.com/feed.xml"
                                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-300 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200" />
                            <button onClick={addSource}
                                className="px-4 py-2 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors">Add</button>
                        </div>
                        <div className="mt-2 space-y-1.5">
                            {sources.map(s => (
                                <div key={s._id} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                                    <span className={`w-1.5 h-1.5 rounded-full ${s.lastStatus.startsWith('error') ? 'bg-red-500' : 'bg-emerald-500'}`} />
                                    <span className="flex-1 truncate">{s.url}</span>
                                    <button onClick={() => runSourceNow(s._id)} className="text-violet-600 dark:text-violet-300 font-semibold hover:underline">Pull</button>
                                    <button onClick={async () => { await ingestApi.deleteSource(s._id); setSources(prev => prev.filter(x => x._id !== s._id)); }}
                                        className="text-gray-400 hover:text-red-500">✕</button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">GitHub → import your portfolio</p>
                        <div className="flex gap-2">
                            <input value={ghUser} onChange={e => setGhUser(e.target.value)}
                                placeholder="GitHub username (or leave blank to use .env)"
                                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-300 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200" />
                            <button onClick={importGithub} disabled={importing}
                                className="px-4 py-2 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-50 whitespace-nowrap">
                                {importing ? 'Importing…' : 'Import repos'}
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-2">
                            Creates a Project card per repo (imported <span className="font-semibold">parked</span>) and backfills recent commits.
                            Public repos work with just a username; add <code className="font-mono text-[11px]">GITHUB_TOKEN</code> to the backend <code className="font-mono text-[11px]">.env</code> for private repos.
                        </p>
                        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                            <button onClick={registerWebhooks} disabled={registering}
                                className="px-4 py-2 rounded-xl text-xs font-semibold border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-colors disabled:opacity-50">
                                {registering ? 'Registering…' : '🔗 Register GitHub webhooks'}
                            </button>
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-2">
                                For live push/PR/issue activity: set <code className="font-mono text-[11px]">PUBLIC_BASE_URL</code> + <code className="font-mono text-[11px]">GITHUB_TOKEN</code> (with <code className="font-mono text-[11px]">admin:repo_hook</code>) in the backend <code className="font-mono text-[11px]">.env</code>, then click this once to register webhooks on all imported repos.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
