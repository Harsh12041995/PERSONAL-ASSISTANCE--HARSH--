// src/components/auth/SignInFormNew.tsx
// Redesigned for Harsh's Personal Command Center
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../services/authService";

// ─── Floating decoration icons for the left panel ────────────────────────────
const FLOAT_ICONS = [
  { emoji: "📝", top: "12%", left: "18%", size: "2.2rem", delay: "0s" },
  { emoji: "✅", top: "28%", left: "68%", size: "2rem", delay: "0.4s" },
  { emoji: "💰", top: "45%", left: "22%", size: "2.4rem", delay: "0.8s" },
  { emoji: "🎯", top: "60%", left: "72%", size: "2rem", delay: "0.2s" },
  { emoji: "💪", top: "74%", left: "35%", size: "1.8rem", delay: "1.0s" },
  { emoji: "🧠", top: "20%", left: "45%", size: "2rem", delay: "0.6s" },
  { emoji: "🎵", top: "84%", left: "62%", size: "1.6rem", delay: "0.9s" },
  { emoji: "📅", top: "52%", left: "52%", size: "1.8rem", delay: "0.3s" },
];

export default function SignInFormNew() {
  const navigate = useNavigate();
  const { login, user: authUser, token, isLoading: authLoading, isInitialized } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({ email: "", password: "", form: "" });

  // Already logged in → go to home
  useEffect(() => {
    if (token && authUser && isInitialized) {
      navigate("/");
    }
  }, [token, authUser, isInitialized, navigate]);

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = () => {
    const errs = { email: "", password: "", form: "" };
    let ok = true;
    if (!email.trim()) {
      errs.email = "Email is required"; ok = false;
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      errs.email = "Invalid email format"; ok = false;
    }
    if (!password) {
      errs.password = "Password is required"; ok = false;
    }
    setErrors(errs);
    return ok;
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setErrors({ email: "", password: "", form: "" });

    try {
      const response = await authService.loginUser({ email: email.trim(), password });
      const { user: userData, token: accessToken, role, permissions } = response;

      const resolvedRole = (
        typeof userData.role === "string"
          ? userData.role
          : userData.role?.name || role?.name || "owner"
      )?.toLowerCase() || "owner";

      login(accessToken, null, resolvedRole, permissions, userData);
      navigate("/");                              // ← home dashboard
    } catch (error: any) {
      setEmail(""); setPassword("");
      let msg = "Something went wrong. Please try again.";
      if (error?.response) {
        const d = error.response.data;
        msg = d?.message || d?.error || d?.errors?.[0]?.message || msg;
      } else if (error?.message) {
        msg = error.message;
      }
      setErrors(prev => ({ ...prev, form: msg }));
    } finally {
      setIsLoading(false);
    }
  };

  // ── Auth initialising spinner ───────────────────────────────────────────────
  if (authLoading || !isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mx-auto text-2xl font-bold text-white shadow-lg shadow-violet-200">H</div>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-500 mx-auto" />
          <p className="text-gray-400 text-sm">Waking up your space…</p>
        </div>
      </div>
    );
  }

  // ── Main Render ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex bg-white overflow-hidden">

      {/* ═══════════════════════════════════════════════════════════════════════
          LEFT PANEL — Violet gradient with floating life icons
      ═══════════════════════════════════════════════════════════════════════ */}
      <div
        className="hidden lg:flex lg:w-[52%] relative overflow-hidden"
        style={{
          background: "linear-gradient(145deg, #4f46e5 0%, #6d28d9 40%, #7c3aed 70%, #8b5cf6 100%)",
        }}
      >
        {/* Background glow orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 70%)" }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[55%] h-[55%] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 70%)" }} />
        <div className="absolute top-[40%] right-[-5%] w-[40%] h-[40%] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(167,139,250,0.3) 0%, transparent 70%)" }} />

        {/* Subtle grid texture */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />

        {/* Floating emoji icons */}
        {FLOAT_ICONS.map((ic, i) => (
          <div
            key={i}
            className="absolute select-none pointer-events-none"
            style={{
              top: ic.top, left: ic.left,
              fontSize: ic.size,
              animation: `floatIcon 4s ease-in-out ${ic.delay} infinite alternate`,
              filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.25))",
            }}
          >
            {ic.emoji}
          </div>
        ))}

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 pb-10 w-full">
          {/* Top brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
              <span className="text-white text-lg font-bold">H</span>
            </div>
            <span className="text-white/90 font-semibold text-base tracking-wide">Harsh's Space</span>
          </div>

          {/* Hero copy */}
          <div>
            <h1 className="text-white font-bold text-4xl xl:text-5xl leading-tight mb-5">
              Your personal<br />
              <span className="text-violet-200">command center</span>
            </h1>
            <p className="text-violet-200 text-lg leading-relaxed mb-8 max-w-[380px]">
              Track tasks, habits, finances, goals, and everything in between — all in one place.
            </p>

            {/* Life area pills */}
            <div className="flex flex-wrap gap-2">
              {["✅ Tasks", "💰 Finance", "💪 Health", "🎯 Goals", "🧠 Knowledge", "📝 Capture"].map(tag => (
                <span key={tag}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold text-white/90"
                  style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.2)" }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Bottom quote */}
          <div className="border-l-2 border-white/30 pl-4">
            <p className="text-white/70 text-sm italic">
              "You don't rise to the level of your goals, you fall to the level of your systems."
            </p>
            <p className="text-white/50 text-xs mt-1">— James Clear</p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          RIGHT PANEL — Login Form
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 sm:px-12 py-8 bg-white">
        <div className="w-full max-w-[400px]">

          {/* Brand mark */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-violet-200 mb-4">
              <span className="text-white text-2xl font-bold">H</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Welcome back, Harsh</h2>
            <p className="text-gray-400 text-sm mt-1 text-center">
              Sign in to your personal command center
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                Email
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); if (errors.email) setErrors(p => ({ ...p, email: "" })); }}
                  placeholder="harsh@personal.app"
                  disabled={isLoading}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm text-gray-800 bg-gray-50 transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 focus:bg-white
                    ${errors.email ? "border-red-400 bg-red-50" : "border-gray-200"}`}
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => { setPassword(e.target.value); if (errors.password) setErrors(p => ({ ...p, password: "" })); }}
                  placeholder="Your password"
                  disabled={isLoading}
                  className={`w-full pl-10 pr-12 py-3 rounded-xl border text-sm text-gray-800 bg-gray-50 transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 focus:bg-white
                    ${errors.password ? "border-red-400 bg-red-50" : "border-gray-200"}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
            </div>

            {/* Error banner */}
            {errors.form && (
              <div className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {errors.form}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl font-semibold text-white text-sm
                bg-gradient-to-r from-violet-600 to-indigo-600
                hover:from-violet-700 hover:to-indigo-700
                disabled:opacity-60 disabled:cursor-not-allowed
                transition-all duration-200 shadow-lg shadow-violet-200/60
                hover:shadow-xl hover:shadow-violet-300/50 hover:scale-[1.01] active:scale-[0.99]"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Signing in…
                </span>
              ) : (
                "Sign in to your space →"
              )}
            </button>
          </form>

          {/* Credential hint */}
          <div className="mt-6 p-3.5 bg-violet-50 border border-violet-100 rounded-xl">
            <p className="text-xs font-semibold text-violet-700 mb-1">Your credentials</p>
            <p className="text-xs text-violet-600 font-mono">harsh@personal.app</p>
            <p className="text-xs text-violet-400 mt-0.5">Password saved locally · Private app</p>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-300 mt-6">
            Harsh's Personal Command Center · Private & Local
          </p>
        </div>
      </div>

      {/* Floating icon keyframe animation */}
      <style>{`
        @keyframes floatIcon {
          0%   { transform: translateY(0px)   rotate(-3deg); opacity: 0.7; }
          100% { transform: translateY(-14px) rotate(3deg);  opacity: 1;   }
        }
      `}</style>
    </div>
  );
}
