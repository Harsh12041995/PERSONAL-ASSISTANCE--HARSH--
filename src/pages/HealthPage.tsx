import { useState, useEffect, useCallback, useRef } from 'react';
import { healthApi, settingsApi, IHealthDay, IUserSettings } from '../services/personalApi';
import { localDate } from '../utils/date';
import { notifyError } from '../utils/notify';

// Built-in defaults — used when the user hasn't defined any custom habits.
const DEFAULT_HABITS: HabitDef[] = [
    { key: 'Morning workout', label: 'Morning workout', emoji: '💪' },
    { key: 'Drink 8 glasses water', label: 'Drink 8 glasses water', emoji: '💧' },
    { key: 'Read 30 mins', label: 'Read 30 mins', emoji: '📚' },
    { key: 'Meditate 10 mins', label: 'Meditate 10 mins', emoji: '🧘' },
    { key: 'Sleep by 11 PM', label: 'Sleep by 11 PM', emoji: '😴' },
    { key: 'Journal entry', label: 'Journal entry', emoji: '📓' },
];
interface HabitDef { key: string; label: string; emoji: string }

const MOODS = [
    { emoji: '😄', label: 'Great', score: 5 }, { emoji: '😊', label: 'Good', score: 4 },
    { emoji: '😐', label: 'Okay', score: 3 }, { emoji: '😔', label: 'Low', score: 2 },
    { emoji: '😩', label: 'Stressed', score: 1 },
];
const moodScore = (label: string | null) => MOODS.find(m => m.label === label)?.score ?? 0;
const toDate = (d = new Date()) => localDate(d);
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return localDate(d); };
const sleepHrs = (bed: string, wake: string) => {
    if (!bed || !wake) return '—';
    const [bh, bm] = bed.split(':').map(Number);
    const [wh, wm] = wake.split(':').map(Number);
    let diff = (wh + wm / 60) - (bh + bm / 60);
    if (diff < 0) diff += 24;
    return diff.toFixed(1);
};

const empty = (): IHealthDay => ({ date: toDate(), habits: {}, mood: null, moodNote: '', sleep: { bedtime: '', wakeup: '' }, energy: 5 });

