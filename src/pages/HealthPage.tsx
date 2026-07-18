import { useState, useEffect, useCallback, useRef } from 'react';
import { healthApi, IHealthDay } from '../services/personalApi';
import { localDate } from '../utils/date';

const HABITS = [
    { name: 'Morning workout', emoji: '💪' },
    { name: 'Drink 8 glasses water', emoji: '💧' },
    { name: 'Read 30 mins', emoji: '📚' },
    { name: 'Meditate 10 mins', emoji: '🧘' },
    { name: 'Sleep by 11 PM', emoji: '😴' },
    { name: 'Journal entry', emoji: '📓' },
];
const MOODS = [
    { emoji: '😄', label: 'Great' }, { emoji: '😊', label: 'Good' },
    { emoji: '😐', label: 'Okay' }, { emoji: '😔', label: 'Low' },
    { emoji: '😩', label: 'Stressed' },
];
const toDate = (d = new Date()) => localDate(d);
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
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const load = useCallback(async () => {
        try {
            const data = await healthApi.getDay(toDate());
            setDay(data || empty());
        } catch { setError('Could not load health data.'); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load]);

    // Auto-save with debounce
    const persist = (updated: IHealthDay) => {
        setDay(updated);
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(async () => {
            setSaving(true);
            try { await healthApi.saveDay(updated.date, updated); }
            catch { setError('Auto-save failed.'); }
            finally { setSaving(false); }
        }, 800);
    };

    const toggleHabit = (name: string) => {
        persist({ ...day, habits: { ...day.habits, [name]: !day.habits[name] } });
    };
    const setMood = (m: string) => persist({ ...day, mood: m });
    const setMoodNote = (n: string) => persist({ ...day, moodNote: n });
    const setSleep = (k: 'bedtime' | 'wakeup', v: string) => persist({ ...day, sleep: { ...day.sleep, [k]: v } });
    const setEnergy = (e: number) => persist({ ...day, energy: e });

    const doneCount = HABITS.filter(h => day.habits[h.name]).length;
    const hrs = sleepHrs(day.sleep.bedtime, day.sleep.wakeup);

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
                    { label: "Today's Habits", value: `${doneCount}/${HABITS.length}`, sub: 'completed', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
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
                <h2 className="text-sm font-bold text-gray-800 mb-4">Today's Habits — {toDate()}</h2>
                {loading ? <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-500" /></div> : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {HABITS.map(habit => {
                            const done = !!day.habits[habit.name];
                            return (
                                <button key={habit.name} onClick={() => toggleHabit(habit.name)}
                                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left
                                        ${done ? 'border-violet-400 bg-violet-50' : 'border-gray-200 hover:border-violet-200 bg-white'}`}>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
                                        ${done ? 'bg-violet-500 border-violet-500' : 'border-gray-300'}`}>
                                        {done && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                    <span className="text-sm text-gray-700">{habit.emoji} {habit.name}</span>
                                </button>
                            );
                        })}
                    </div>
                )}
                <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full transition-all duration-500" style={{ width: `${(doneCount / HABITS.length) * 100}%` }} />
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
        </div>
    );
}
