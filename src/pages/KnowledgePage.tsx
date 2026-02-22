import { useState, useEffect, useCallback } from 'react';
import { knowledgeApi, INote } from '../services/personalApi';

const TYPES: { id: INote['type']; emoji: string; color: string }[] = [
    { id: 'Note', emoji: '📝', color: 'bg-violet-100 text-violet-700' },
    { id: 'Book', emoji: '📚', color: 'bg-amber-100 text-amber-700' },
    { id: 'Article', emoji: '📰', color: 'bg-blue-100 text-blue-700' },
    { id: 'Learning', emoji: '🎓', color: 'bg-emerald-100 text-emerald-700' },
];

export default function KnowledgePage() {
    const [notes, setNotes] = useState<INote[]>([]);
    const [filter, setFilter] = useState<INote['type'] | 'All'>('All');
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<INote | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [title, setTitle] = useState('');
    const [type, setType] = useState<INote['type']>('Note');
    const [content, setContent] = useState('');
    const [tagInput, setTagInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        try { setNotes(await knowledgeApi.getAll()); }
        catch { setError('Could not load notes.'); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load]);

    const typeConf = (t: INote['type']) => TYPES.find(x => x.id === t)!;

    const filtered = notes.filter(n =>
        (filter === 'All' || n.type === filter) &&
        (n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase()))
    );

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        const conf = typeConf(type);
        const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean);
        try {
            const saved = await knowledgeApi.create({ title, type, content, tags, emoji: conf.emoji });
            setNotes(prev => [saved, ...prev]);
            setTitle(''); setContent(''); setTagInput(''); setShowForm(false);
        } catch { setError('Failed to save note.'); }
    };

    const remove = async (id: string) => {
        try { await knowledgeApi.remove(id); setNotes(prev => prev.filter(n => n._id !== id)); setSelected(null); }
        catch { setError('Failed to delete.'); }
    };

    return (
        <div className="space-y-6 pb-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">🧠 Knowledge Base</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Notes, books, articles & learnings — all in one place</p>
                </div>
                <button onClick={() => setShowForm(p => !p)} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors">
                    {showForm ? '✕ Cancel' : '+ Add Note'}
                </button>
            </div>

            {error && <p className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-xl">{error}</p>}

            {/* Add form */}
            {showForm && (
                <form onSubmit={save} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                    <div className="flex gap-2 flex-wrap">
                        {TYPES.map(t => (
                            <button key={t.id} type="button" onClick={() => setType(t.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all
                                    ${type === t.id ? `${t.color} border-current` : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                                {t.emoji} {t.id}
                            </button>
                        ))}
                    </div>
                    <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title *" required
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                    <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Content / notes..." rows={4}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none" />
                    <div className="flex gap-2">
                        <input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Tags (comma separated)"
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                        <button type="submit" className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold">Save</button>
                    </div>
                </form>
            )}

            {/* Search & filter */}
            <div className="flex flex-wrap gap-3">
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes..."
                    className="flex-1 min-w-[200px] bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                <div className="flex gap-2">
                    {(['All', ...TYPES.map(t => t.id)] as const).map(f => (
                        <button key={f} onClick={() => setFilter(f as any)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all
                                ${filter === f ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-500 border-gray-200 hover:border-violet-300'}`}>
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Note grid */}
            {loading ? (
                <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" /></div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-gray-400"><p className="text-4xl mb-2">🧠</p><p className="text-sm">No notes yet. Add your first above!</p></div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map(n => {
                        const tc = typeConf(n.type);
                        return (
                            <div key={n._id} onClick={() => setSelected(n)}
                                className="group bg-white rounded-2xl border border-gray-100 shadow-sm p-4 cursor-pointer hover:border-violet-200 hover:shadow-md transition-all">
                                <div className="flex items-start justify-between mb-2">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tc.color}`}>{tc.emoji} {n.type}</span>
                                    <button onClick={e => { e.stopPropagation(); remove(n._id); }}
                                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all text-xs">✕</button>
                                </div>
                                <h3 className="text-sm font-semibold text-gray-800 mb-1 line-clamp-2">{n.title}</h3>
                                {n.content && <p className="text-xs text-gray-500 line-clamp-3 mb-2">{n.content}</p>}
                                {n.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {n.tags.map(tag => <span key={tag} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">#{tag}</span>)}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Detail modal */}
            {selected && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setSelected(null)}>
                    <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between mb-4">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeConf(selected.type).color}`}>{typeConf(selected.type).emoji} {selected.type}</span>
                            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 mb-3">{selected.title}</h2>
                        {selected.content && <p className="text-sm text-gray-600 leading-relaxed mb-4 whitespace-pre-wrap">{selected.content}</p>}
                        {selected.tags.length > 0 && <div className="flex flex-wrap gap-1">{selected.tags.map(t => <span key={t} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">#{t}</span>)}</div>}
                    </div>
                </div>
            )}
        </div>
    );
}
