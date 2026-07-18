import { useState, useEffect, useCallback } from 'react';
import { goalApi, IGoal } from '../services/personalApi';

const AREAS = ['Personal', 'Work', 'Health', 'Finance', 'Learning', 'Relationships', 'Career'];
const AREA_EMOJI: Record<string, string> = {
    Personal: '🌟', Work: '💼', Health: '💪', Finance: '💰', Learning: '📚', Relationships: '❤️', Career: '🚀'
};

export default function GoalsPage() {
    const [goals, setGoals] = useState<IGoal[]>([]);
    const [selected, setSelected] = useState<IGoal | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [title, setTitle] = useState('');
    const [area, setArea] = useState('Personal');
    const [deadline, setDeadline] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        try { setGoals(await goalApi.getAll()); }
        catch { setError('Could not load goals.'); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load]);

    const addGoal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        try {
            const saved = await goalApi.create({
                title, area, emoji: AREA_EMOJI[area] || '🎯',
                progress: 0, deadline: deadline || null, milestones: [],
            });
            setGoals(prev => [saved, ...prev]);
            setTitle(''); setDeadline(''); setShowForm(false);
        } catch { setError('Failed to create goal.'); }
    };

    const remove = async (id: string) => {
        try { await goalApi.remove(id); setGoals(prev => prev.filter(g => g._id !== id)); setSelected(null); }
        catch { setError('Failed to delete.'); }
    };

    const updateProgress = async (id: string, progress: number) => {
        try {
            const updated = await goalApi.update(id, { progress });
            if (!updated) return;
            setGoals(prev => prev.map(g => g._id === id ? updated : g));
            if (selected?._id === id) setSelected(updated);
        } catch { setError('Failed to update progress.'); }
    };

    const toggleMilestone = async (goal: IGoal, mIdx: number) => {
        const newMs = goal.milestones.map((m, i) => i === mIdx ? { ...m, done: !m.done } : m);
        const auto = Math.round((newMs.filter(m => m.done).length / newMs.length) * 100);
        try {
            const updated = await goalApi.update(goal._id, { milestones: newMs, progress: auto });
            if (!updated) return;
            setGoals(prev => prev.map(g => g._id === goal._id ? updated : g));
            if (selected?._id === goal._id) setSelected(updated);
        } catch { setError('Failed to update milestone.'); }
    };

    const addMilestone = async (goal: IGoal, text: string) => {
        if (!text.trim()) return;
        const newMs = [...goal.milestones, { text, done: false }];
        try {
            const updated = await goalApi.update(goal._id, { milestones: newMs });
            setGoals(prev => prev.map(g => g._id === goal._id ? updated : g));
            if (selected?._id === goal._id) setSelected(updated);
        } catch { setError('Failed to add milestone.'); }
    };

    const progressColor = (p: number) => p >= 75 ? 'bg-emerald-500' : p >= 40 ? 'bg-violet-500' : 'bg-amber-400';

    return (
        <div className="space-y-6 pb-8 max-w-4xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">🎯 Goals</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Track your biggest life objectives</p>
                </div>
                <button onClick={() => setShowForm(p => !p)} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors">
                    {showForm ? '✕ Cancel' : '+ New Goal'}
                </button>
            </div>

            {error && <p className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-xl">{error}</p>}

            {/* Add form */}
            {showForm && (
                <form onSubmit={addGoal} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                    <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Goal title *" required
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                    <div className="flex gap-2 flex-wrap">
                        <select value={area} onChange={e => setArea(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
                            {AREAS.map(a => <option key={a}>{a}</option>)}
                        </select>
                        <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
                            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
                        <button type="submit" className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold">Create Goal</button>
                    </div>
                </form>
            )}

            {/* Goals grid */}
            {loading ? (
                <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" /></div>
            ) : goals.length === 0 ? (
                <div className="text-center py-16 text-gray-400"><p className="text-4xl mb-2">🎯</p><p className="text-sm">No goals yet. Add your first above!</p></div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {goals.map(g => (
                        <div key={g._id} className="group bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-violet-200 hover:shadow-md transition-all cursor-pointer"
                            onClick={() => setSelected(g)}>
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <span className="text-2xl">{g.emoji}</span>
                                    <h3 className="text-sm font-bold text-gray-800 mt-1">{g.title}</h3>
                                    <span className="text-[10px] bg-violet-100 text-violet-700 font-semibold px-2 py-0.5 rounded-full">{g.area}</span>
                                </div>
                                <button onClick={e => { e.stopPropagation(); remove(g._id); }}
                                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all text-xs">✕</button>
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs text-gray-500 font-medium">
                                    <span>Progress</span><span className="font-bold text-gray-700">{g.progress}%</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full transition-all ${progressColor(g.progress)}`} style={{ width: `${g.progress}%` }} />
                                </div>
                            </div>
                            {g.deadline && <p className="text-[10px] text-gray-400 mt-2">📅 {g.deadline}</p>}
                        </div>
                    ))}
                </div>
            )}

            {/* Goal detail modal */}
            {selected && (
                <GoalModal goal={selected} onClose={() => setSelected(null)}
                    onUpdateProgress={p => updateProgress(selected._id, p)}
                    onToggleMilestone={i => toggleMilestone(selected, i)}
                    onAddMilestone={t => addMilestone(selected, t)} />
            )}
        </div>
    );
}

function GoalModal({ goal, onClose, onUpdateProgress, onToggleMilestone, onAddMilestone }: {
    goal: IGoal;
    onClose: () => void;
    onUpdateProgress: (p: number) => void;
    onToggleMilestone: (i: number) => void;
    onAddMilestone: (t: string) => void;
}) {
    const [msText, setMsText] = useState('');
    const submit = (e: React.FormEvent) => { e.preventDefault(); onAddMilestone(msText); setMsText(''); };

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between mb-4">
                    <div><span className="text-2xl">{goal.emoji}</span><h2 className="text-lg font-bold text-gray-900 mt-1">{goal.title}</h2></div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg self-start">✕</button>
                </div>
                <div className="mb-4">
                    <div className="flex justify-between text-sm font-medium text-gray-600 mb-1"><span>Progress</span><span className="font-bold">{goal.progress}%</span></div>
                    <input type="range" min={0} max={100} value={goal.progress} onChange={e => onUpdateProgress(Number(e.target.value))}
                        className="w-full accent-violet-600" />
                </div>
                {goal.milestones.length > 0 && (
                    <div className="space-y-2 mb-4">
                        <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Milestones</p>
                        {goal.milestones.map((m, i) => (
                            <label key={i} className="flex items-center gap-2 cursor-pointer group">
                                <input type="checkbox" checked={m.done} onChange={() => onToggleMilestone(i)} className="accent-violet-600 w-4 h-4" />
                                <span className={`text-sm ${m.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>{m.text}</span>
                            </label>
                        ))}
                    </div>
                )}
                <form onSubmit={submit} className="flex gap-2">
                    <input value={msText} onChange={e => setMsText(e.target.value)} placeholder="Add milestone..."
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                    <button type="submit" className="px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold">Add</button>
                </form>
            </div>
        </div>
    );
}
