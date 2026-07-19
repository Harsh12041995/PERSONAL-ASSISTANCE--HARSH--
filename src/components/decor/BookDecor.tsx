// Decorative layer for the Book skin — "the living margins".
// Purely visual: fixed overlay, pointer-events: none, aria-hidden.
// All motion lives in book-theme.css and respects prefers-reduced-motion.

export default function BookDecor() {
    return (
        <div className="book-decor" aria-hidden="true">
            {/* Paper plane crossing the sky */}
            <div className="bd-plane">
                <svg width="52" height="40" viewBox="0 0 52 40" fill="none">
                    <path d="M2 22 L50 4 L30 36 L24 24 Z" fill="var(--paper)" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                    <path d="M50 4 L24 24 L22 32" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none" />
                    <path d="M4 26 C 8 30, 6 34, 1 36" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" fill="none" opacity="0.5" />
                </svg>
            </div>

            {/* Distant birds */}
            <div className="bd-birds">
                <svg width="70" height="26" viewBox="0 0 70 26" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                    <path d="M2 10 Q 7 4 12 10 Q 17 4 22 10" />
                    <path d="M30 20 Q 34 15 38 20 Q 42 15 46 20" />
                    <path d="M52 8 Q 56 3 60 8 Q 64 3 68 8" />
                </svg>
            </div>

            {/* Fountain pen drawing a flourish */}
            <div className="bd-ink">
                <svg width="150" height="72" viewBox="0 0 150 72" fill="none">
                    <path className="bd-stroke" d="M8 58 C 26 30, 44 30, 52 48 C 58 62, 40 66, 38 54 C 36 42, 60 34, 82 40 C 104 46, 112 38, 126 26"
                        stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" />
                    <g transform="translate(118 6) rotate(38)">
                        <path d="M0 0 L7 0 L5 22 L3.5 26 L2 22 Z" fill="var(--gold)" stroke="currentColor" strokeWidth="1" />
                        <rect x="0.5" y="-14" width="6" height="14" rx="2" fill="var(--leather)" stroke="currentColor" strokeWidth="1" />
                        <circle cx="3.5" cy="23" r="0.9" fill="currentColor" />
                    </g>
                </svg>
            </div>

            {/* Vintage car along the bottom edge */}
            <div className="bd-car">
                <svg width="128" height="52" viewBox="0 0 128 52" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M8 38 L12 26 C 13 22, 16 20, 20 20 L38 20 L48 8 C 50 6, 52 5, 56 5 L78 5 C 82 5, 85 7, 87 10 L96 20 L112 22 C 117 23, 120 26, 120 31 L120 38"
                        fill="var(--paper-2)" strokeLinejoin="round" />
                    <path d="M50 20 L58 9 L74 9 L82 20 Z" fill="var(--paper)" />
                    <line x1="66" y1="9" x2="66" y2="20" />
                    <rect x="88" y="24" width="10" height="6" rx="2" fill="var(--gold)" stroke="none" />
                    <line x1="4" y1="38" x2="124" y2="38" strokeLinecap="round" />
                    <g className="bd-wheel">
                        <circle cx="32" cy="38" r="9" fill="var(--paper)" />
                        <circle cx="32" cy="38" r="3.2" fill="currentColor" stroke="none" />
                        <line x1="32" y1="30.5" x2="32" y2="45.5" />
                        <line x1="24.5" y1="38" x2="39.5" y2="38" />
                    </g>
                    <g className="bd-wheel">
                        <circle cx="96" cy="38" r="9" fill="var(--paper)" />
                        <circle cx="96" cy="38" r="3.2" fill="currentColor" stroke="none" />
                        <line x1="96" y1="30.5" x2="96" y2="45.5" />
                        <line x1="88.5" y1="38" x2="103.5" y2="38" />
                    </g>
                    <path d="M118 30 C 124 30, 126 33, 127 36" strokeDasharray="2.5 3" strokeWidth="1.2" opacity="0.55" fill="none" />
                </svg>
            </div>

            {/* Reading robot, bottom-left */}
            <div className="bd-robot">
                <svg width="92" height="86" viewBox="0 0 92 86" fill="none" stroke="currentColor" strokeWidth="1.7">
                    {/* antenna */}
                    <line x1="46" y1="14" x2="46" y2="6" />
                    <circle className="bd-robot-light" cx="46" cy="4.5" r="2.6" fill="var(--accent)" stroke="none" />
                    {/* head */}
                    <rect x="30" y="14" width="32" height="24" rx="7" fill="var(--paper-2)" />
                    <g className="bd-robot-eye">
                        <circle cx="41" cy="26" r="3.4" fill="currentColor" stroke="none" />
                        <circle cx="53" cy="26" r="3.4" fill="currentColor" stroke="none" />
                    </g>
                    <path d="M41 32 Q 47 35 53 32" strokeLinecap="round" fill="none" />
                    {/* body */}
                    <rect x="26" y="40" width="40" height="30" rx="9" fill="var(--paper)" />
                    <circle cx="46" cy="55" r="4.5" fill="var(--gold)" stroke="none" />
                    {/* the book it reads */}
                    <path d="M14 62 L34 56 L34 74 L14 80 Z" fill="var(--accent-wash)" strokeLinejoin="round" />
                    <path d="M54 56 L74 62 L74 80 L54 74 Z" fill="var(--accent-wash)" strokeLinejoin="round" />
                    <line x1="34" y1="56" x2="54" y2="56" opacity="0" />
                    {/* waving arm */}
                    <g className="bd-robot-arm">
                        <path d="M66 46 C 76 42, 82 34, 84 26" strokeLinecap="round" fill="none" />
                        <circle cx="85" cy="24" r="4" fill="var(--paper-2)" />
                    </g>
                    {/* wheels */}
                    <circle cx="36" cy="76" r="5" fill="var(--paper-2)" />
                    <circle cx="56" cy="76" r="5" fill="var(--paper-2)" />
                </svg>
            </div>

            {/* Hot-air balloon up the right margin */}
            <div className="bd-balloon">
                <svg width="72" height="104" viewBox="0 0 72 104" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M36 4 C 55 4, 66 18, 66 34 C 66 50, 52 60, 44 68 L28 68 C 20 60, 6 50, 6 34 C 6 18, 17 4, 36 4 Z" fill="var(--accent-wash)" />
                    <path d="M26 5.5 C 20 14, 18 46, 28 67" fill="none" opacity="0.65" />
                    <path d="M46 5.5 C 52 14, 54 46, 44 67" fill="none" opacity="0.65" />
                    <line x1="36" y1="4" x2="36" y2="68" opacity="0.65" />
                    <path d="M28 68 L30 82 L42 82 L44 68" fill="none" />
                    <rect x="28" y="82" width="16" height="13" rx="3" fill="var(--gold)" />
                    <path d="M6 34 L66 34" opacity="0.4" strokeDasharray="3 4" />
                </svg>
            </div>

            {/* Gold filigree corners */}
            <svg className="bd-corner tl" width="90" height="90" viewBox="0 0 90 90" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M4 34 C 4 14, 14 4, 34 4" />
                <path d="M4 22 C 4 10, 10 4, 22 4" opacity="0.6" />
                <path d="M10 44 C 22 44, 26 36, 22 30 C 19 26, 12 28, 14 34 C 16 39, 26 38, 32 30" strokeLinecap="round" />
                <circle cx="6" cy="47" r="1.6" fill="currentColor" stroke="none" />
                <circle cx="47" cy="6" r="1.6" fill="currentColor" stroke="none" />
                <path d="M44 10 C 36 10, 32 16, 34 21 C 36 25, 42 23, 41 18" strokeLinecap="round" opacity="0.8" />
            </svg>
            <svg className="bd-corner br" width="90" height="90" viewBox="0 0 90 90" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M4 34 C 4 14, 14 4, 34 4" />
                <path d="M4 22 C 4 10, 10 4, 22 4" opacity="0.6" />
                <path d="M10 44 C 22 44, 26 36, 22 30 C 19 26, 12 28, 14 34 C 16 39, 26 38, 32 30" strokeLinecap="round" />
                <circle cx="6" cy="47" r="1.6" fill="currentColor" stroke="none" />
                <circle cx="47" cy="6" r="1.6" fill="currentColor" stroke="none" />
                <path d="M44 10 C 36 10, 32 16, 34 21 C 36 25, 42 23, 41 18" strokeLinecap="round" opacity="0.8" />
            </svg>
        </div>
    );
}
