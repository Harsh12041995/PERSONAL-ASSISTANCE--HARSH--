import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import {
  statsApi, IDashboardStats, captureApi, ICapture,
  calendarApi, ICalendarEvent, healthApi, IHealthDay,
} from '../../services/personalApi';
import { CAPTURE_TYPES, CaptureType, captureMeta } from '../../constants/capture';
import { localToday } from '../../utils/date';
import { aiIntelligence } from '../../services/aiIntelligence';

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuickStat {
  label: string;
  value: string | number;
  sub: string;
  icon: string;
  color: string;
  bg: string;
  link: string;
}


// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(name: string) {
  const hour = new Date().getHours();
  if (hour < 12) return `Good morning, ${name} ☀️`;
  if (hour < 17) return `Good afternoon, ${name} 🌤️`;
  return `Good evening, ${name} 🌙`;
}

function formatDate() {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime() {
  return new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

// ─── Capture type → color map ─────────────────────────────────────────────────
const CAPTURE_COLOR: Record<string, string> = {
  Idea: 'bg-amber-100 text-amber-700', Task: 'bg-emerald-100 text-emerald-700',
  Article: 'bg-blue-100 text-blue-700', 'Follow-up': 'bg-sky-100 text-sky-700',
  Money: 'bg-green-100 text-green-700', Urgent: 'bg-red-100 text-red-700',
  Journal: 'bg-violet-100 text-violet-700',
};
const relTime = (iso: string) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'Just now'; if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`; return `${Math.floor(m / 1440)}d ago`;
};

const MODULE_SHORTCUTS = [
  { name: 'Quick Capture', emoji: '📝', path: '/capture', desc: 'Dump a thought fast', color: 'from-amber-400 to-orange-400' },
  { name: 'Tasks', emoji: '✅', path: '/personal-tasks', desc: "Today's to-dos", color: 'from-emerald-400 to-teal-400' },
  { name: 'Finance', emoji: '💰', path: '/finance', desc: 'Log an expense', color: 'from-green-400 to-emerald-500' },
  { name: 'Goals', emoji: '🎯', path: '/goals', desc: 'Check progress', color: 'from-pink-400 to-rose-400' },
  { name: 'Knowledge', emoji: '🧠', path: '/knowledge', desc: 'Save a note', color: 'from-indigo-400 to-purple-400' },
  { name: 'Health', emoji: '💪', path: '/health', desc: 'Log today\'s habits', color: 'from-rose-400 to-pink-400' },
  { name: 'Career', emoji: '💼', path: '/career', desc: 'Career updates', color: 'from-orange-400 to-amber-400' },
  { name: 'Blogs', emoji: '🌍', path: '/blogs', desc: 'Stay aware globally', color: 'from-cyan-500 to-blue-500' },
  { name: 'Workflow', emoji: '⚙️', path: '/workflow-manager', desc: 'Run social workflow', color: 'from-emerald-500 to-teal-500' },
  { name: 'AI Chat', emoji: '🤖', path: '/ai-chat', desc: 'Ask your assistant', color: 'from-cyan-400 to-sky-400' },
  { name: 'Personal Agent', emoji: '🧩', path: '/agent', desc: 'Agent that takes action', color: 'from-violet-500 to-indigo-500' },
  { name: 'Calendar', emoji: '📅', path: '/calendar', desc: 'Plan your day', color: 'from-sky-400 to-blue-500' },
];

// Calendar category → tag color (matches Calendar page categories)
const EVENT_TAG_COLOR: Record<string, string> = {
  Work: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  Personal: 'bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300',
  Learning: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  Health: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
};
const DEFAULT_TAG_COLOR = 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';

const todayISO = localToday;
const eventTime = (evt: ICalendarEvent) =>
  evt.allDay
    ? 'All day'
    : new Date(evt.start).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

const MOODS = [
  { emoji: '😄', label: 'Great', color: 'hover:bg-emerald-50 hover:border-emerald-300 dark:hover:bg-emerald-950/40' },
  { emoji: '😊', label: 'Good', color: 'hover:bg-green-50 hover:border-green-300 dark:hover:bg-green-950/40' },
  { emoji: '😐', label: 'Okay', color: 'hover:bg-yellow-50 hover:border-yellow-300 dark:hover:bg-yellow-950/40' },
  { emoji: '😔', label: 'Low', color: 'hover:bg-orange-50 hover:border-orange-300 dark:hover:bg-orange-950/40' },
  { emoji: '😩', label: 'Stressed', color: 'hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-950/40' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function Home() {
  const { user } = useAuth();
  const firstName = user?.first_name || user?.name?.split(' ')[0] || 'User';
  const [time, setTime] = useState(formatTime());
  const [stats, setStats] = useState<IDashboardStats | null>(null);
  const [recentCaptures, setRecentCaptures] = useState<ICapture[]>([]);
  const [captureText, setCaptureText] = useState('');
  const [captureType, setCaptureType] = useState<CaptureType>('Idea');
  const [captureSubmitted, setCaptureSubmitted] = useState(false);
  const [savingCapture, setSavingCapture] = useState(false);
  const [insights, setInsights] = useState<string[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [todayEvents, setTodayEvents] = useState<ICalendarEvent[]>([]);
  const [healthDay, setHealthDay] = useState<Partial<IHealthDay> | null>(null);
  const [savingMood, setSavingMood] = useState(false);

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setTime(formatTime()), 30000);
    return () => clearInterval(t);
  }, []);

  // Load each widget independently — one failure must never blank the others
  // (previously a single Promise.all meant a stats 404 also wiped captures and
  //  left the insights spinner stuck forever).
  const loadData = useCallback(() => {
    statsApi.get()
      .then(setStats)
      .catch(() => { setStats(null); toast.error("Couldn't load your stats."); });

    captureApi.getAll()
      .then(caps => setRecentCaptures(caps.slice(0, 5)))
      .catch(() => setRecentCaptures([]));

    setLoadingInsights(true);
    aiIntelligence.getDashboardInsights()
      .then(res => setInsights(res))
      .catch(() => setInsights([]))
      .finally(() => setLoadingInsights(false));

    // Non-critical extras — load independently so a failure doesn't block stats
    calendarApi.getAll()
      .then((events: ICalendarEvent[]) => {
        const today = todayISO();
        const todays = events
          .filter(e => e.start?.slice(0, 10) === today)
          .sort((a, b) => a.start.localeCompare(b.start));
        setTodayEvents(todays.slice(0, 5));
      })
      .catch(() => setTodayEvents([]));

    healthApi.getDay(todayISO())
      .then((day: IHealthDay) => setHealthDay(day || null))
      .catch(() => setHealthDay(null));
  }, []);
  useEffect(() => { loadData(); }, [loadData]);

  // Build stats cards from real data
  const quickStats: QuickStat[] = [
    { label: 'Tasks Today', value: stats ? `${stats.tasksDone}/${stats.tasksToday}` : '—', sub: 'completed', icon: '✅', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100', link: '/personal-tasks' },
    { label: 'Habit Streak', value: stats ? `${stats.habitStreak}🔥` : '—', sub: stats && stats.habitStreak === 1 ? 'day streak' : 'day streak', icon: '💪', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100', link: '/health' },
    { label: 'Captured Today', value: stats?.capturedToday ?? '—', sub: 'ideas & notes', icon: '📝', color: 'text-violet-600', bg: 'bg-violet-50 border-violet-100', link: '/capture' },
    { label: 'Goals On Track', value: stats ? `${stats.goalsOnTrack}/${stats.goalsTotal}` : '—', sub: 'this month', icon: '🎯', color: 'text-pink-600', bg: 'bg-pink-50 border-pink-100', link: '/goals' },
  ];

  // Quick capture → POST to API
  const handleQuickCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captureText.trim() || savingCapture) return;
    setSavingCapture(true);
    try {
      await captureApi.create({ type: captureType, text: captureText, emoji: captureMeta(captureType).emoji });
      setCaptureSubmitted(true);
      loadData(); // refresh stats
      setTimeout(() => { setCaptureText(''); setCaptureSubmitted(false); }, 2000);
    } catch {
      toast.error("Couldn't save your capture — please try again.");
    } finally {
      setSavingCapture(false);
    }
  };

  // Mood check-in → persists to the same Health record as the Health page
  const handleMoodSelect = async (label: string) => {
    if (savingMood) return;
    const previous = healthDay;
    setSavingMood(true);
    setHealthDay(d => ({ ...(d || {}), mood: label }));
    try {
      await healthApi.saveDay(todayISO(), { ...(previous || {}), date: todayISO(), mood: label });
      toast.success(`Mood logged: ${label}`);
    } catch {
      setHealthDay(previous);
      toast.error("Couldn't log your mood — please try again.");
    } finally {
      setSavingMood(false);
    }
  };

  // Real "today's focus" progress from task stats
  const taskProgress = stats && stats.tasksToday > 0
    ? Math.round((stats.tasksDone / stats.tasksToday) * 100)
    : 0;

  return (
    <div className="space-y-6 pb-8">
      {/* ── Hero Greeting Banner ───────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 p-6 md:p-8 text-white shadow-xl shadow-violet-200 dark:shadow-none">
        {/* Background orbs */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 blur-2xl" />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-indigo-400/20 rounded-full translate-y-1/2 blur-xl" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{getGreeting(firstName)}</h1>
            <p className="text-violet-200 mt-1 text-sm md:text-base">{formatDate()}</p>
            <p className="text-4xl font-bold mt-2 tabular-nums tracking-tight">{time}</p>
          </div>

          {/* Today's real task progress */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 md:min-w-[280px]">
            <p className="text-xs text-violet-200 font-semibold uppercase tracking-wider mb-1">🎯 Today's Progress</p>
            <p className="text-white font-semibold text-sm leading-snug">
              {stats && stats.tasksToday > 0
                ? `${stats.tasksDone} of ${stats.tasksToday} tasks done — ${taskProgress === 100 ? 'all clear! 🎉' : 'keep going!'}`
                : 'No tasks planned yet — add your first one'}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${taskProgress}%` }} />
              </div>
              <span className="text-xs text-violet-200">{taskProgress}%</span>
            </div>
          </div>
        </div>

        {/* Quick stats row */}
        <div className="relative mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickStats.map(stat => (
            <Link key={stat.label} to={stat.link}>
              <div className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl p-3 border border-white/15 transition-all duration-200 hover:scale-[1.02] cursor-pointer">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{stat.icon}</span>
                  <span className="text-xs text-violet-200 font-medium">{stat.label}</span>
                </div>
                <p className="text-xl font-bold text-white">{stat.value}</p>
                <p className="text-[11px] text-violet-300">{stat.sub}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Smart Insights (AI) ───────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-indigo-50/50 to-violet-50/50 rounded-2xl border border-violet-100 p-4 relative overflow-hidden dark:from-indigo-950/30 dark:to-violet-950/30 dark:border-violet-900/50">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <svg className="w-24 h-24 text-violet-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L14.85 8.65L22 9.25L16.5 13.92L18.18 21L12 17.27L5.82 21L7.5 13.92L2 9.25L9.15 8.65L12 2Z" /></svg>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-600 text-[10px] text-white font-bold italic">AI</span>
          <h2 className="text-xs font-bold text-violet-800 uppercase tracking-widest">Smart Insights</h2>
          {loadingInsights && <div className="animate-spin h-3 w-3 border-b-2 border-violet-600 rounded-full" />}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {insights.length > 0 ? insights.slice(0, 3).map((insight, i) => (
            <div key={i} className="flex gap-3 bg-white/60 hover:bg-white/90 p-3 rounded-xl border border-violet-100/50 transition-all cursor-default dark:bg-white/5 dark:hover:bg-white/10 dark:border-violet-900/40">
              <span className="text-lg flex-shrink-0">{['🚀', '💡', '🌟'][i] || '✨'}</span>
              <p className="text-xs text-indigo-900/80 leading-relaxed font-medium dark:text-indigo-200/90">
                {insight.replace(/^[0-9.]\s*/, '')}
              </p>
            </div>
          )) : !loadingInsights && (
            <div className="md:col-span-3 text-center py-2 text-xs text-indigo-400 font-medium">
              Keep progressing to unlock more insights! ✨
            </div>
          )}
        </div>
      </div>

      {/* ── Quick Capture Bar ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm dark:bg-gray-900 dark:border-gray-800 p-4">
        <form onSubmit={handleQuickCapture} className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0 text-lg">{captureMeta(captureType).emoji}</div>
          <input
            type="text"
            value={captureText}
            onChange={e => setCaptureText(e.target.value)}
            placeholder="Capture a thought, idea, task, or anything on your mind..."
            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 transition-all dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:placeholder-gray-500"
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={savingCapture || !captureText.trim()}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex-shrink-0 disabled:opacity-50 ${captureSubmitted
                ? 'bg-emerald-500 text-white'
                : 'bg-violet-600 hover:bg-violet-700 text-white'
                }`}
            >
              {captureSubmitted ? '✓ Saved!' : savingCapture ? 'Saving…' : 'Capture'}
            </button>
          </div>
        </form>
        <div className="flex flex-wrap gap-1.5 mt-3 pl-11">
          {CAPTURE_TYPES.map(t => (
            <button
              key={t.type}
              type="button"
              onClick={() => setCaptureType(t.type)}
              className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${captureType === t.type
                ? 'bg-violet-600 border-violet-600 text-white'
                : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-violet-300'
                }`}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Module Shortcuts ───────────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Access</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {MODULE_SHORTCUTS.map(mod => (
            <Link key={mod.name} to={mod.path}>
              <div className="group bg-white hover:shadow-md rounded-xl border border-gray-100 p-4 dark:bg-gray-900 dark:border-gray-800 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${mod.color} flex items-center justify-center text-xl mb-3 shadow-sm group-hover:scale-110 transition-transform`}>
                  {mod.emoji}
                </div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{mod.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{mod.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Main Content Grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Today's Schedule ────────────────────────────────────────── */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm dark:bg-gray-900 dark:border-gray-800 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-gray-50 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <span className="text-lg">📅</span>
              <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">Today's Schedule</h2>
            </div>
            <Link to="/calendar" className="text-xs text-violet-600 hover:text-violet-700 font-medium">View all →</Link>
          </div>
          <div className="p-4 space-y-3">
            {todayEvents.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <p className="text-2xl mb-1">🗓️</p>
                <p className="text-xs">Nothing scheduled for today.</p>
              </div>
            ) : todayEvents.map(evt => (
              <div key={evt._id} className="flex items-start gap-3 group">
                <div className="text-[11px] font-mono text-gray-400 pt-0.5 w-16 flex-shrink-0">{eventTime(evt)}</div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors">{evt.title}</p>
                  <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mt-0.5 ${EVENT_TAG_COLOR[evt.calendar] || DEFAULT_TAG_COLOR}`}>
                    {evt.calendar || 'Event'}
                  </span>
                </div>
              </div>
            ))}
            <Link to="/calendar" className="block">
              <button className="w-full mt-2 py-2 rounded-xl text-xs font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 dark:bg-violet-500/10 dark:text-violet-300 dark:hover:bg-violet-500/20 transition-colors">
                + Add event
              </button>
            </Link>
          </div>
        </div>

        {/* ── Habit Tracker ───────────────────────────────────────────── */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm dark:bg-gray-900 dark:border-gray-800 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-gray-50 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <span className="text-lg">💪</span>
              <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">Today's Habits</h2>
            </div>
            <Link to="/health" className="text-xs text-violet-600 hover:text-violet-700 font-medium">All habits →</Link>
          </div>

          {/* Progress ring — driven by real habit data from HealthPage */}
          <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-50 dark:border-gray-800">
            <div className="relative w-14 h-14">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="22" fill="none" strokeWidth="6" className="stroke-gray-100 dark:stroke-gray-800" />
                <circle
                  cx="28" cy="28" r="22" fill="none"
                  stroke="#8b5cf6" strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 22}`}
                  strokeDashoffset={`${2 * Math.PI * 22 * (1 - (stats?.habitsDoneToday ?? 0) / 6)}`}
                  className="transition-all duration-500"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-violet-700">
                {stats ? `${stats.habitsDoneToday}/6` : '—'}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{stats?.habitsDoneToday ?? 0}/6 done today</p>
              <p className="text-xs text-gray-400">{stats && stats.habitStreak > 0 ? `${stats.habitStreak}-day streak 🔥` : 'Start a streak! 🔥'}</p>
            </div>
          </div>

          <div className="p-5 flex items-center justify-center">
            <Link to="/health" className="text-sm font-semibold text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 dark:bg-violet-500/10 dark:text-violet-300 dark:hover:bg-violet-500/20 dark:hover:text-violet-200 px-4 py-2 rounded-xl transition-colors">
              💪 Log Today's Habits →
            </Link>
          </div>
        </div>

        {/* ── Recent Captures ─────────────────────────────────────────── */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm dark:bg-gray-900 dark:border-gray-800 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-gray-50 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <span className="text-lg">📝</span>
              <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">Recent Captures</h2>
            </div>
            <Link to="/capture" className="text-xs text-violet-600 hover:text-violet-700 font-medium">All captures →</Link>
          </div>
          <div className="p-4 space-y-2.5">
            {recentCaptures.length === 0 ? (
              <div className="text-center py-6 text-gray-400"><p className="text-2xl mb-1">📝</p><p className="text-xs">No captures yet. Add one above!</p></div>
            ) : recentCaptures.map(cap => (
              <div key={cap._id} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors cursor-pointer group">
                <span className="text-lg flex-shrink-0">{cap.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CAPTURE_COLOR[cap.type] || 'bg-gray-100 text-gray-600'}`}>{cap.type}</span>
                  </div>
                  <p className="text-xs text-gray-700 dark:text-gray-300 leading-snug line-clamp-2 group-hover:text-gray-900 dark:group-hover:text-gray-100">{cap.text}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{relTime(cap.createdAt)}</p>
                </div>
              </div>
            ))}
            <Link to="/capture">
              <button className="w-full mt-1 py-2 rounded-xl text-xs font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 dark:bg-violet-500/10 dark:text-violet-300 dark:hover:bg-violet-500/20 transition-colors">
                + New capture
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Mood Check-in ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm dark:bg-gray-900 dark:border-gray-800 p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">🌟</span>
          <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">How are you feeling today?</h2>
          <span className="ml-auto text-xs text-gray-400">
            {healthDay?.mood ? `Logged: ${healthDay.mood}` : 'Tap to log your mood'}
          </span>
        </div>
        <div className="flex gap-3 flex-wrap">
          {MOODS.map(mood => {
            const selected = healthDay?.mood === mood.label;
            return (
              <button
                key={mood.label}
                onClick={() => handleMoodSelect(mood.label)}
                disabled={savingMood}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 hover:scale-105 disabled:opacity-60 ${
                  selected
                    ? 'border-violet-400 bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-600'
                    : `border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-300 ${mood.color}`
                }`}
              >
                <span className="text-xl">{mood.emoji}</span>
                {mood.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
