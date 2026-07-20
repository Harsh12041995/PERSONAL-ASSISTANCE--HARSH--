import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../services/authService";

const LION_VIDEO = "/videos/lion-cosmic.mp4";
const LION_POSTER = "/images/login/lion-poster.jpg";

export default function SignInFormNew() {
  const navigate = useNavigate();
  const { login, user: authUser, token, isLoading: authLoading, isInitialized } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [focus, setFocus] = useState<"email" | "pw" | null>(null);
  const [sign, setSign] = useState<"idle" | "loading" | "done">("idle");
  const [errors, setErrors] = useState({ email: "", password: "", form: "" });
  const [videoReady, setVideoReady] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (token && authUser && isInitialized) navigate("/");
  }, [token, authUser, isInitialized, navigate]);

  // Full-page parallax: the cosmic scene drifts with the cursor.
  useEffect(() => {
    const root = rootRef.current;
    const video = videoRef.current;
    if (!root || !video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    const onMove = (e: PointerEvent) => {
      tx = ((e.clientX / window.innerWidth) - 0.5) * -24;
      ty = ((e.clientY / window.innerHeight) - 0.5) * -16;
    };
    const loop = () => {
      raf = requestAnimationFrame(loop);
      cx += (tx - cx) * 0.05; cy += (ty - cy) * 0.05;
      video.style.transform = `scale(1.16) translate(${cx.toFixed(2)}px, ${cy.toFixed(2)}px)`;
    };
    root.addEventListener("pointermove", onMove);
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); root.removeEventListener("pointermove", onMove); };
  }, []);

  const onCardMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    const rx = ((e.clientY - r.top) / r.height - 0.5) * -4;
    const ry = ((e.clientX - r.left) / r.width - 0.5) * 5;
    cardRef.current.style.transform = `perspective(1200px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
  };
  const onCardLeave = () => { if (cardRef.current) cardRef.current.style.transform = "perspective(1200px) rotateX(0deg) rotateY(0deg)"; };

  const validate = () => {
    const next = { email: "", password: "", form: "" };
    let ok = true;
    if (!email.trim()) { next.email = "Email is required"; ok = false; }
    else if (!/^\S+@\S+\.\S+$/.test(email)) { next.email = "Invalid email format"; ok = false; }
    if (!password) { next.password = "Password is required"; ok = false; }
    setErrors(next);
    return ok;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sign !== "idle") return;
    if (!validate()) return;
    setSign("loading");
    setErrors({ email: "", password: "", form: "" });
    try {
      const response = await authService.loginUser({ email: email.trim(), password });
      const { user: userData, token: accessToken, role, permissions } = response;
      const resolvedRole = (typeof userData.role === "string" ? userData.role : userData.role?.name || role?.name || "owner")?.toLowerCase() || "owner";
      setSign("done");
      login(accessToken, null, resolvedRole, permissions, userData);
      setTimeout(() => navigate("/"), 500);
    } catch (error: unknown) {
      setPassword("");
      let message = "Something went wrong. Please try again.";
      const err = error as { response?: { data?: { message?: string; error?: string; errors?: { message?: string }[] } }; message?: string };
      if (err?.response) { const d = err.response.data; message = d?.message || d?.error || d?.errors?.[0]?.message || message; }
      else if (err?.message) message = err.message;
      setErrors((p) => ({ ...p, form: message }));
      setSign("idle");
    }
  };

  const social = (name: string) =>
    setErrors((p) => ({ ...p, form: `${name} sign-in isn't configured yet — use email & password.` }));

  if (authLoading || !isInitialized) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#04030c" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ margin: "0 auto", height: 24, width: 24, borderRadius: "50%", border: "2px solid rgba(124,108,245,0.3)", borderTopColor: "#7c6cf5", animation: "li-spin 0.8s linear infinite" }} />
          <p style={{ marginTop: 10, fontSize: 13, color: "#a3aabc", fontFamily: FONT }}>Loading your workspace…</p>
        </div>
      </div>
    );
  }

  const fieldWrap = (active: boolean, accent: string): React.CSSProperties => ({
    position: "relative", marginTop: 5, height: 52, borderRadius: 13, background: "rgba(255,255,255,0.55)",
    border: `1.5px solid ${active ? accent : "rgba(255,255,255,0.7)"}`,
    boxShadow: active ? `0 0 0 4px ${accent}22, 0 10px 26px -10px ${accent}72` : "inset 0 1px 2px rgba(0,0,0,0.04)",
    transition: "border-color 0.3s ease, box-shadow 0.3s ease", overflow: "hidden",
  });

  return (
    <div ref={rootRef} style={{ position: "relative", width: "100vw", minHeight: "100vh", overflow: "hidden", background: `#04030c url(${LION_POSTER}) center/cover no-repeat`, fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{KEYFRAMES}</style>

      {/* Full-page cosmic-lion video — fades in over the poster once buffered */}
      <video
        ref={videoRef}
        src={LION_VIDEO}
        poster={LION_POSTER}
        autoPlay loop muted playsInline preload="auto"
        onCanPlay={() => setVideoReady(true)}
        onPlaying={() => setVideoReady(true)}
        style={{ position: "fixed", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.16)", willChange: "transform", zIndex: 0, opacity: videoReady ? 1 : 0, transition: "opacity 1.1s ease" }}
      />

      {/* Depth: vignette + gentle darkening + filmic grain */}
      <div style={{ position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none", background: "radial-gradient(125% 95% at 50% 42%, rgba(4,3,12,0) 30%, rgba(4,3,12,0.5) 74%, rgba(4,3,12,0.88) 100%)" }} />
      <div style={{ position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none", background: "linear-gradient(180deg, rgba(4,3,12,0.5) 0%, rgba(4,3,12,0) 20%, rgba(4,3,12,0) 74%, rgba(4,3,12,0.55) 100%)" }} />
      <div style={{ position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none", opacity: 0.06, mixBlendMode: "overlay", backgroundImage: GRAIN, backgroundSize: "200px 200px" }} />

      {/* Drifting light orbs */}
      <div style={{ position: "fixed", left: "12%", top: "22%", width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.35), transparent 70%)", filter: "blur(20px)", zIndex: 1, pointerEvents: "none", animation: "li-orb1 18s ease-in-out infinite" }} />
      <div style={{ position: "fixed", right: "14%", top: "58%", width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.28), transparent 70%)", filter: "blur(26px)", zIndex: 1, pointerEvents: "none", animation: "li-orb2 24s ease-in-out infinite" }} />
      <div style={{ position: "fixed", left: "46%", bottom: "8%", width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(192,132,252,0.25), transparent 70%)", filter: "blur(22px)", zIndex: 1, pointerEvents: "none", animation: "li-orb1 21s ease-in-out 2s infinite" }} />

      {/* Brand mark */}
      <div style={{ position: "fixed", top: 28, left: 32, zIndex: 3, display: "flex", alignItems: "center", gap: 13, animation: "li-fadeDown 0.9s ease both" }}>
        <div style={{ width: 44, height: 44, borderRadius: 13, background: "linear-gradient(145deg,#1b1633,#0e0a22)", border: "1px solid rgba(150,130,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center", color: "#efecff", fontWeight: 800, fontSize: 15, letterSpacing: 0.5, boxShadow: "0 0 22px rgba(124,92,246,0.4)", animation: "li-coinFloat 5s ease-in-out infinite" }}>PA</div>
        <span style={{ color: "#eceafb", fontSize: 16, fontWeight: 600, textShadow: "0 2px 12px rgba(0,0,0,0.7)" }}>Personal Assistance</span>
      </div>

      {/* Card + aurora glow */}
      <div style={{ position: "relative", zIndex: 2, padding: "88px 20px 44px", width: "100%", display: "flex", justifyContent: "center" }} onMouseMove={onCardMove} onMouseLeave={onCardLeave}>
        <div style={{ position: "relative", width: 430, maxWidth: "100%", animation: "li-cardIn 0.9s cubic-bezier(0.22,1,0.36,1) both" }}>
          {/* rotating aurora ring behind the glass */}
          <div style={{ position: "absolute", inset: -2, borderRadius: 30, padding: 2, background: "conic-gradient(from 0deg, #0fce8e, #2f9df5, #8b5cf6, #c084fc, #0fce8e)", filter: "blur(14px)", opacity: 0.6, animation: "li-spin 12s linear infinite", pointerEvents: "none" }} />
          <div ref={cardRef} style={{ position: "relative", borderRadius: 28, background: "rgba(14,12,26,0.42)", backdropFilter: "blur(30px) saturate(150%)", WebkitBackdropFilter: "blur(30px) saturate(150%)", border: "1px solid rgba(255,255,255,0.28)", boxShadow: "0 40px 100px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.35)", padding: "34px clamp(22px,4vw,40px) 28px", transition: "transform 0.2s ease", willChange: "transform" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: 60, height: 60, borderRadius: 17, background: "linear-gradient(135deg,#0fce8e,#2f9df5)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 22, boxShadow: "0 16px 34px rgba(24,165,190,0.55)", animation: "li-coinFloat 5.5s ease-in-out infinite" }}>PA</div>
              <h2 style={{ margin: "16px 0 0", fontSize: 28, fontWeight: 800, letterSpacing: "-0.5px", lineHeight: 1.2, textShadow: "0 2px 20px rgba(0,0,0,0.45)", background: "linear-gradient(90deg,#ffffff,#d9d2ff,#ffffff)", backgroundSize: "200% 100%", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", animation: "li-shimmer 7s linear infinite" }}>Welcome back</h2>
              <p style={{ margin: "5px 0 0", fontSize: 14.5, color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>Sign in to continue where you left off</p>
            </div>

            <form onSubmit={handleLogin}>
              <div style={{ marginTop: 26 }}>
                <label htmlFor="email" style={labelStyle}>EMAIL</label>
                <div style={fieldWrap(focus === "email", "#6ea3f7")}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#5b6478" strokeWidth={1.8} strokeLinecap="round" style={iconStyle}><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3.5 7l8.5 6 8.5-6" /></svg>
                  <input id="email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors((p) => ({ ...p, email: "" })); }} onFocus={() => setFocus("email")} onBlur={() => setFocus(null)} placeholder="your@email.com" autoComplete="email" style={inputStyle} />
                  <div style={{ position: "absolute", left: 0, bottom: 0, height: 2.5, background: "linear-gradient(90deg,#0fce8e,#2f9df5,#8b5cf6)", width: focus === "email" ? "100%" : "0%", transition: "width 0.45s cubic-bezier(0.22,1,0.36,1)" }} />
                </div>
                {errors.email && <p style={errStyle}>{errors.email}</p>}
              </div>

              <div style={{ marginTop: 16 }}>
                <label htmlFor="password" style={labelStyle}>PASSWORD</label>
                <div style={fieldWrap(focus === "pw", "#8f7cf5")}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#5b6478" strokeWidth={1.8} strokeLinecap="round" style={iconStyle}><rect x="4.5" y="10.5" width="15" height="10" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></svg>
                  <input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors((p) => ({ ...p, password: "" })); }} onFocus={() => setFocus("pw")} onBlur={() => setFocus(null)} placeholder="Enter your password" autoComplete="current-password" style={{ ...inputStyle, padding: "0 70px 0 46px" }} />
                  <button onClick={() => setShowPassword((s) => !s)} type="button" style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", border: "none", background: "none", color: "#3c4257", fontSize: 13.5, fontWeight: 600, cursor: "pointer", padding: "4px 6px", borderRadius: 6 }}>{showPassword ? "Hide" : "Show"}</button>
                  <div style={{ position: "absolute", left: 0, bottom: 0, height: 2.5, background: "linear-gradient(90deg,#0fce8e,#2f9df5,#8b5cf6)", width: focus === "pw" ? "100%" : "0%", transition: "width 0.45s cubic-bezier(0.22,1,0.36,1)" }} />
                </div>
                {errors.password && <p style={errStyle}>{errors.password}</p>}
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 15 }}>
                <div onClick={() => setRemember((r) => !r)} style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer", userSelect: "none" }}>
                  <div style={{ width: 19, height: 19, borderRadius: 6, border: `1.5px solid ${remember ? "transparent" : "rgba(255,255,255,0.6)"}`, background: remember ? "linear-gradient(135deg,#0fce8e,#2f9df5)" : "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.25s ease" }}>
                    {remember && <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#fff" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.4 4.4L19 7.5" /></svg>}
                  </div>
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.9)", fontWeight: 500 }}>Remember me</span>
                </div>
                <a href="#" onClick={(e) => e.preventDefault()} style={{ fontSize: 14, fontWeight: 600, color: "#7dd3fc", textDecoration: "none" }}>Forgot password?</a>
              </div>

              {errors.form && <div style={{ marginTop: 12, borderRadius: 12, border: "1px solid rgba(255,120,120,0.5)", background: "rgba(180,40,40,0.35)", padding: "9px 14px", fontSize: 13, color: "#ffe3e3" }}>{errors.form}</div>}

              <button type="submit" disabled={sign !== "idle"} style={{ position: "relative", width: "100%", height: 54, marginTop: 22, border: "none", borderRadius: 15, background: "linear-gradient(90deg,#0ec98c 0%,#17b7ab 40%,#2f9df5 100%)", color: "#fff", fontSize: 16, fontWeight: 700, cursor: sign === "idle" ? "pointer" : "default", overflow: "hidden", boxShadow: "0 16px 38px rgba(23,160,190,0.55)", opacity: sign === "loading" ? 0.92 : 1 }}>
                <span style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 70, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent)", animation: "li-sweep 3.4s ease-in-out infinite", pointerEvents: "none" }} />
                {sign === "idle" && <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10 }}>Sign in <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h15M13 6l6 6-6 6" /></svg></span>}
                {sign === "loading" && <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 11 }}><span style={{ width: 19, height: 19, borderRadius: "50%", border: "2.5px solid rgba(255,255,255,0.35)", borderTopColor: "#fff", display: "inline-block", animation: "li-spin 0.8s linear infinite" }} />Authenticating…</span>}
                {sign === "done" && <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10 }}><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.4 4.4L19 7.5" /></svg>Welcome back</span>}
              </button>
            </form>

            <p style={{ margin: "16px 0 0", textAlign: "center", fontSize: 14, color: "rgba(255,255,255,0.78)", fontWeight: 500 }}>Don&rsquo;t have an account? <Link to="/signup" style={{ fontWeight: 700, color: "#7dd3fc", textDecoration: "none" }}>Create one</Link></p>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 20 }}>
              <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.4))" }} />
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 500, whiteSpace: "nowrap" }}>or continue with</span>
              <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg,rgba(255,255,255,0.4),transparent)" }} />
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: 14, marginTop: 18 }}>
              <button type="button" aria-label="Continue with Google" onClick={() => social("Google")} style={socialBtn}>
                <svg viewBox="0 0 24 24" width="22" height="22"><path fill="#EA4335" d="M12 5.04c1.7 0 3.23.59 4.43 1.74l3.29-3.29C17.72 1.63 15.1.55 12 .55 7.4.55 3.4 3.2 1.46 7.06l3.85 2.98C6.23 7.25 8.88 5.04 12 5.04z" /><path fill="#4285F4" d="M23.49 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.46c-.28 1.49-1.13 2.76-2.4 3.61l3.72 2.89c2.17-2.01 3.71-4.97 3.71-8.69z" /><path fill="#FBBC05" d="M5.29 14.26c-.23-.7-.36-1.44-.36-2.21s.13-1.51.36-2.21L1.44 6.86C.65 8.41.22 10.16.22 12.05s.43 3.63 1.22 5.19l3.85-2.98z" /><path fill="#34A853" d="M12 23.55c3.1 0 5.7-1.02 7.6-2.77l-3.72-2.89c-1.03.69-2.36 1.1-3.88 1.1-3.12 0-5.77-2.21-6.71-5.01l-3.85 2.98C3.4 20.9 7.4 23.55 12 23.55z" /></svg>
              </button>
              <button type="button" aria-label="Continue with Apple" onClick={() => social("Apple")} style={socialBtn}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="#fff"><path d="M17.06 20.28c-.98.95-2.06.8-3.09.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.8 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.75 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.86 7.28-.57 1.5-1.68 2.98-2.9 3.93zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" /></svg>
              </button>
              <button type="button" aria-label="Continue with Microsoft" onClick={() => social("Microsoft")} style={socialBtn}>
                <svg viewBox="0 0 24 24" width="20" height="20"><rect x="2" y="2" width="9.5" height="9.5" fill="#F25022" /><rect x="12.5" y="2" width="9.5" height="9.5" fill="#7FBA00" /><rect x="2" y="12.5" width="9.5" height="9.5" fill="#00A4EF" /><rect x="12.5" y="12.5" width="9.5" height="9.5" fill="#FFB900" /></svg>
              </button>
              <button type="button" aria-label="Continue with GitHub" onClick={() => social("GitHub")} style={socialBtn}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="#fff"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.75 2.69 1.25 3.35.95.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18.92-.26 1.91-.38 2.9-.39.98.01 1.98.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.26 5.67.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .31.21.68.8.56A10.52 10.52 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" /></svg>
              </button>
            </div>

            <p style={{ margin: "20px 0 0", textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 500, lineHeight: 1.6 }}>By continuing, you agree to our <a href="#" onClick={(e) => e.preventDefault()} style={{ color: "#7dd3fc", fontWeight: 600, textDecoration: "none" }}>Terms of Service</a> and <a href="#" onClick={(e) => e.preventDefault()} style={{ color: "#7dd3fc", fontWeight: 600, textDecoration: "none" }}>Privacy Policy</a></p>
          </div>

          {/* poetic tagline under the card */}
          <p style={{ margin: "18px auto 0", maxWidth: 380, textAlign: "center", fontSize: 12.5, fontStyle: "italic", color: "rgba(255,255,255,0.62)", lineHeight: 1.6, textShadow: "0 2px 10px rgba(0,0,0,0.6)", animation: "li-fadeUp 1s ease 0.4s both" }}>
            &ldquo;You do not rise to the level of your goals. You fall to the level of your systems.&rdquo; — James Clear
          </p>
        </div>
      </div>
    </div>
  );
}

