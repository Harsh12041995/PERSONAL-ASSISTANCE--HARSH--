import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { statsApi, IDashboardStats, captureApi, ICapture } from '../../services/personalApi';

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
  { name: 'AI Chat', emoji: '🤖', path: '/ai-chat', desc: 'Ask your assistant', color: 'from-cyan-400 to-sky-400' },
];

const UPCOMING_EVENTS = [
  { time: '10:00 AM', title: 'Team standup call', tag: 'Work', tagColor: 'bg-blue-100 text-blue-700' },
  { time: '01:30 PM', title: 'Lunch with Priya', tag: 'Personal', tagColor: 'bg-pink-100 text-pink-700' },
  { time: '04:00 PM', title: 'React course — Chapter 12', tag: 'Learning', tagColor: 'bg-violet-100 text-violet-700' },
  { time: '07:00 PM', title: 'Gym session', tag: 'Health', tagColor: 'bg-emerald-100 text-emerald-700' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function Home() {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] || 'Harsh';
  const [time, setTime] = useState(formatTime());
  const [stats, setStats] = useState<IDashboardStats | null>(null);
  const [recentCaptures, setRecentCaptures] = useState<ICapture[]>([]);
  const [captureText, setCaptureText] = useState('');
  const [captureSubmitted, setCaptureSubmitted] = useState(false);

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setTime(formatTime()), 30000);
    return () => clearInterval(t);
  }, []);

  // Load real stats + recent captures
  const loadData = useCallback(async () => {
    try {
      const [s, caps] = await Promise.all([statsApi.get(), captureApi.getAll()]);
      setStats(s);
      setRecentCaptures(caps.slice(0, 5));
    } catch { /* silently fallback */ }
  }, []);
  useEffect(() => { loadData(); }, [loadData]);

  // Build stats cards from real data
  const quickStats: QuickStat[] = [
    { label: 'Tasks Today', value: stats ? `${stats.tasksDone}/${stats.tasksToday}` : '—', sub: 'completed', icon: '✅', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100', link: '/personal-tasks' },
    { label: 'Habit Streak', value: stats ? `${stats.habitStreak}🔥` : '—', sub: 'done today', icon: '💪', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100', link: '/health' },
    { label: 'Captured Today', value: stats?.capturedToday ?? '—', sub: 'ideas & notes', icon: '📝', color: 'text-violet-600', bg: 'bg-violet-50 border-violet-100', link: '/capture' },
    { label: 'Goals On Track', value: stats ? `${stats.goalsOnTrack}/${stats.goalsTotal}` : '—', sub: 'this month', icon: '🎯', color: 'text-pink-600', bg: 'bg-pink-50 border-pink-100', link: '/goals' },
  ];

  // Quick capture → POST to API
  const handleQuickCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captureText.trim()) return;
    try {
      await captureApi.create({ type: 'Idea', text: captureText, emoji: '💡' });
      setCaptureSubmitted(true);
      loadData(); // refresh stats
      setTimeout(() => { setCaptureText(''); setCaptureSubmitted(false); }, 2000);
    } catch { setCaptureSubmitted(true); setTimeout(() => { setCaptureText(''); setCaptureSubmitted(false); }, 2000); }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* ── Hero Greeting Banner ───────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 p-6 md:p-8 text-white shadow-xl shadow-violet-200">
        {/* Background orbs */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 blur-2xl" />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-indigo-400/20 rounded-full translate-y-1/2 blur-xl" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{getGreeting(firstName)}</h1>
            <p className="text-violet-200 mt-1 text-sm md:text-base">{formatDate()}</p>
            <p className="text-4xl font-bold mt-2 tabular-nums tracking-tight">{time}</p>
          </div>

          {/* Focus of the day */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 md:min-w-[280px]">
            <p className="text-xs text-violet-200 font-semibold uppercase tracking-wider mb-1">🎯 Today's #1 Focus</p>
            <p className="text-white font-semibold text-sm leading-snug">
              Complete the personal assistant app — Phase 1 implementation
            </p>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full w-2/3 bg-white rounded-full" />
              </div>
              <span className="text-xs text-violet-200">67%</span>
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

      {/* ── Quick Capture Bar ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <form onSubmit={handleQuickCapture} className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0 text-lg">📝</div>
          <input
            type="text"
            value={captureText}
            onChange={e => setCaptureText(e.target.value)}
            placeholder="Capture a thought, idea, task, or anything on your mind..."
            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 transition-all"
          />
          <button
            type="submit"
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex-shrink-0 ${captureSubmitted
              ? 'bg-emerald-500 text-white'
              : 'bg-violet-600 hover:bg-violet-700 text-white'
              }`}
          >
            {captureSubmitted ? '✓ Saved!' : 'Capture'}
          </button>
        </form>
      </div>

      {/* ── Module Shortcuts ───────────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Access</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {MODULE_SHORTCUTS.map(mod => (
            <Link key={mod.name} to={mod.path}>
              <div className="group bg-white hover:shadow-md rounded-xl border border-gray-100 p-4 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${mod.color} flex items-center justify-center text-xl mb-3 shadow-sm group-hover:scale-110 transition-transform`}>
                  {mod.emoji}
                </div>
                <p className="text-sm font-semibold text-gray-800">{mod.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{mod.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Main Content Grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Today's Schedule ────────────────────────────────────────── */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <span className="text-lg">📅</span>
              <h2 className="text-sm font-bold text-gray-800">Today's Schedule</h2>
            </div>
            <Link to="/my-calendar" className="text-xs text-violet-600 hover:text-violet-700 font-medium">View all →</Link>
          </div>
          <div className="p-4 space-y-3">
            {UPCOMING_EVENTS.map((evt, i) => (
              <div key={i} className="flex items-start gap-3 group">
                <div className="text-[11px] font-mono text-gray-400 pt-0.5 w-16 flex-shrink-0">{evt.time}</div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800 group-hover:text-violet-700 transition-colors">{evt.title}</p>
                  <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mt-0.5 ${evt.tagColor}`}>
                    {evt.tag}
                  </span>
                </div>
              </div>
            ))}
            <button className="w-full mt-2 py-2 rounded-xl text-xs font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 transition-colors">
              + Add event
            </button>
          </div>
        </div>

        {/* ── Habit Tracker ───────────────────────────────────────────── */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <span className="text-lg">💪</span>
              <h2 className="text-sm font-bold text-gray-800">Today's Habits</h2>
            </div>
            <Link to="/health" className="text-xs text-violet-600 hover:text-violet-700 font-medium">All habits →</Link>
          </div>

          {/* Progress ring — driven by real habit data from HealthPage */}
          <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-50">
            <div className="relative w-14 h-14">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="22" fill="none" stroke="#f3f4f6" strokeWidth="6" />
                <circle
                  cx="28" cy="28" r="22" fill="none"
                  stroke="#8b5cf6" strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 22}`}
                  strokeDashoffset={`${2 * Math.PI * 22 * (1 - (stats?.habitStreak ?? 0) / 6)}`}
                  className="transition-all duration-500"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-violet-700">
                {stats ? `${stats.habitStreak}/6` : '—'}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{stats?.habitStreak ?? 0}/6 done</p>
              <p className="text-xs text-gray-400">Keep it up! 🔥</p>
            </div>
          </div>

          <div className="p-5 flex items-center justify-center">
            <Link to="/health" className="text-sm font-semibold text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 px-4 py-2 rounded-xl transition-colors">
              💪 Log Today's Habits →
            </Link>
          </div>
        </div>

        {/* ── Recent Captures ─────────────────────────────────────────── */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <span className="text-lg">📝</span>
              <h2 className="text-sm font-bold text-gray-800">Recent Captures</h2>
            </div>
            <Link to="/capture" className="text-xs text-violet-600 hover:text-violet-700 font-medium">All captures →</Link>
          </div>
          <div className="p-4 space-y-2.5">
            {recentCaptures.length === 0 ? (
              <div className="text-center py-6 text-gray-400"><p className="text-2xl mb-1">📝</p><p className="text-xs">No captures yet. Add one above!</p></div>
            ) : recentCaptures.map(cap => (
              <div key={cap._id} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group">
                <span className="text-lg flex-shrink-0">{cap.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CAPTURE_COLOR[cap.type] || 'bg-gray-100 text-gray-600'}`}>{cap.type}</span>
                  </div>
                  <p className="text-xs text-gray-700 leading-snug line-clamp-2 group-hover:text-gray-900">{cap.text}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{relTime(cap.createdAt)}</p>
                </div>
              </div>
            ))}
            <Link to="/capture">
              <button className="w-full mt-1 py-2 rounded-xl text-xs font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 transition-colors">
                + New capture
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Mood Check-in ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">🌟</span>
          <h2 className="text-sm font-bold text-gray-800">How are you feeling today?</h2>
          <span className="ml-auto text-xs text-gray-400">Tap to log your mood</span>
        </div>
        <div className="flex gap-3 flex-wrap">
          {[
            { emoji: '😄', label: 'Great', color: 'hover:bg-emerald-50 hover:border-emerald-300' },
            { emoji: '😊', label: 'Good', color: 'hover:bg-green-50 hover:border-green-300' },
            { emoji: '😐', label: 'Okay', color: 'hover:bg-yellow-50 hover:border-yellow-300' },
            { emoji: '😔', label: 'Low', color: 'hover:bg-orange-50 hover:border-orange-300' },
            { emoji: '😩', label: 'Stressed', color: 'hover:bg-red-50 hover:border-red-300' },
          ].map(mood => (
            <button
              key={mood.label}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 transition-all duration-200 hover:scale-105 ${mood.color}`}
            >
              <span className="text-xl">{mood.emoji}</span>
              {mood.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Life Areas Overview ────────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Life Areas Status</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { area: 'Career', emoji: '💼', score: 72, color: 'bg-orange-500', link: '/career' },
            { area: 'Health', emoji: '💪', score: 60, color: 'bg-rose-500', link: '/health' },
            { area: 'Finance', emoji: '💰', score: 55, color: 'bg-green-500', link: '/finance' },
            { area: 'Learning', emoji: '🧠', score: 80, color: 'bg-indigo-500', link: '/knowledge' },
            { area: 'Social', emoji: '📱', score: 65, color: 'bg-fuchsia-500', link: '/social' },
            { area: 'Goals', emoji: '🎯', score: 70, color: 'bg-pink-500', link: '/goals' },
          ].map(area => (
            <Link key={area.area} to={area.link}>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer group">
                <div className="text-2xl mb-2">{area.emoji}</div>
                <p className="text-xs font-semibold text-gray-700 mb-2">{area.area}</p>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${area.color} rounded-full transition-all duration-700`}
                    style={{ width: `${area.score}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">{area.score}% score</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
