import { useCallback, useEffect, useMemo, useState } from "react";
import PageMeta from "../shared/PageMeta";
import { staffApi, ingestApi, IBlogPostSummary, IIngestSource } from "../services/staff.api";
import { notifyError } from "../utils/notify";

// Reading Room — reads the real RSS-ingested BlogPosts (same pipeline the
// Command Center's ghostwriter uses) instead of the old hardcoded article list.

const hostOf = (link: string) => {
    try { return new URL(link).hostname.replace(/^www\./, ''); } catch { return 'link'; }
};
const relDate = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function BlogsPage() {
    const [posts, setPosts] = useState<IBlogPostSummary[]>([]);
    const [sources, setSources] = useState<IIngestSource[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [sourceFilter, setSourceFilter] = useState('All');
    const [newFeed, setNewFeed] = useState('');
    const [busy, setBusy] = useState(false);
    const [showSources, setShowSources] = useState(false);

    const load = useCallback(() => {
        setLoading(true);
        staffApi.listPosts()
            .then(setPosts)
            .catch((e) => notifyError(e, "Couldn't load your reading feed."))
            .finally(() => setLoading(false));
        ingestApi.listSources().then(setSources).catch(() => setSources([]));
    }, []);
    useEffect(() => { load(); }, [load]);

    const addFeed = async () => {
        if (!newFeed.trim() || busy) return;
        setBusy(true);
        try {
            await ingestApi.createSource(newFeed.trim());
            setNewFeed('');
            setSources(await ingestApi.listSources());
        } catch (e) { notifyError(e, "Couldn't add that feed — check the URL."); }
        finally { setBusy(false); }
    };

    const pullSource = async (id: string) => {
        setBusy(true);
        try {
            await ingestApi.runSource(id);
            // Refresh both the source metadata and the article list.
            const [srcs, freshPosts] = await Promise.all([ingestApi.listSources(), staffApi.listPosts()]);
            setSources(srcs);
            setPosts(freshPosts);
        } catch (e) { notifyError(e, 'Feed pull failed.'); }
        finally { setBusy(false); }
    };

    const removeSource = async (id: string) => {
        try {
            await ingestApi.deleteSource(id);
            setSources(prev => prev.filter(s => s._id !== id));
        } catch (e) { notifyError(e, "Couldn't delete feed."); }
    };

    const hosts = useMemo(() => {
        const set = new Set(posts.map(p => hostOf(p.link)));
        return ['All', ...Array.from(set).filter(h => h !== 'link')];
    }, [posts]);

    const filtered = useMemo(() => posts.filter(p => {
        const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase());
        const matchesSource = sourceFilter === 'All' || hostOf(p.link) === sourceFilter;
        return matchesSearch && matchesSource;
    }), [posts, search, sourceFilter]);

    return (
        <div className="space-y-6 pb-8 max-w-4xl">
            <PageMeta title="Reading Room" description="Your ingested blog & article feed" />

            <div className="flex items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">📖 Reading Room</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Your own RSS feeds, ingested and searchable — the same source your ghostwriter draws from.</p>
                </div>
                <button onClick={() => setShowSources(s => !s)}
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors whitespace-nowrap">
                    {showSources ? '✕ Close' : '⚙️ Sources'}
                </button>
            </div>

            {/* Sources manager */}
            {showSources && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 space-y-3">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">RSS / Atom feeds</p>
                    <div className="flex gap-2">
                        <input value={newFeed} onChange={e => setNewFeed(e.target.value)} placeholder="https://example.com/feed.xml"
                            className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-300" />
                        <button onClick={addFeed} disabled={busy || !newFeed.trim()}
                            className="px-4 py-2 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-50 whitespace-nowrap">Add feed</button>
                    </div>
                    {sources.length === 0 ? (
                        <p className="text-xs text-gray-400">No feeds yet. Add your blog's RSS URL above, then pull it.</p>
                    ) : (
                        <div className="space-y-2">
                            {sources.map(s => (
                                <div key={s._id} className="flex items-center gap-2 text-sm">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-700 dark:text-gray-200 truncate">{s.label || hostOf(s.url)}</p>
                                        <p className="text-[11px] text-gray-400 truncate">{s.url} · {s.lastStatus || 'never pulled'}{s.lastItemCount ? ` · ${s.lastItemCount} items` : ''}</p>
                                    </div>
                                    <button onClick={() => pullSource(s._id)} disabled={busy}
                                        className="text-xs font-semibold text-violet-600 dark:text-violet-300 hover:underline disabled:opacity-50">Pull</button>
                                    <button onClick={() => removeSource(s._id)}
                                        className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors">✕</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Search + source filter */}
            <div className="flex flex-wrap gap-3">
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search articles…"
                    className="flex-1 min-w-[200px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-300" />
                {hosts.length > 1 && (
                    <div className="flex gap-2 flex-wrap">
                        {hosts.map(h => (
                            <button key={h} onClick={() => setSourceFilter(h)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${sourceFilter === h ? 'bg-violet-600 text-white border-violet-600' : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-violet-300'}`}>
                                {h}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Feed */}
            {loading ? (
                <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" /></div>
            ) : posts.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <p className="text-4xl mb-2">📰</p>
                    <p className="text-sm font-medium">No articles yet.</p>
                    <p className="text-xs mt-1">Open <button onClick={() => setShowSources(true)} className="text-violet-600 dark:text-violet-300 font-semibold hover:underline">Sources</button> and add your first RSS feed.</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-gray-400"><p className="text-sm">No articles match "{search}".</p></div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(p => (
                        <a key={p._id} href={p.link || '#'} target="_blank" rel="noopener noreferrer"
                            className="block bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 hover:border-violet-200 dark:hover:border-violet-800 hover:shadow-md transition-all group">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">{hostOf(p.link)}</span>
                                {p.publishedAt && <span className="text-[11px] text-gray-400">{relDate(p.publishedAt)}</span>}
                                {p.ghostwrittenAt && <span className="text-[10px] text-emerald-600 dark:text-emerald-400" title="Drafts generated by the ghostwriter">✍️ drafted</span>}
                            </div>
                            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors">{p.title}</h3>
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
}
