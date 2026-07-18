import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { taskApi, ITask } from '../services/personalApi';
import { aiIntelligence } from '../services/aiIntelligence';

type TabId = 'today' | 'week' | 'someday';

const AREAS = ['All', 'Work', 'Health', 'Personal', 'Finance', 'Learning'];
const AREA_COLORS: Record<string, string> = {
    Work: 'bg-blue-100 text-blue-700', Health: 'bg-rose-100 text-rose-700',
    Personal: 'bg-violet-100 text-violet-700', Finance: 'bg-green-100 text-green-700',
    Learning: 'bg-indigo-100 text-indigo-700',
};
const PRIORITY_COLORS: Record<string, string> = { high: 'text-red-600', medium: 'text-amber-600', low: 'text-gray-400' };

const TABS: { id: TabId; label: string; emoji: string }[] = [
    { id: 'today', label: 'Today', emoji: '☀️' },
    { id: 'week', label: 'This Week', emoji: '📆' },
    { id: 'someday', label: 'Someday', emoji: '🌙' },
];

export default function PersonalTasksPage() {
    const [tasks, setTasks] = useState<ITask[]>([]);
    const [activeTab, setActiveTab] = useState<TabId>('today');
    const [activeArea, setActiveArea] = useState('All');
    const [newTask, setNewTask] = useState('');
    const [newPriority, setNewPriority] = useState<ITask['priority']>('medium');
    const [newArea, setNewArea] = useState('Work');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [analyzing, setAnalyzing] = useState(false);
    const [suggestions, setSuggestions] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const data = await taskApi.getAll();
            setTasks(data);
        } catch { setError('Could not load tasks.'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const filtered = tasks.filter(t => t.tab === activeTab && (activeArea === 'All' || t.area === activeArea));
    const done = filtered.filter(t => t.done).length;

    const toggle = async (id: string) => {
        const task = tasks.find(t => t._id === id)!;
        try {
            const updated = await taskApi.update(id, { done: !task.done });
            if (updated) setTasks(prev => prev.map(t => t._id === id ? updated : t));
        } catch { setError('Failed to update task.'); }
    };

    const removeTask = async (id: string) => {
        try {
            await taskApi.remove(id);
            setTasks(prev => prev.filter(t => t._id !== id));
        } catch { setError('Failed to delete task.'); }
    };

    const addTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTask.trim()) return;
        try {
            const created = await taskApi.create({ title: newTask, priority: newPriority, area: newArea, tab: activeTab, done: false, dueDate: null });
            setTasks(prev => [created, ...prev]);
            setNewTask('');
        } catch { setError('Failed to add task.'); }
    };

    return (
        <div className="space-y-6 pb-8 max-w-3xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">✅ Tasks & Habits</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Stay on top of what matters</p>
                </div>
                <Link to="/health" className="text-sm font-semibold text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-xl transition-colors">💪 Habits →</Link>
            </div>

            {error && <p className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-xl">{error}</p>}

            {/* AI Suggestions */}
            {suggestions ? (
                <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <svg className="w-12 h-12 text-violet-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L14.85 8.65L22 9.25L16.5 13.92L18.18 21L12 17.27L5.82 21L7.5 13.92L2 9.25L9.15 8.65L12 2Z" /></svg>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-violet-800 flex items-center gap-2">
                            <span>✨ AI Strategy for Today</span>
                        </h3>
                        <button onClick={() => setSuggestions(null)} className="text-[10px] font-bold text-violet-400 hover:text-violet-600 uppercase tracking-tighter">Dismiss</button>
                    </div>
                    <div className="text-sm text-indigo-900/80 leading-relaxed whitespace-pre-wrap prose-sm max-w-none">
                        {suggestions}
                    </div>
                </div>
            ) : (
                <button
                    onClick={async () => {
                        setAnalyzing(true);
                        try {
                            const res = await aiIntelligence.analyzeTasks();
                            setSuggestions(res);
                        } catch {
                            setError('AI Task Analysis failed.');
                        } finally {
                            setAnalyzing(false);
                        }
                    }}
                    disabled={analyzing}
                    className="w-full py-3 bg-white border border-violet-100 hover:border-violet-200 rounded-2xl text-violet-600 text-sm font-bold shadow-sm hover:shadow transition-all flex items-center justify-center gap-2">
                    {analyzing ? <div className="animate-spin h-4 w-4 border-b-2 border-violet-600 rounded-full" /> : '✨ Smart Prioritize with AI'}
                </button>
            )}

            {/* Tabs */}
            <div className="flex gap-2">
                {TABS.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all
                            ${activeTab === tab.id ? 'bg-violet-600 text-white shadow-md shadow-violet-200' : 'bg-white text-gray-600 border border-gray-200 hover:border-violet-300'}`}>
                        {tab.emoji} {tab.label}
                        <span className={`text-xs rounded-full px-1.5 ${activeTab === tab.id ? 'bg-violet-500' : 'bg-gray-100 text-gray-500'}`}>
                            {tasks.filter(t => t.tab === tab.id && !t.done).length}
                        </span>
                    </button>
                ))}
            </div>

            {/* Add task */}
            <form onSubmit={addTask} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-2">
                <input value={newTask} onChange={e => setNewTask(e.target.value)}
                    placeholder="Add a new task..." className="flex-1 min-w-[200px] bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                <select value={newArea} onChange={e => setNewArea(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none">
                    {AREAS.filter(a => a !== 'All').map(a => <option key={a}>{a}</option>)}
                </select>
                <select value={newPriority} onChange={e => setNewPriority(e.target.value as ITask['priority'])}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none">
                    {['high', 'medium', 'low'].map(p => <option key={p}>{p}</option>)}
                </select>
                <button type="submit" className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors">+ Add</button>
            </form>

            {/* Progress bar */}
            {filtered.length > 0 && (
                <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${(done / filtered.length) * 100}%` }} />
                    </div>
                    <span className="text-sm font-semibold text-gray-600">{done}/{filtered.length} done</span>
                </div>
            )}

            {/* Area filter */}
            <div className="flex flex-wrap gap-2">
                {AREAS.map(area => (
                    <button key={area} onClick={() => setActiveArea(area)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all
                            ${activeArea === area ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-500 border-gray-200 hover:border-violet-300'}`}>
                        {area}
                    </button>
                ))}
            </div>

            {/* Task list */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.length === 0 && (
                        <div className="text-center py-12 text-gray-400">
                            <p className="text-4xl mb-2">🎉</p>
                            <p className="text-sm font-medium">All clear! Add a task above.</p>
                        </div>
                    )}
                    {filtered.map(task => (
                        <div key={task._id} className={`group flex items-center gap-3 p-4 rounded-xl border transition-all
                            ${task.done ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-100 shadow-sm hover:border-violet-200 hover:shadow-md'}`}>
                            <button onClick={() => toggle(task._id)}
                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
                                    ${task.done ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 hover:border-violet-400'}`}>
                                {task.done && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                            </button>
                            <span className={`flex-1 text-sm ${task.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>{task.title}</span>
                            <span className={`text-xs font-bold ${PRIORITY_COLORS[task.priority]}`}>●</span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${AREA_COLORS[task.area] || 'bg-gray-100 text-gray-600'}`}>{task.area}</span>
                            <button onClick={() => removeTask(task._id)}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
