import { ReactNode, useEffect, useRef, useState } from "react";

const LION_VIDEO = "/videos/lion-cosmic.mp4";
const POSTER_JPG = "/images/login/lion-poster.jpg";   // <video poster> (universal)
const POSTER_WEBP = "/images/login/lion-poster.webp"; // CSS bg (small, instant)

export const FONT = "'Manrope', system-ui, -apple-system, sans-serif";

// ── Shared glass styles (used by both sign-in and sign-up) ───────────────────────
export const authLabel: React.CSSProperties = { display: "block", fontSize: 11.5, fontWeight: 700, letterSpacing: 1.3, color: "rgba(255,255,255,0.85)" };
export const authErr: React.CSSProperties = { margin: "5px 0 0", fontSize: 12, color: "#ffb4b4" };
export const authInputEl: React.CSSProperties = { width: "100%", height: 52, border: "none", outline: "none", borderRadius: 13, background: "rgba(255,255,255,0.55)", padding: "0 16px", fontSize: 15, color: "#0f1424", fontWeight: 500, fontFamily: FONT };
export const authBox = (active: boolean, accent = "#6ea3f7", bad = false): React.CSSProperties => ({
  position: "relative", marginTop: 5, height: 52, borderRadius: 13, background: "rgba(255,255,255,0.55)",
  border: `1.5px solid ${bad ? "#ff8a8a" : active ? accent : "rgba(255,255,255,0.7)"}`,
  boxShadow: active ? `0 0 0 4px ${accent}22, 0 10px 26px -10px ${accent}72` : "inset 0 1px 2px rgba(0,0,0,0.04)",
  transition: "border-color 0.3s ease, box-shadow 0.3s ease", overflow: "hidden",
});
export const authPrimaryBtn: React.CSSProperties = {
  position: "relative", width: "100%", height: 52, border: "none", borderRadius: 15,
  background: "linear-gradient(90deg,#0ec98c 0%,#17b7ab 40%,#2f9df5 100%)", color: "#fff",
  fontSize: 16, fontWeight: 700, cursor: "pointer", overflow: "hidden", boxShadow: "0 16px 38px rgba(23,160,190,0.55)", fontFamily: FONT,
};
export const authGhostBtn: React.CSSProperties = {
  width: "100%", height: 48, borderRadius: 14, border: "1px solid rgba(255,255,255,0.3)",
  background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.9)", fontSize: 14.5, fontWeight: 600, cursor: "pointer", fontFamily: FONT,
};
export const authSocialBtn: React.CSSProperties = {
  width: 52, height: 52, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.14)",
  backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
};

const GRAIN = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export const AUTH_KEYFRAMES = `
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

export default function AuthCosmicShell({ children, footer, cardWidth = 430 }: { children: ReactNode; footer?: ReactNode; cardWidth?: number }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  // Full-page parallax on the video.
  useEffect(() => {
    const root = rootRef.current, video = videoRef.current;
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

  return (
    <div ref={rootRef} style={{ position: "relative", width: "100vw", minHeight: "100vh", overflow: "hidden", background: `#04030c url(${POSTER_WEBP}) center/cover no-repeat`, fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{AUTH_KEYFRAMES}</style>

      <video ref={videoRef} src={LION_VIDEO} poster={POSTER_JPG} autoPlay loop muted playsInline preload="auto"
        onCanPlay={() => setReady(true)} onPlaying={() => setReady(true)}
        style={{ position: "fixed", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.16)", willChange: "transform", zIndex: 0, opacity: ready ? 1 : 0, transition: "opacity 1.1s ease" }} />

      {/* Depth: vignette, gradient, grain */}
      <div style={{ position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none", background: "radial-gradient(125% 95% at 50% 42%, rgba(4,3,12,0) 30%, rgba(4,3,12,0.5) 74%, rgba(4,3,12,0.88) 100%)" }} />
      <div style={{ position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none", background: "linear-gradient(180deg, rgba(4,3,12,0.5) 0%, rgba(4,3,12,0) 20%, rgba(4,3,12,0) 74%, rgba(4,3,12,0.55) 100%)" }} />
      <div style={{ position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none", opacity: 0.06, mixBlendMode: "overlay", backgroundImage: GRAIN, backgroundSize: "200px 200px" }} />
      {/* Watermark guard: darken the bottom-right corner where the clip's sparkle sits */}
      <div style={{ position: "fixed", right: 0, bottom: 0, width: 200, height: 130, zIndex: 1, pointerEvents: "none", background: "radial-gradient(120% 120% at 100% 100%, rgba(4,3,12,0.95), rgba(4,3,12,0) 72%)" }} />

      {/* Drifting orbs */}
      <div style={{ position: "fixed", left: "12%", top: "22%", width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.35), transparent 70%)", filter: "blur(20px)", zIndex: 1, pointerEvents: "none", animation: "li-orb1 18s ease-in-out infinite" }} />
      <div style={{ position: "fixed", right: "14%", top: "58%", width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.28), transparent 70%)", filter: "blur(26px)", zIndex: 1, pointerEvents: "none", animation: "li-orb2 24s ease-in-out infinite" }} />

      {/* Brand */}
      <div style={{ position: "fixed", top: 28, left: 32, zIndex: 3, display: "flex", alignItems: "center", gap: 13, animation: "li-fadeDown 0.9s ease both" }}>
        <div style={{ width: 44, height: 44, borderRadius: 13, background: "linear-gradient(145deg,#1b1633,#0e0a22)", border: "1px solid rgba(150,130,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center", color: "#efecff", fontWeight: 800, fontSize: 15, letterSpacing: 0.5, boxShadow: "0 0 22px rgba(124,92,246,0.4)", animation: "li-coinFloat 5s ease-in-out infinite" }}>PA</div>
        <span style={{ color: "#eceafb", fontSize: 16, fontWeight: 600, textShadow: "0 2px 12px rgba(0,0,0,0.7)" }}>Personal Assistance</span>
      </div>

      {/* Card + aurora glow */}
      <div style={{ position: "relative", zIndex: 2, padding: "88px 20px 44px", width: "100%", display: "flex", justifyContent: "center" }} onMouseMove={onCardMove} onMouseLeave={onCardLeave}>
        <div style={{ position: "relative", width: cardWidth, maxWidth: "100%", animation: "li-cardIn 0.9s cubic-bezier(0.22,1,0.36,1) both" }}>
          <div style={{ position: "absolute", inset: -2, borderRadius: 30, padding: 2, background: "conic-gradient(from 0deg, #0fce8e, #2f9df5, #8b5cf6, #c084fc, #0fce8e)", filter: "blur(14px)", opacity: 0.55, animation: "li-spin 12s linear infinite", pointerEvents: "none" }} />
          <div ref={cardRef} style={{ position: "relative", borderRadius: 28, background: "rgba(14,12,26,0.44)", backdropFilter: "blur(30px) saturate(150%)", WebkitBackdropFilter: "blur(30px) saturate(150%)", border: "1px solid rgba(255,255,255,0.28)", boxShadow: "0 40px 100px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.35)", padding: "34px clamp(22px,4vw,40px) 28px", transition: "transform 0.2s ease", willChange: "transform" }}>
            {children}
          </div>
          {footer && <div style={{ marginTop: 18, animation: "li-fadeUp 1s ease 0.4s both" }}>{footer}</div>}
        </div>
      </div>
    </div>
  );
}