const FONT = "'Manrope', system-ui, -apple-system, sans-serif";
const labelStyle: React.CSSProperties = { display: "block", fontSize: 11.5, fontWeight: 700, letterSpacing: 1.3, color: "rgba(255,255,255,0.85)" };
const iconStyle: React.CSSProperties = { position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)" };
const inputStyle: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", border: "none", outline: "none", background: "transparent", padding: "0 16px 0 46px", fontSize: 15, color: "#0f1424", fontWeight: 500, fontFamily: FONT };
const errStyle: React.CSSProperties = { margin: "5px 0 0", fontSize: 12, color: "#ffb4b4" };
const socialBtn: React.CSSProperties = {
  width: 52, height: 52, borderRadius: "50%",
  border: "1px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.14)", backdropFilter: "blur(8px)",
  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
  boxShadow: "0 6px 18px rgba(0,0,0,0.25)", transition: "transform 0.2s ease, background 0.2s ease",
};

// tiny SVG noise for filmic grain
const GRAIN = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const KEYFRAMES = `
@keyframes li-spin { to { transform: rotate(360deg); } }
@keyframes li-coinFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
@keyframes li-cardIn { from { opacity: 0; transform: translateY(24px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes li-fadeDown { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
@keyframes li-fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
@keyframes li-shimmer { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
@keyframes li-sweep { 0% { transform: translateX(-120%) skewX(-18deg); } 55%,100% { transform: translateX(560%) skewX(-18deg); } }
@keyframes li-orb1 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(24px,-30px); } }
@keyframes li-orb2 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-30px,22px); } }
`;
