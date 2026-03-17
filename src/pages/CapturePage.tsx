import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { captureApi, ICapture } from '../services/personalApi';
import VoiceTranscriber from '../components/VoiceTranscriber';

type CaptureType = ICapture['type'];

const CAPTURE_TYPES: { type: CaptureType; emoji: string; label: string; color: string; bg: string }[] = [
    { type: 'Idea', emoji: '💡', label: 'Idea', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
    { type: 'Task', emoji: '✅', label: 'Task', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
    { type: 'Article', emoji: '📰', label: 'Article', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
    { type: 'Follow-up', emoji: '📞', label: 'Follow-up', color: 'text-sky-700', bg: 'bg-sky-50 border-sky-200' },
    { type: 'Money', emoji: '💰', label: 'Money', color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
    { type: 'Urgent', emoji: '🔴', label: 'Urgent', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
    { type: 'Journal', emoji: '📓', label: 'Journal', color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
];

export default function CapturePage() {
    const [captures, setCaptures] = useState<ICapture[]>([]);
    const [text, setText] = useState('');
    const [selectedType, setSelectedType] = useState<CaptureType>('Idea');
    const [filterType, setFilterType] = useState<CaptureType | 'All'>('All');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showVoice, setShowVoice] = useState(false);

    // ── Load from API ────────────────────────────────────────────────────────
    const load = useCallback(async () => {
        try {
            const data = await captureApi.getAll();
            setCaptures(data);
        } catch {
            setError('Could not load captures.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    // ── Save ─────────────────────────────────────────────────────────────────
    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!text.trim()) return;

        const tc = CAPTURE_TYPES.find(c => c.type === selectedType)!;
        try {
            const saved = await captureApi.create({
                type: selectedType,
                text: text,
                emoji: tc.emoji,
                rawText: text,
                isRefined: false
            });
            setCaptures(prev => [saved, ...prev]);
            setText('');
            setSubmitted(true);
            setTimeout(() => setSubmitted(false), 2000);
        } catch { setError('Failed to save.'); }
    };

    // ── Delete ───────────────────────────────────────────────────────────────
    const handleDelete = async (id: string) => {
        try {
            await captureApi.remove(id);
            setCaptures(prev => prev.filter(c => c._id !== id));
        } catch { setError('Failed to delete.'); }
    };

    const filtered = filterType === 'All' ? captures : captures.filter(c => c.type === filterType);
    const getTypeConf = (type: CaptureType) => CAPTURE_TYPES.find(c => c.type === type)!;
    const relTime = (iso: string) => {
        const diff = Date.now() - new Date(iso).getTime();
        const m = Math.floor(diff / 60000);
        if (m < 1) return 'Just now';
        if (m < 60) return `${m}m ago`;
        if (m < 1440) return `${Math.floor(m / 60)}h ago`;
        return `${Math.floor(m / 1440)}d ago`;
    };

    return (
        <div className="space-y-6 pb-8 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">📝 Quick Capture</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Dump any thought instantly — ideas, tasks, links, money notes</p>
                </div>
                <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
                    {captures.length} captured
                </span>
            </div>

            {error && <p className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-xl">{error}</p>}

            {/* Capture Form */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex flex-wrap gap-2 mb-4">
                    {CAPTURE_TYPES.map(ct => (
                        <button key={ct.type} onClick={() => setSelectedType(ct.type)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150
                                ${selectedType === ct.type ? `${ct.bg} ${ct.color} border-current` : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}>
                            {ct.emoji} {ct.label}
                        </button>
                    ))}
                </div>
                <form onSubmit={handleSubmit}>
                    <textarea value={text} onChange={e => setText(e.target.value)}
                        placeholder={`What's on your mind? (${selectedType})`} rows={3}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 resize-none transition-all"
                        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e as any); }} />
                    <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-3">
                            <p className="text-xs text-gray-400">Press ⌘+Enter to save quickly</p>
                            <button type="button" onClick={() => setShowVoice(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 transition-all">
                                🎙️ Record Voice Journal
                            </button>
                        </div>
                        <button type="submit"
                            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200
                                ${submitted ? 'bg-emerald-500 text-white' : 'bg-violet-600 hover:bg-violet-700 text-white'}`}>
                            {submitted ? '✓ Captured!' : `Save ${CAPTURE_TYPES.find(c => c.type === selectedType)?.emoji}`}
                        </button>
                    </div>
                </form>
            </div>

            {/* Filter + List */}
            <div>
                <div className="flex flex-wrap gap-2 mb-4">
                    <button onClick={() => setFilterType('All')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all
                            ${filterType === 'All' ? 'bg-violet-600 text-white border-violet-600' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}>
                        All ({captures.length})
                    </button>
                    {CAPTURE_TYPES.map(ct => {
                        const count = captures.filter(c => c.type === ct.type).length;
                        if (!count) return null;
                        return (
                            <button key={ct.type} onClick={() => setFilterType(ct.type)}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all
                                    ${filterType === ct.type ? `${ct.bg} ${ct.color} border-current` : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}>
                                {ct.emoji} {ct.type} ({count})
                            </button>
                        );
                    })}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filtered.length === 0 && (
                            <div className="text-center py-12 text-gray-400">
                                <p className="text-3xl mb-2">📝</p>
                                <p className="text-sm">No captures yet. Add your first one above!</p>
                            </div>
                        )}
                        {filtered.map(cap => {
                            const tc = getTypeConf(cap.type);
                            return (
                                <div key={cap._id} className="group flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-violet-200 hover:shadow-md transition-all duration-200">
                                    <span className="text-2xl flex-shrink-0">{cap.emoji}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tc.bg} ${tc.color}`}>{cap.type}</span>
                                            <span className="text-[10px] text-gray-400">{relTime(cap.createdAt)}</span>
                                        </div>
                                        <p className="text-sm text-gray-800 leading-snug">{cap.text}</p>
                                    </div>
                                    <button onClick={() => handleDelete(cap._id)}
                                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-violet-600 transition-colors">← Back to Home</Link>

            {showVoice && (
                <VoiceTranscriber
                    initialType="Journal"
                    onClose={() => { setShowVoice(false); load(); }}
                />
            )}
        </div>
    );
}