export default function HealthPage() {
    const [day, setDay] = useState<IHealthDay>(empty());
    const [habitDefs, setHabitDefs] = useState<HabitDef[]>(DEFAULT_HABITS);
    const [range, setRange] = useState<IHealthDay[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [newHabit, setNewHabit] = useState('');
    const [managing, setManaging] = useState(false);
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const load = useCallback(async () => {
        try {
            const [today, hist, settings] = await Promise.all([
                healthApi.getDay(toDate()),
                healthApi.getRange(daysAgo(29), toDate()),
                settingsApi.get().catch(() => null),
            ]);
            setDay(today || empty());
            setRange(Array.isArray(hist) ? hist : []);
            const custom = (settings as IUserSettings | null)?.habits;
            if (custom && custom.length) {
                setHabitDefs(custom.map(h => ({ key: h.key, label: h.label || h.key, emoji: h.emoji || '✅' })));
            }
        } catch { setError('Could not load health data.'); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load]);

    // Auto-save today's doc with debounce.
    const persist = (updated: IHealthDay) => {
        setDay(updated);
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(async () => {
            setSaving(true);
            try {
                await healthApi.saveDay(updated.date, updated);
                // Keep the trend range in sync with the day we just saved.
                setRange(prev => {
                    const rest = prev.filter(d => d.date !== updated.date);
                    return [...rest, updated].sort((a, b) => a.date.localeCompare(b.date));
                });
            } catch { setError('Auto-save failed.'); }
            finally { setSaving(false); }
        }, 800);
    };

    const toggleHabit = (key: string) => {
        persist({ ...day, habits: { ...day.habits, [key]: !day.habits[key] } });
    };
    const setMood = (m: string) => persist({ ...day, mood: m });
    const setMoodNote = (n: string) => persist({ ...day, moodNote: n });
    const setSleep = (k: 'bedtime' | 'wakeup', v: string) => persist({ ...day, sleep: { ...day.sleep, [k]: v } });
    const setEnergy = (e: number) => persist({ ...day, energy: e });

    const saveHabitDefs = async (defs: HabitDef[]) => {
        setHabitDefs(defs);
        try { await settingsApi.save({ habits: defs }); }
        catch (e) { notifyError(e, 'Could not save habits.'); }
    };
    const addHabit = () => {
        const label = newHabit.trim();
        if (!label) return;
        if (habitDefs.some(h => h.key === label)) { setNewHabit(''); return; }
        saveHabitDefs([...habitDefs, { key: label, label, emoji: '✅' }]);
        setNewHabit('');
    };
    const removeHabit = (key: string) => saveHabitDefs(habitDefs.filter(h => h.key !== key));

    const doneCount = habitDefs.filter(h => day.habits[h.key]).length;
    const hrs = sleepHrs(day.sleep.bedtime, day.sleep.wakeup);

    // Trend series (last 30 days, oldest→newest) keyed by date for gap-free bars.
    const series = Array.from({ length: 30 }, (_, i) => {
        const date = daysAgo(29 - i);
        const rec = range.find(r => r.date === date);
        const habitDone = rec ? habitDefs.filter(h => rec.habits?.[h.key]).length : 0;
        return {
            date,
            energy: rec?.energy ?? 0,
            mood: moodScore(rec?.mood ?? null),
            habitPct: habitDefs.length ? habitDone / habitDefs.length : 0,
            has: !!rec,
        };
    });
    const avg = (nums: number[]) => { const v = nums.filter(n => n > 0); return v.length ? (v.reduce((a, b) => a + b, 0) / v.length) : 0; };
    const avgEnergy = avg(series.map(s => s.energy));
    const avgMood = avg(series.map(s => s.mood));
    const daysTracked = series.filter(s => s.has).length;

    return (
        <div className="space-y-6 pb-8 max-w-4xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">💪 Health & Habits</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Daily wellness tracking — habits, mood, and sleep</p>
                </div>
                {saving && <span className="text-xs text-violet-500 font-medium animate-pulse">Saving…</span>}
            </div>

            {error && <p className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-xl">{error}</p>}

            {/* Summary row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: "Today's Habits", value: `${doneCount}/${habitDefs.length}`, sub: 'completed', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
                    { label: 'Sleep', value: `${hrs}h`, sub: 'last night', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
                    { label: 'Energy Level', value: `${day.energy}/5`, sub: 'self-rated', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
                    { label: "Today's Mood", value: day.mood ? MOODS.find(m => m.label === day.mood)?.emoji || '—' : '—', sub: day.mood || 'not set', color: 'text-rose-600', bg: 'bg-rose-50 border-rose-100' },
                ].map(s => (
                    <div key={s.label} className={`rounded-2xl border p-4 ${s.bg}`}>
                        <p className="text-xs font-medium text-gray-500 mb-1">{s.label}</p>
                        <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-[10px] text-gray-400">{s.sub}</p>
                    </div>
                ))}
            </div>

            {/* Habit checklist (today) */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-gray-800">Today's Habits — {toDate()}</h2>
                    <button onClick={() => setManaging(m => !m)} className="text-xs font-medium text-violet-600 hover:text-violet-700">
                        {managing ? 'Done' : 'Manage'}
                    </button>
                </div>
                {loading ? <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-500" /></div> : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {habitDefs.map(habit => {
                            const done = !!day.habits[habit.key];
                            return (
                                <div key={habit.key} className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all
                                        ${done ? 'border-violet-400 bg-violet-50' : 'border-gray-200 bg-white'}`}>
                                    <button onClick={() => toggleHabit(habit.key)} className="flex items-center gap-3 flex-1 text-left">
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
                                            ${done ? 'bg-violet-500 border-violet-500' : 'border-gray-300'}`}>
                                            {done && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                        </div>
                                        <span className="text-sm text-gray-700">{habit.emoji} {habit.label}</span>
                                    </button>
                                    {managing && (
                                        <button onClick={() => removeHabit(habit.key)} title="Remove habit"
                                            className="p-1 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
                {managing && (
                    <div className="mt-3 flex gap-2">
                        <input value={newHabit} onChange={e => setNewHabit(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') addHabit(); }}
                            placeholder="Add a custom habit…"
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                        <button onClick={addHabit} className="px-4 py-2 rounded-xl bg-violet-500 text-white text-sm font-medium hover:bg-violet-600 transition-colors">Add</button>
                    </div>
                )}
                <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full transition-all duration-500" style={{ width: `${habitDefs.length ? (doneCount / habitDefs.length) * 100 : 0}%` }} />
                </div>
            </div>

            {/* Mood + sleep */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h2 className="text-sm font-bold text-gray-800 mb-3">Today's Mood</h2>
                    <div className="flex gap-2 flex-wrap mb-3">
                        {MOODS.map(m => (
                            <button key={m.label} onClick={() => setMood(m.label)}
                                className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all
                                    ${day.mood === m.label ? 'border-violet-400 bg-violet-50' : 'border-gray-100 hover:border-violet-200'}`}>
                                <span className="text-2xl">{m.emoji}</span>
                                <span className="text-[10px] font-medium text-gray-500">{m.label}</span>
                            </button>
                        ))}
                    </div>
                    {day.mood && (
                        <input value={day.moodNote} onChange={e => setMoodNote(e.target.value)}
                            placeholder={`Why ${day.mood.toLowerCase()}? (optional)`}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-violet-300" />
                    )}
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h2 className="text-sm font-bold text-gray-800 mb-3">Sleep Log</h2>
                    <div className="space-y-3">
                        {[{ label: 'Bedtime', key: 'bedtime' } as const, { label: 'Wake up', key: 'wakeup' } as const].map(row => (
                            <div key={row.key} className="flex items-center justify-between">
                                <label className="text-xs text-gray-500 font-medium">{row.label}</label>
                                <input type="time" value={day.sleep[row.key]} onChange={e => setSleep(row.key, e.target.value)}
                                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                            </div>
                        ))}
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                            <span className="text-xs font-medium text-blue-700">Total sleep</span>
                            <span className="text-lg font-bold text-blue-700">{hrs} hrs</span>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 font-medium mb-2 block">Energy level: {day.energy}/5</label>
                            <input type="range" min={1} max={5} value={day.energy} onChange={e => setEnergy(Number(e.target.value))} className="w-full accent-violet-500" />
                        </div>
                    </div>
                </div>
            </div>

            {/* 30-day trends */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-gray-800">30-Day Trends</h2>
                    <div className="flex gap-4 text-[11px] text-gray-500">
                        <span>Avg energy <b className="text-amber-600">{avgEnergy ? avgEnergy.toFixed(1) : '—'}</b></span>
                        <span>Avg mood <b className="text-rose-600">{avgMood ? avgMood.toFixed(1) : '—'}</b></span>
                        <span><b className="text-violet-600">{daysTracked}</b> days tracked</span>
                    </div>
                </div>
                {daysTracked === 0 ? (
                    <p className="text-xs text-gray-400 py-6 text-center">Track a few days to see your trends here.</p>
                ) : (
                    <div className="space-y-4">
                        {[
                            { label: 'Energy', key: 'energy' as const, max: 5, color: 'bg-amber-400' },
                            { label: 'Mood', key: 'mood' as const, max: 5, color: 'bg-rose-400' },
                        ].map(metric => (
                            <div key={metric.key}>
                                <p className="text-[11px] font-medium text-gray-500 mb-1">{metric.label}</p>
                                <div className="flex items-end gap-[2px] h-16">
                                    {series.map(s => (
                                        <div key={s.date} title={`${s.date}: ${s[metric.key] || '—'}`}
                                            className="flex-1 flex items-end h-full">
                                            <div className={`w-full rounded-t ${s[metric.key] ? metric.color : 'bg-gray-100'}`}
                                                style={{ height: `${s[metric.key] ? (s[metric.key] / metric.max) * 100 : 4}%` }} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {/* Habit-completion heatmap */}
                        <div>
                            <p className="text-[11px] font-medium text-gray-500 mb-1">Habit completion</p>
                            <div className="flex gap-[2px]">
                                {series.map(s => {
                                    const shade = !s.has ? 'bg-gray-100'
                                        : s.habitPct === 0 ? 'bg-emerald-50'
                                            : s.habitPct < 0.5 ? 'bg-emerald-200'
                                                : s.habitPct < 1 ? 'bg-emerald-400' : 'bg-emerald-600';
                                    return <div key={s.date} title={`${s.date}: ${Math.round(s.habitPct * 100)}%`}
                                        className={`flex-1 h-6 rounded ${shade}`} />;
                                })}
                            </div>
                            <div className="flex justify-between text-[9px] text-gray-400 mt-1">
                                <span>{series[0]?.date.slice(5)}</span>
                                <span>{series[series.length - 1]?.date.slice(5)}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
