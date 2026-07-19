import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { ritualApi, IRitual, IWeeklyReview, ITask, ICalendarEvent } from '../services/personalApi';
import { localToday } from '../utils/date';
import { notifyError } from '../utils/notify';

const emptyRitual = (date: string): IRitual => ({
    date,
    morning: { intention: '', priorities: ['', '', ''], done: false },
    evening: { wins: [''], gratitude: '', tomorrow: '', rating: 0, done: false },
});

const RATINGS = ['😩', '😔', '😐', '🙂', '😄'];

export default function RitualsPage() {
    const today = localToday();
    const [ritual, setRitual] = useState<IRitual>(emptyRitual(today));
    const [tasks, setTasks] = useState<ITask[]>([]);
    const [events, setEvents] = useState<ICalendarEvent[]>([]);
    const [weekly, setWeekly] = useState<IWeeklyReview | null>(null);
    const [loading, setLoading] = useState(true);
    const [savingM, setSavingM] = useState(false);
    const [savingE, setSavingE] = useState(false);

    const load = useCallback(async () => {
        try {
            const [day, wk] = await Promise.all([ritualApi.getDay(today), ritualApi.weekly().catch(() => null)]);
            const r = day.ritual || emptyRitual(today);
            // Ensure the morning always shows 3 priority slots for editing.
            const pr = [...(r.morning?.priorities || [])];
            while (pr.length < 3) pr.push('');
            const wins = (r.evening?.wins && r.evening.wins.length) ? [...r.evening.wins, ''] : [''];
            setRitual({ ...emptyRitual(today), ...r, morning: { ...emptyRitual(today).morning, ...r.morning, priorities: pr }, evening: { ...emptyRitual(today).evening, ...r.evening, wins } });
            setTasks(day.context?.tasks || []);
            setEvents(day.context?.events || []);
            if (wk) setWeekly(wk);
        } catch { /* empty state */ }
        finally { setLoading(false); }
    }, [today]);
    useEffect(() => { load(); }, [load]);

    const setPriority = (i: number, v: string) =>
        setRitual(r => ({ ...r, morning: { ...r.morning, priorities: r.morning.priorities.map((p, idx) => idx === i ? v : p) } }));
    const pullTask = (title: string) => {
        setRitual(r => {
            const empty = r.morning.priorities.findIndex(p => !p.trim());
            if (empty === -1) return r; // all 3 filled
            return { ...r, morning: { ...r.morning, priorities: r.morning.priorities.map((p, idx) => idx === empty ? title : p) } };
        });
    };
    const setWin = (i: number, v: string) =>
        setRitual(r => {
            const wins = r.evening.wins.map((w, idx) => idx === i ? v : w);
            // Keep a trailing empty input for adding more.
            if (i === wins.length - 1 && v.trim()) wins.push('');
            return { ...r, evening: { ...r.evening, wins } };
        });

    const saveMorning = async () => {
        setSavingM(true);
        try {
            const priorities = ritual.morning.priorities.map(p => p.trim()).filter(Boolean);
            const saved = await ritualApi.save(today, { morning: { ...ritual.morning, priorities, done: true } });
            if (saved) toast.success('☀️ Morning plan saved — go get it!');
            await load();
        } catch (e) { notifyError(e, 'Could not save morning plan.'); }
        finally { setSavingM(false); }
    };
    const saveEvening = async () => {
        setSavingE(true);
        try {
            const wins = ritual.evening.wins.map(w => w.trim()).filter(Boolean);
            const saved = await ritualApi.save(today, { evening: { ...ritual.evening, wins, done: true } });
            if (saved) toast.success('🌙 Reflection saved — rest well.');
            await load();
        } catch (e) { notifyError(e, 'Could not save reflection.'); }
        finally { setSavingE(false); }
    };

    if (loading) return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading your day…</div>;

    return (
        <div className="space-y-6 pb-8 max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">🌅 Daily Rituals</h1>
                <p className="text-sm text-gray-500 mt-0.5">Plan the morning, reflect at night — {today}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Morning */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100 shadow-sm p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold text-gray-800">☀️ Morning Plan</h2>
                        {ritual.morning.done && <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">✓ set</span>}
                    </div>
                    <input value={ritual.morning.intention} onChange={e => setRitual(r => ({ ...r, morning: { ...r.morning, intention: e.target.value } }))}
                        placeholder="Today's intention — one line…"
                        className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
                    <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1.5">Top 3 priorities</p>
                        <div className="space-y-2">
                            {ritual.morning.priorities.map((p, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                                    <input value={p} onChange={e => setPriority(i, e.target.value)} placeholder={`Priority ${i + 1}`}
                                        className="flex-1 bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Pull from today's tasks/events */}
                    {(tasks.length > 0 || events.length > 0) && (
                        <div>
                            <p className="text-[11px] text-gray-400 mb-1">Tap to add from today:</p>
                            <div className="flex flex-wrap gap-1.5">
                                {tasks.slice(0, 8).map(t => (
                                    <button key={t._id} onClick={() => pullTask(t.title)} className="text-xs bg-white border border-amber-200 rounded-lg px-2 py-1 text-gray-600 hover:bg-amber-100 transition-colors">
                                        ✅ {t.title}
                                    </button>
                                ))}
                                {events.slice(0, 5).map(ev => (
                                    <span key={ev._id} className="text-xs bg-white/60 border border-amber-100 rounded-lg px-2 py-1 text-gray-500">📅 {ev.title}</span>
                                ))}
                            </div>
                        </div>
                    )}
                    <button onClick={saveMorning} disabled={savingM} className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold disabled:opacity-50">
                        {savingM ? 'Saving…' : 'Save morning plan'}
                    </button>
                </div>

                {/* Evening */}
                <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl border border-indigo-100 shadow-sm p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold text-gray-800">🌙 Evening Reflection</h2>
                        {ritual.evening.done && <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">✓ done</span>}
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1.5">Wins today 🎉</p>
                        <div className="space-y-2">
                            {ritual.evening.wins.map((w, i) => (
                                <input key={i} value={w} onChange={e => setWin(i, e.target.value)} placeholder={i === 0 ? 'Biggest win…' : 'Another win…'}
                                    className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                            ))}
                        </div>
                    </div>
                    <input value={ritual.evening.gratitude} onChange={e => setRitual(r => ({ ...r, evening: { ...r.evening, gratitude: e.target.value } }))}
                        placeholder="Grateful for…"
                        className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                    <input value={ritual.evening.tomorrow} onChange={e => setRitual(r => ({ ...r, evening: { ...r.evening, tomorrow: e.target.value } }))}
                        placeholder="One thing to carry into tomorrow…"
                        className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                    <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1.5">How did today feel?</p>
                        <div className="flex gap-2">
                            {RATINGS.map((emoji, idx) => (
                                <button key={idx} onClick={() => setRitual(r => ({ ...r, evening: { ...r.evening, rating: idx + 1 } }))}
                                    className={`text-2xl p-1.5 rounded-xl border-2 transition-all ${ritual.evening.rating === idx + 1 ? 'border-indigo-400 bg-white scale-110' : 'border-transparent hover:bg-white/60'}`}>
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button onClick={saveEvening} disabled={savingE} className="w-full py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50">
                        {savingE ? 'Saving…' : 'Save reflection'}
                    </button>
                </div>
            </div>

            {/* Weekly review */}
            {weekly && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h2 className="text-sm font-bold text-gray-800 mb-4">📅 This Week ({weekly.from.slice(5)} → {weekly.to.slice(5)})</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        {[
                            { label: 'Days logged', value: `${weekly.daysLogged}/7`, color: 'text-violet-600' },
                            { label: 'Mornings planned', value: weekly.morningsPlanned, color: 'text-amber-600' },
                            { label: 'Evenings reflected', value: weekly.eveningsReflected, color: 'text-indigo-600' },
                            { label: 'Avg day rating', value: weekly.avgRating ? `${weekly.avgRating}/5` : '—', color: 'text-rose-600' },
                        ].map(s => (
                            <div key={s.label} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                                <p className="text-[11px] text-gray-500">{s.label}</p>
                                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                            </div>
                        ))}
                    </div>
                    {weekly.wins.length > 0 ? (
                        <div>
                            <p className="text-xs font-semibold text-gray-500 mb-2">Wins this week 🎉</p>
                            <div className="space-y-1.5">
                                {weekly.wins.slice(-12).reverse().map((w, i) => (
                                    <div key={i} className="flex items-start gap-2 text-xs">
                                        <span className="text-gray-400 w-14 flex-shrink-0">{w.date.slice(5)}</span>
                                        <span className="text-gray-700">🎉 {w.win}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs text-gray-400">Log an evening reflection to start collecting your wins.</p>
                    )}
                </div>
            )}
        </div>
    );
}
