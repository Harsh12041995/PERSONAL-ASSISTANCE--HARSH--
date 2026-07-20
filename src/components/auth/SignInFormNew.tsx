import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../services/authService";

const LION = "/images/login/lion-left.png";

// Feature chips shown on the left panel.
const CHIPS: { label: string; icon: React.ReactNode }[] = [
  {
    label: "Tasks",
    icon: (
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#4ade80" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" style={{ animation: "li-checkPulse 3.4s ease-in-out infinite" }}>
        <circle cx="12" cy="12" r="9.5" /><path d="M8.5 12.2l2.4 2.4 4.6-5" />
      </svg>
    ),
  },
  {
    label: "Finance",
    icon: (
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#fbbf24" strokeWidth={2} strokeLinecap="round" style={{ animation: "li-coinFloat 3s ease-in-out infinite" }}>
        <circle cx="12" cy="12" r="9.5" /><path d="M12 6.5v11M9.4 15.2c.5.9 1.5 1.4 2.6 1.4 1.7 0 2.9-.9 2.9-2.3 0-2.9-5.5-1.6-5.5-4.5 0-1.3 1.1-2.2 2.6-2.2 1 0 1.9.4 2.4 1.2" />
      </svg>
    ),
  },
  {
    label: "Health",
    icon: (
      <svg viewBox="0 0 24 24" width="17" height="17" fill="#f472b6" style={{ animation: "li-heartbeat 2.8s ease-in-out infinite" }}>
        <path d="M12 21s-8.2-5.4-10-10c-1.1-2.9.6-6.2 3.7-6.9 2-.4 4.1.4 5.3 2.1 1.2-1.7 3.3-2.5 5.3-2.1 3.1.7 4.8 4 3.7 6.9-1.8 4.6-8 10-8 10z" />
      </svg>
    ),
  },
  {
    label: "Goals",
    icon: (
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#818cf8" strokeWidth={2}>
        <circle cx="12" cy="12" r="9.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1.2" fill="#818cf8" />
      </svg>
    ),
  },
  {
    label: "Knowledge",
    icon: (
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#7dd3fc" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ animation: "li-pageTilt 4.5s ease-in-out infinite", transformOrigin: "50% 100%" }}>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15.5H6.5A2.5 2.5 0 0 0 4 21z" /><path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20" /><path d="M12 3v13" />
      </svg>
    ),
  },
  {
    label: "Capture",
    icon: (
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#a5b4fc" strokeWidth={2} strokeLinejoin="round">
        <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7H7l1.6-2.4A1.5 1.5 0 0 1 9.9 4h4.2a1.5 1.5 0 0 1 1.3.6L17 7h2.5A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z" /><circle cx="12" cy="13" r="3.4" />
      </svg>
    ),
  },
];

