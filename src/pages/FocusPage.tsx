import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import { focusApi, gamificationApi, taskApi, IFocusSession, IGamification, ITask } from '../services/personalApi';
import { notifyError } from '../utils/notify';

// Pomodoro presets (minutes).
const PRESETS = [15, 25, 50];
const BREAK = 5;

const mmss = (secs: number) => `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
const fmtMins = (m: number) => m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;

export default function FocusPage() {
    const [duration, setDuration] = useState(25);           // chosen work length (min)
    const [mode, setMode] = useState<'focus' | 'break'>('focus');
    const [remaining, setRemaining] = useState(25 * 60);    // seconds
    const [running, setRunning] = useState(false);
    const [label, setLabel] = useState('');
    const [taskId, setTaskId] = useState<string>('');

    const [tasks, setTasks] = useState<ITask[]>([]);
    const [sessions, setSessions] = useState<IFocusSession[]>([]);
    const [todayMinutes, setTodayMinutes] = useState(0);
    const [totalMinutes, setTotalMinutes] = useState(0);
    const [game, setGame] = useState<IGamification | null>(null);
    const [loading, setLoading] = useState(true);

    const tick = useRef<ReturnType<typeof setInterval> | null>(null);

    const load = useCallback(async () => {
        try {
            const [f, g, t] = await Promise.all([
                focusApi.getAll(),
                gamificationApi.get().catch(() => null),
                taskApi.getAll().catch(() => []),
            ]);
            setSessions(f.sessions); setTodayMinutes(f.todayMinutes); setTotalMinutes(f.totalMinutes);
            if (g) setGame(g);
            setTasks((t as ITask[]).filter(x => !x.done));
        } catch { /* handled by empty state */ }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load]);

    // Reset the clock when the duration or mode changes (only while idle).
    useEffect(() => {
        if (!running) setRemaining((mode === 'focus' ? duration : BREAK) * 60);
    }, [duration, mode, running]);

    const completeFocus = useCallback(async () => {
        try {
            await focusApi.create({ label: label.trim() || (taskId ? tasks.find(t => t._id === taskId)?.title : '') || 'Focus', minutes: duration, taskId: taskId || null });
            toast.success(`🍅 Focused ${duration}m — logged!`);
            await load();
        } catch (e) { notifyError(e, 'Could not log focus session.'); }
    }, [label, taskId, tasks, duration, load]);

    // Countdown loop.
    useEffect(() => {
        if (!running) { if (tick.current) clearInterval(tick.current); return; }
        tick.current = setInterval(() => {
            setRemaining(prev => {
                if (prev <= 1) {
                    // Session finished.
                    if (tick.current) clearInterval(tick.current);
                    setRunning(false);
                    if (mode === 'focus') {
                        completeFocus();
                        setMode('break');
                        return BREAK * 60;
                    }
                    setMode('focus');
                    toast.info('Break over — ready for another round?');
                    return duration * 60;
                }
                return prev - 1;
            });
        }, 1000);
        return () => { if (tick.current) clearInterval(tick.current); };
    }, [running, mode, duration, completeFocus]);

    const start = () => setRunning(true);
    const pause = () => setRunning(false);
    const reset = () => { setRunning(false); setRemaining((mode === 'focus' ? duration : BREAK) * 60); };
    const logManual = async (mins: number) => {
        try { await focusApi.create({ label: label.trim() || 'Manual focus', minutes: mins, taskId: taskId || null }); toast.success(`Logged ${mins}m`); await load(); }
        catch (e) { notifyError(e, 'Could not log.'); }
    };
    const removeSession = async (id: string) => {
        try { await focusApi.remove(id); await load(); } catch (e) { notifyError(e, 'Could not delete.'); }
    };

    const total = (mode === 'focus' ? duration : BREAK) * 60;
    const pct = total > 0 ? 1 - remaining / total : 0;
    const R = 130, C = 2 * Math.PI * R;

    return (
        <div className="space-y-6 pb-8 max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">🍅 Focus</h1>
                <p className="text-sm text-gray-500 mt-0.5">Deep-work timer, session log & your streaks</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Timer */}
                <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center">
                    {/* Preset + mode */}
                    <div className="flex items-center gap-2 mb-5">
                        {PRESETS.map(p => (
                            <button key={p} onClick={() => { setMode('focus'); setDuration(p); }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all
                                    ${mode === 'focus' && duration === p ? 'bg-violet-600 text-white border-violet-600' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}>
                                {p}m
                            </button>
                        ))}
                        <span className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${mode === 'break' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                            ☕ Break {BREAK}m
                        </span>
                    </div>

                    {/* Ring */}
                    <div className="relative w-[300px] h-[300px] flex items-center justify-center">
                        <svg width="300" height="300" className="-rotate-90">
                            <circle cx="150" cy="150" r={R} fill="none" stroke="#f1f1f4" strokeWidth="14" />
                            <circle cx="150" cy="150" r={R} fill="none" strokeWidth="14" strokeLinecap="round"
                                stroke={mode === 'focus' ? '#7c3aed' : '#10b981'}
                                strokeDasharray={C} strokeDashoffset={C * (1 - pct)}
                                style={{ transition: 'stroke-dashoffset 1s linear' }} />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                            <span className="text-5xl font-bold text-gray-800 tabular-nums">{mmss(remaining)}</span>
                            <span className="text-xs font-semibold text-gray-400 mt-1 uppercase tracking-wide">{mode === 'focus' ? 'Focus' : 'Break'}</span>
                        </div>
                    </div>

                    {/* What are you focusing on */}
                    <div className="w-full mt-5 space-y-2">
                        <input value={label} onChange={e => setLabel(e.target.value)} placeholder="What are you focusing on?"
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                        {tasks.length > 0 && (
                            <select value={taskId} onChange={e => setTaskId(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
                                <option value="">— link a task (optional) —</option>
                                {tasks.map(t => <option key={t._id} value={t._id}>{t.title}</option>)}
                            </select>
                        )}
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-3 mt-4">
                        {!running
                            ? <button onClick={start} className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold">▶ Start</button>
                            : <button onClick={pause} className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold">⏸ Pause</button>}
                        <button onClick={reset} className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50">Reset</button>
                        <button onClick={() => logManual(duration)} title="Log this length without running the timer"
                            className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50">＋ Log {duration}m</button>
                    </div>
                </div>

                {/* Stats + gamification */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border bg-violet-50 border-violet-100 p-4">
                            <p className="text-xs font-medium text-gray-500">Today</p>
                            <p className="text-2xl font-bold text-violet-600">{fmtMins(todayMinutes)}</p>
                        </div>
                        <div className="rounded-2xl border bg-amber-50 border-amber-100 p-4">
                            <p className="text-xs font-medium text-gray-500">🔥 Focus streak</p>
                            <p className="text-2xl font-bold text-amber-600">{game?.focusStreak ?? 0}d</p>
                        </div>
                    </div>

                    {/* Level / XP */}
                    {game && (
                        <div className="rounded-2xl border border-gray-100 shadow-sm bg-white p-4">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-bold text-gray-800">Level {game.level}</span>
                                <span className="text-xs text-gray-400">{game.xp.toLocaleString()} XP</span>
                            </div>
                            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-700"
                                    style={{ width: `${Math.round((game.levelProgress || 0) * 100)}%` }} />
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1">{game.xpIntoLevel}/{game.xpForNext} XP to level {game.level + 1}</p>
                            <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                                <div><p className="text-sm font-bold text-gray-700">{fmtMins(totalMinutes)}</p><p className="text-[10px] text-gray-400">focused</p></div>
                                <div><p className="text-sm font-bold text-gray-700">{game.stats.tasksCompleted}</p><p className="text-[10px] text-gray-400">tasks done</p></div>
                                <div><p className="text-sm font-bold text-gray-700">{game.habitStreak}d</p><p className="text-[10px] text-gray-400">habit streak</p></div>
                            </div>
                        </div>
                    )}

                    {/* Achievements */}
                    {game && (
                        <div className="rounded-2xl border border-gray-100 shadow-sm bg-white p-4">
                            <p className="text-sm font-bold text-gray-800 mb-3">🏆 Achievements
                                <span className="text-xs font-normal text-gray-400"> · {game.achievements.filter(a => a.unlocked).length}/{game.achievements.length}</span></p>
                            <div className="grid grid-cols-2 gap-2">
                                {game.achievements.map(a => (
                                    <div key={a.id} title={a.desc}
                                        className={`flex items-center gap-2 p-2 rounded-xl border text-xs transition-all ${a.unlocked ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-100 opacity-50 grayscale'}`}>
                                        <span className="text-lg">{a.emoji}</span>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-gray-700 truncate">{a.name}</p>
                                            <p className="text-[10px] text-gray-400 truncate">{a.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Session log */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-50"><h2 className="text-sm font-bold text-gray-800">Recent sessions</h2></div>
                {loading ? (
                    <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-500" /></div>
                ) : sessions.length === 0 ? (
                    <p className="text-center text-sm text-gray-400 py-8">No focus sessions yet — start your first Pomodoro above! 🍅</p>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {sessions.slice(0, 20).map(s => (
                            <div key={s._id} className="group flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
                                <span className="text-lg">🍅</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 truncate">{s.label || 'Focus'}</p>
                                    <p className="text-[10px] text-gray-400">{s.date}</p>
                                </div>
                                <span className="text-sm font-bold text-violet-600">{fmtMins(s.minutes)}</span>
                                <button onClick={() => removeSession(s._id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 text-xs px-1">✕</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