interface Star { x: number; y: number; r: number; p: number; s: number; hue: number; z: number }
interface Node { x: number; y: number; vx: number; vy: number }

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

  // Canvas + parallax refs.
  const panelRef = useRef<HTMLDivElement>(null);
  const lionRef = useRef<HTMLDivElement>(null);
  const eyeRef = useRef<HTMLDivElement>(null);
  const pupilRef = useRef<HTMLDivElement>(null);
  const maneRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (token && authUser && isInitialized) navigate("/");
  }, [token, authUser, isInitialized, navigate]);

  // ── Ambient scene: starfield + constellation + lion parallax/eye tracking ──
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cv = canvasRef.current;
    const panel = panelRef.current;
    if (!cv || !panel) return;

    let w = 0, h = 0, dpr = 1;
    let stars: Star[] = [];
    let nodes: Node[] = [];
    let mx = -9999, my = -9999, px = 0, py = 0;
    let raf = 0;

    const initCanvas = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = panel.clientWidth; h = panel.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      stars = Array.from({ length: 120 }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: 0.4 + Math.random() * 1.1, p: Math.random() * Math.PI * 2,
        s: 0.02 + Math.random() * 0.06, hue: Math.random() < 0.7 ? 250 : 200,
        z: 0.25 + Math.random() * 0.75,
      }));
      nodes = Array.from({ length: 24 }, () => ({
        x: w * (0.3 + Math.random() * 0.68), y: h * (0.08 + Math.random() * 0.85),
        vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.18,
      }));
    };

    const headPos = () => {
      const lion = lionRef.current;
      if (!lion) return { x: w * 0.8, y: h * 0.35, r: 300 };
      const lr = lion.getBoundingClientRect(), pr = panel.getBoundingClientRect();
      return { x: lr.left - pr.left + lr.width * 0.743, y: lr.top - pr.top + lr.height * 0.374, r: lr.height * 0.3 };
    };

    const draw = (t: number) => {
      const x = cv.getContext("2d");
      if (!x) return;
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      x.clearRect(0, 0, w, h);
      const time = t * 0.001;
      for (const s of stars) {
        s.x -= s.s * 0.4; s.y -= s.s * 0.2;
        if (s.x < -2) s.x = w + 2;
        if (s.y < -2) s.y = h + 2;
        const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * 1.4 + s.p));
        x.globalAlpha = tw * 0.8;
        x.fillStyle = s.hue === 250 ? "#b9a8ff" : "#8fd2ff";
        x.beginPath(); x.arc(s.x - px * s.z * 2.2, s.y - py * s.z * 2.2, s.r * (0.6 + s.z * 0.6), 0, 6.284); x.fill();
      }
      x.globalAlpha = 1;
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
        const d = Math.hypot(n.x - mx, n.y - my);
        if (d < 110 && d > 0.1) { const f = ((110 - d) / 110) * 0.9; n.x += ((n.x - mx) / d) * f; n.y += ((n.y - my) / d) * f; }
      }
      x.lineWidth = 0.7;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 140) { x.globalAlpha = (1 - d / 140) * 0.35; x.strokeStyle = "#8b7cf6"; x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); x.stroke(); }
        }
        const dm = Math.hypot(a.x - mx, a.y - my);
        if (dm < 160) { x.globalAlpha = (1 - dm / 160) * 0.45; x.strokeStyle = "#7dd3fc"; x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(mx, my); x.stroke(); }
        x.globalAlpha = 0.85; x.fillStyle = "#c4b5fd"; x.beginPath(); x.arc(a.x, a.y, 1.6, 0, 6.284); x.fill();
      }
      x.globalAlpha = 1;
    };

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      const head = headPos();
      const dist = Math.hypot(mx - head.x, my - head.y);
      if (lionRef.current) {
        const tx = mx > -999 ? (mx / w - 0.6) * 18 : 0;
        const ty = my > -999 ? (my / h - 0.4) * 12 : 0;
        px += (tx - px) * 0.045; py += (ty - py) * 0.045;
        const swayX = Math.sin(t * 0.00042) * 6, swayY = Math.sin(t * 0.00058 + 1.3) * 4;
        const rotY = px * 0.5 + Math.sin(t * 0.00031) * 2.6;
        const rotX = -py * 0.4 + Math.cos(t * 0.00037) * 1.6;
        lionRef.current.style.transform = `translate3d(${(px + swayX).toFixed(2)}px,${(py + swayY).toFixed(2)}px,0) rotateY(${rotY.toFixed(2)}deg) rotateX(${rotX.toFixed(2)}deg)`;
      }
      if (eyeRef.current) {
        const near = Math.max(0, 1 - dist / (head.r * 2.2));
        eyeRef.current.style.opacity = Math.min(1, 0.35 + near * 0.5).toFixed(2);
        const eye = eyeRef.current.getBoundingClientRect(), pr = panel.getBoundingClientRect();
        const ex = eye.left - pr.left + eye.width / 2, ey = eye.top - pr.top + eye.height / 2;
        if (pupilRef.current) {
          const vx = mx - ex, vy = my - ey, vd = Math.hypot(vx, vy) || 1, reach = Math.min(9, vd * 0.06);
          pupilRef.current.style.transform = `translate(${((vx / vd) * reach).toFixed(1)}px,${((vy / vd) * reach).toFixed(1)}px)`;
        }
      }
      if (maneRef.current) maneRef.current.style.opacity = (0.2 + Math.max(0, 1 - dist / (head.r * 2)) * 0.3).toFixed(2);
      draw(t);
    };

    const onMove = (e: MouseEvent) => {
      const pr = panel.getBoundingClientRect();
      mx = e.clientX - pr.left; my = e.clientY - pr.top;
    };
    const onLeave = () => { mx = -9999; my = -9999; };
    const onResize = () => initCanvas();

    initCanvas();
    panel.addEventListener("mousemove", onMove);
    panel.addEventListener("mouseleave", onLeave);
    window.addEventListener("resize", onResize);
    if (reduced) draw(0); else raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      panel.removeEventListener("mousemove", onMove);
      panel.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // Card tilt toward the cursor.
  const onCardMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    const rx = ((e.clientY - r.top) / r.height - 0.5) * -5;
    const ry = ((e.clientX - r.left) / r.width - 0.5) * 6;
    cardRef.current.style.transform = `perspective(1100px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
  };
  const onCardLeave = () => { if (cardRef.current) cardRef.current.style.transform = "perspective(1100px) rotateX(0deg) rotateY(0deg)"; };

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
          <p style={{ marginTop: 10, fontSize: 13, color: "#a3aabc" }}>Loading your workspace…</p>
        </div>
      </div>
    );
  }

  const fieldWrap = (active: boolean, accent: string): React.CSSProperties => ({
    position: "relative", marginTop: 5, height: 52, borderRadius: 13, background: "#f3f5fa",
    border: `1.5px solid ${active ? accent : "#e4e8f2"}`,
    boxShadow: active ? `0 0 0 4px ${accent}22, 0 10px 26px -10px ${accent}72` : "none",
    transition: "border-color 0.3s ease, box-shadow 0.3s ease", overflow: "hidden",
  });

  return (
    <div style={{ display: "flex", width: "100vw", height: "100vh", overflow: "hidden", background: "#04030c", fontFamily: "'Manrope', system-ui, sans-serif" }}>
      <style>{KEYFRAMES}</style>

      {/* ── Left panel ── */}
      <div ref={panelRef} style={{ flex: "1 1 auto", minWidth: 0, position: "relative", overflow: "hidden", background: "linear-gradient(180deg,#010107 0%,#000517 42%,#030418 70%,#0a0620 100%)", perspective: 1200 }}>
        <div ref={lionRef} style={{ position: "absolute", top: 0, right: 0, height: "100%", aspectRatio: "686 / 1122", willChange: "transform", transformStyle: "preserve-3d" }}>
          <div style={{ position: "absolute", left: "74%", top: "37%", width: "66%", aspectRatio: "1", border: "1px solid rgba(120,190,255,0.30)", borderRadius: "50%", boxShadow: "0 0 18px rgba(100,160,255,0.18) inset", animation: "li-orbitA 22s linear infinite", pointerEvents: "none" }} />
          <div style={{ position: "absolute", left: "74%", top: "37%", width: "80%", aspectRatio: "1", border: "1px dashed rgba(160,130,255,0.28)", borderRadius: "50%", animation: "li-orbitB 34s linear infinite", pointerEvents: "none" }} />
          <img src={LION} alt="Mystical energy lion" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", animation: "li-breathe 7s ease-in-out infinite", WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 7%)", maskImage: "linear-gradient(to right, transparent 0%, black 7%)" }} />
          <div ref={maneRef} style={{ position: "absolute", left: "74%", top: "38%", width: "62%", aspectRatio: "1", transform: "translate(-50%,-50%)", borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.30) 0%, rgba(59,130,246,0.12) 45%, transparent 70%)", mixBlendMode: "screen", opacity: 0.25, pointerEvents: "none" }} />
          <div ref={eyeRef} style={{ position: "absolute", left: "70.4%", top: "32.6%", width: 46, height: 46, transform: "translate(-50%,-50%)", borderRadius: "50%", background: "radial-gradient(circle, rgba(120,220,255,0.85) 0%, rgba(56,150,255,0.35) 32%, transparent 65%)", mixBlendMode: "screen", opacity: 0.4, pointerEvents: "none", animation: "li-eyePulse 4.5s ease-in-out infinite" }}>
            <div ref={pupilRef} style={{ position: "absolute", left: "50%", top: "50%", width: 8, height: 8, margin: "-4px 0 0 -4px", borderRadius: "50%", background: "radial-gradient(circle,#eafcff,#6fd6ff 60%,transparent 100%)", boxShadow: "0 0 8px 2px rgba(150,225,255,0.9)" }} />
          </div>
          <div style={{ position: "absolute", left: "83.8%", top: "83.5%", width: 140, height: 44, transform: "translate(-50%,-50%)", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(147,92,246,0.5) 0%, transparent 65%)", mixBlendMode: "screen", animation: "li-portalGlow 5s ease-in-out infinite", pointerEvents: "none" }} />
        </div>
        <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 3, pointerEvents: "none" }} />

        {/* Foreground content */}
        <div style={{ position: "absolute", inset: 0, zIndex: 5, display: "flex", flexDirection: "column", alignItems: "flex-start", padding: "clamp(14px,3.2vh,36px) 36px", pointerEvents: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 13, background: "linear-gradient(145deg,#1b1633,#0e0a22)", border: "1px solid rgba(150,130,255,0.35)", display: "flex", alignItems: "center", justifyContent: "center", color: "#efecff", fontWeight: 800, fontSize: 16, letterSpacing: 0.5, boxShadow: "0 0 22px rgba(124,92,246,0.35)", animation: "li-coinFloat 5s ease-in-out infinite" }}>PA</div>
            <div style={{ color: "#eceafb", fontSize: 16.5, fontWeight: 600 }}>Personal Assistance</div>
          </div>

          <div style={{ width: 400, maxWidth: "min(62%, calc(100% - 20px))", marginTop: "clamp(10px,7vh,100px)" }}>
            <h1 style={{ margin: 0, color: "#f3f1fc", fontSize: "clamp(22px, min(3.6vw,4.8vh), 45px)", lineHeight: 1.18, fontWeight: 800, letterSpacing: "-0.5px" }}>
              Organize your day with one{" "}
              <span style={{ background: "linear-gradient(90deg,#a78bfa,#60a5fa,#c084fc,#a78bfa)", backgroundSize: "200% 100%", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", animation: "li-shimmer 6s linear infinite" }}>command</span> center
            </h1>
            <p style={{ margin: "clamp(10px,2.4vh,22px) 0 0", color: "#a9a5c2", fontSize: "clamp(13px,1.8vh,15.5px)", lineHeight: 1.7, fontWeight: 500, maxWidth: 320 }}>Manage goals, finances, tasks, and notes in one place with a faster and clearer workflow.</p>
          </div>

          <div style={{ width: 400, maxWidth: "min(400px, calc(100% - 12px))", marginTop: "clamp(12px,4vh,56px)", display: "flex", flexWrap: "wrap", gap: "clamp(8px,1.4vh,13px)" }}>
            {CHIPS.map((c) => (
              <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 9, padding: "clamp(6px,1.2vh,10px) clamp(13px,1.6vw,19px)", borderRadius: 999, border: "1px solid rgba(145,125,255,0.32)", background: "rgba(18,12,42,0.55)", backdropFilter: "blur(6px)", color: "#e9e6f8", fontSize: "clamp(12.5px,1.7vh,14px)", fontWeight: 600 }}>
                {c.icon}{c.label}
              </div>
            ))}
          </div>

          <div style={{ width: 360, maxWidth: "min(360px, calc(100% - 12px))", marginTop: "auto", paddingTop: 14, paddingBottom: "clamp(0px,6vh,90px)" }}>
            <div style={{ display: "flex", gap: 14 }}>
              <div style={{ color: "#7c6cf5", fontSize: 40, fontWeight: 800, lineHeight: 0.8, textShadow: "0 0 18px rgba(124,108,245,0.6)" }}>&ldquo;</div>
              <div>
                <p style={{ margin: 0, color: "#cfcbe6", fontSize: "clamp(13px,1.9vh,15.5px)", lineHeight: 1.6, fontStyle: "italic", fontWeight: 500, maxWidth: 336 }}>
                  You do not rise to the level of your goals.<br />You fall to the level of your systems.
                </p>
                <p style={{ margin: "12px 0 0", color: "#8b86a8", fontSize: 13, fontWeight: 600 }}>&ndash; James Clear</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right card panel ── */}
      <div style={{ width: "clamp(500px, 48vw, 790px)", flex: "0 0 auto", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-4%", bottom: "-4%", left: -64, right: 0, background: "rgba(238,241,250,0.35)", borderRadius: "46% 0 0 46% / 52% 0 0 52%", filter: "blur(2px)" }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, left: -20, right: 0, background: "linear-gradient(160deg,#fdfdff 0%,#eef1fa 48%,#e3e8f6 100%)", borderRadius: "44% 0 0 48% / 50% 0 0 50%", boxShadow: "-40px 0 90px rgba(70,60,160,0.35)" }} />

        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }} onMouseMove={onCardMove} onMouseLeave={onCardLeave}>
          <div style={{ position: "relative", zIndex: 2, margin: "auto", padding: "clamp(6px,2vh,28px) 0", maxHeight: "100%" }}>
            <div ref={cardRef} style={{ width: 448, maxWidth: "calc(100vw - 40px)", borderRadius: 30, background: "rgba(255,255,255,0.72)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.9)", boxShadow: "0 34px 90px rgba(76,64,165,0.20), 0 4px 18px rgba(76,64,165,0.08)", padding: "clamp(12px,3.2vh,34px) clamp(20px,4vw,40px) clamp(10px,2.8vh,30px)", transition: "transform 0.2s ease", willChange: "transform" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: "clamp(38px,6.4vh,62px)", height: "clamp(38px,6.4vh,62px)", borderRadius: 16, background: "linear-gradient(135deg,#0fce8e,#2f9df5)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 21, boxShadow: "0 14px 30px rgba(24,165,190,0.4)" }}>PA</div>
                <h2 style={{ margin: "clamp(6px,1.6vh,20px) 0 0", fontSize: "clamp(19px,3.2vh,29px)", fontWeight: 800, color: "#10142a", letterSpacing: "-0.4px", lineHeight: 1.2 }}>Welcome back</h2>
                <p style={{ margin: "3px 0 0", fontSize: "clamp(12px,1.6vh,15px)", color: "#6d7488", fontWeight: 500 }}>Sign in to continue where you left off</p>
              </div>

              <form onSubmit={handleLogin}>
                <div style={{ marginTop: "clamp(8px,2.2vh,28px)" }}>
                  <label htmlFor="email" style={{ display: "block", fontSize: 11.5, fontWeight: 700, letterSpacing: 1.3, color: "#4d5468" }}>EMAIL</label>
                  <div style={fieldWrap(focus === "email", "#6ea3f7")}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#8d94a8" strokeWidth={1.8} strokeLinecap="round" style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)" }}><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3.5 7l8.5 6 8.5-6" /></svg>
                    <input id="email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors((p) => ({ ...p, email: "" })); }} onFocus={() => setFocus("email")} onBlur={() => setFocus(null)} placeholder="your@email.com" autoComplete="email" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none", outline: "none", background: "transparent", padding: "0 16px 0 46px", fontSize: 15, color: "#171b2e", fontWeight: 500 }} />
                    <div style={{ position: "absolute", left: 0, bottom: 0, height: 2.5, background: "linear-gradient(90deg,#0fce8e,#2f9df5,#8b5cf6)", width: focus === "email" ? "100%" : "0%", transition: "width 0.45s cubic-bezier(0.22,1,0.36,1)" }} />
                  </div>
                  {errors.email && <p style={{ margin: "5px 0 0", fontSize: 12, color: "#ef4444" }}>{errors.email}</p>}
                </div>

                <div style={{ marginTop: "clamp(6px,1.6vh,18px)" }}>
                  <label htmlFor="password" style={{ display: "block", fontSize: 11.5, fontWeight: 700, letterSpacing: 1.3, color: "#4d5468" }}>PASSWORD</label>
                  <div style={fieldWrap(focus === "pw", "#8f7cf5")}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#8d94a8" strokeWidth={1.8} strokeLinecap="round" style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)" }}><rect x="4.5" y="10.5" width="15" height="10" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></svg>
                    <input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors((p) => ({ ...p, password: "" })); }} onFocus={() => setFocus("pw")} onBlur={() => setFocus(null)} placeholder="Enter your password" autoComplete="current-password" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none", outline: "none", background: "transparent", padding: "0 70px 0 46px", fontSize: 15, color: "#171b2e", fontWeight: 500 }} />
                    <button onClick={() => setShowPassword((s) => !s)} type="button" style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", border: "none", background: "none", color: "#6d7488", fontSize: 13.5, fontWeight: 600, cursor: "pointer", padding: "4px 6px", borderRadius: 6 }}>{showPassword ? "Hide" : "Show"}</button>
                    <div style={{ position: "absolute", left: 0, bottom: 0, height: 2.5, background: "linear-gradient(90deg,#0fce8e,#2f9df5,#8b5cf6)", width: focus === "pw" ? "100%" : "0%", transition: "width 0.45s cubic-bezier(0.22,1,0.36,1)" }} />
                  </div>
                  {errors.password && <p style={{ margin: "5px 0 0", fontSize: 12, color: "#ef4444" }}>{errors.password}</p>}
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "clamp(6px,1.6vh,16px)" }}>
                  <div onClick={() => setRemember((r) => !r)} style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer", userSelect: "none" }}>
                    <div style={{ width: 19, height: 19, borderRadius: 6, border: `1.5px solid ${remember ? "transparent" : "#c3c9d9"}`, background: remember ? "linear-gradient(135deg,#0fce8e,#2f9df5)" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.25s ease" }}>
                      {remember && <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#fff" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.4 4.4L19 7.5" /></svg>}
                    </div>
                    <span style={{ fontSize: 14, color: "#3c4257", fontWeight: 500 }}>Remember me</span>
                  </div>
                  <a href="#" onClick={(e) => e.preventDefault()} style={{ fontSize: 14, fontWeight: 600, color: "#2f9df5", textDecoration: "none" }}>Forgot password?</a>
                </div>

                {errors.form && <div style={{ marginTop: 12, borderRadius: 12, border: "1px solid #fecaca", background: "#fef2f2", padding: "9px 14px", fontSize: 13, color: "#b91c1c" }}>{errors.form}</div>}

                <button type="submit" disabled={sign !== "idle"} style={{ position: "relative", width: "100%", height: "clamp(38px,6.4vh,54px)", marginTop: "clamp(8px,2vh,22px)", border: "none", borderRadius: 15, background: "linear-gradient(90deg,#0ec98c 0%,#17b7ab 40%,#2f9df5 100%)", color: "#fff", fontSize: 16, fontWeight: 700, cursor: sign === "idle" ? "pointer" : "default", overflow: "hidden", boxShadow: "0 14px 34px rgba(23,160,190,0.38)", opacity: sign === "loading" ? 0.92 : 1 }}>
                  {sign === "idle" && <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10 }}>Sign in <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h15M13 6l6 6-6 6" /></svg></span>}
                  {sign === "loading" && <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 11 }}><span style={{ width: 19, height: 19, borderRadius: "50%", border: "2.5px solid rgba(255,255,255,0.35)", borderTopColor: "#fff", display: "inline-block", animation: "li-spin 0.8s linear infinite" }} />Authenticating…</span>}
                  {sign === "done" && <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10 }}><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.4 4.4L19 7.5" /></svg>Welcome back</span>}
                </button>
              </form>

              <p style={{ margin: "clamp(6px,1.6vh,18px) 0 0", textAlign: "center", fontSize: 14, color: "#5b6175", fontWeight: 500 }}>Don&rsquo;t have an account? <Link to="/signup" style={{ fontWeight: 700, color: "#2f9df5", textDecoration: "none" }}>Create one</Link></p>

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: "clamp(8px,2vh,22px)" }}>
                <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg,transparent,#ccd2e2)" }} />
                <span style={{ fontSize: 13, color: "#767d92", fontWeight: 500, whiteSpace: "nowrap" }}>or continue with</span>
                <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg,#ccd2e2,transparent)" }} />
              </div>

              <div style={{ display: "flex", justifyContent: "center", gap: "clamp(8px,1.8vw,18px)", marginTop: "clamp(8px,1.8vh,20px)" }}>
                <button type="button" aria-label="Continue with Google" onClick={() => social("Google")} style={socialBtn}>
                  <svg viewBox="0 0 24 24" width="23" height="23"><path fill="#EA4335" d="M12 5.04c1.7 0 3.23.59 4.43 1.74l3.29-3.29C17.72 1.63 15.1.55 12 .55 7.4.55 3.4 3.2 1.46 7.06l3.85 2.98C6.23 7.25 8.88 5.04 12 5.04z" /><path fill="#4285F4" d="M23.49 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.46c-.28 1.49-1.13 2.76-2.4 3.61l3.72 2.89c2.17-2.01 3.71-4.97 3.71-8.69z" /><path fill="#FBBC05" d="M5.29 14.26c-.23-.7-.36-1.44-.36-2.21s.13-1.51.36-2.21L1.44 6.86C.65 8.41.22 10.16.22 12.05s.43 3.63 1.22 5.19l3.85-2.98z" /><path fill="#34A853" d="M12 23.55c3.1 0 5.7-1.02 7.6-2.77l-3.72-2.89c-1.03.69-2.36 1.1-3.88 1.1-3.12 0-5.77-2.21-6.71-5.01l-3.85 2.98C3.4 20.9 7.4 23.55 12 23.55z" /></svg>
                </button>
                <button type="button" aria-label="Continue with Apple" onClick={() => social("Apple")} style={socialBtn}>
                  <svg viewBox="0 0 24 24" width="23" height="23" fill="#111318"><path d="M17.06 20.28c-.98.95-2.06.8-3.09.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.8 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.75 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.86 7.28-.57 1.5-1.68 2.98-2.9 3.93zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" /></svg>
                </button>
                <button type="button" aria-label="Continue with Microsoft" onClick={() => social("Microsoft")} style={socialBtn}>
                  <svg viewBox="0 0 24 24" width="21" height="21"><rect x="2" y="2" width="9.5" height="9.5" fill="#F25022" /><rect x="12.5" y="2" width="9.5" height="9.5" fill="#7FBA00" /><rect x="2" y="12.5" width="9.5" height="9.5" fill="#00A4EF" /><rect x="12.5" y="12.5" width="9.5" height="9.5" fill="#FFB900" /></svg>
                </button>
                <button type="button" aria-label="Continue with GitHub" onClick={() => social("GitHub")} style={socialBtn}>
                  <svg viewBox="0 0 24 24" width="23" height="23" fill="#24292f"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.75 2.69 1.25 3.35.95.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18.92-.26 1.91-.38 2.9-.39.98.01 1.98.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.26 5.67.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .31.21.68.8.56A10.52 10.52 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" /></svg>
                </button>
              </div>

              <p style={{ margin: "clamp(8px,1.8vh,22px) 0 0", textAlign: "center", fontSize: 11, color: "#858c9f", fontWeight: 500, lineHeight: 1.6 }}>By continuing, you agree to our <a href="#" onClick={(e) => e.preventDefault()} style={{ color: "#2f9df5", fontWeight: 600, textDecoration: "none" }}>Terms of Service</a> and <a href="#" onClick={(e) => e.preventDefault()} style={{ color: "#2f9df5", fontWeight: 600, textDecoration: "none" }}>Privacy Policy</a></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const socialBtn: React.CSSProperties = {
  width: "clamp(38px,6vh,56px)", height: "clamp(38px,6vh,56px)", borderRadius: "50%",
  border: "1px solid #e8ebf3", background: "#fff", display: "flex", alignItems: "center",
  justifyContent: "center", cursor: "pointer", boxShadow: "0 6px 18px rgba(70,60,160,0.10)",
};

const KEYFRAMES = `
@keyframes li-breathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.014); } }
@keyframes li-shimmer { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
@keyframes li-eyePulse { 0%,100% { opacity: 0.55; transform: translate(-50%,-50%) scale(1); } 50% { opacity: 0.95; transform: translate(-50%,-50%) scale(1.18); } }
@keyframes li-orbitDot { to { transform: rotate(360deg); } }
@keyframes li-coinFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2.5px); } }
@keyframes li-pageTilt { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(-7deg); } }
@keyframes li-checkPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.12); } }
@keyframes li-heartbeat { 0%,100% { transform: scale(1); } 14% { transform: scale(1.28); } 28% { transform: scale(1); } 42% { transform: scale(1.18); } 56% { transform: scale(1); } }
@keyframes li-spin { to { transform: rotate(360deg); } }
@keyframes li-portalGlow { 0%,100% { opacity: 0.35; } 50% { opacity: 0.8; } }
@keyframes li-orbitA { from { transform: translate(-50%,-50%) rotateX(72deg) rotateZ(0deg); } to { transform: translate(-50%,-50%) rotateX(72deg) rotateZ(360deg); } }
@keyframes li-orbitB { from { transform: translate(-50%,-50%) rotateX(64deg) rotateY(-14deg) rotateZ(360deg); } to { transform: translate(-50%,-50%) rotateX(64deg) rotateY(-14deg) rotateZ(0deg); } }
`;
