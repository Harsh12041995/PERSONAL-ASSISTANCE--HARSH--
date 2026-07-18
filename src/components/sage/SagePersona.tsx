import { useCallback, useEffect, useRef, useState } from 'react';
import SageOrb from './SageOrb';
import { statsApi } from '../../services/personalApi';
import type { SageMood, PageAccessory, SageIntent } from './types';

interface SagePersonaProps {
    onOpen: (intent?: SageIntent) => void;
    mood: SageMood;
    hidden?: boolean;
    accessory?: PageAccessory | null;
}

const SIZE = 64;
const MARGIN = 20;
const POS_KEY = 'sage_pos_v2';
const MAX_TILT = 9; // degrees
// Roughly where the Notebook edge-tab sits (right edge, ~150-236px up from the
// bottom) — Sage steers clear of resting there so the two never overlap.
const PEN_ZONE = { rightMax: 90, bottomMin: 110, bottomMax: 260 };

const RING_ACTIONS: { intent: SageIntent; emoji: string; label: string }[] = [
    { intent: 'talk-record', emoji: '🎙️', label: 'Start talking' },
    { intent: 'note', emoji: '📝', label: 'Quick note' },
    { intent: 'camera', emoji: '📷', label: 'Snapshot' },
];

function clamp(x: number, y: number) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let cx = Math.min(Math.max(x, MARGIN), Math.max(MARGIN, vw - SIZE - MARGIN));
    const cy = Math.min(Math.max(y, 88), Math.max(88, vh - SIZE - MARGIN));

    const fromRight = vw - cx - SIZE;
    const fromBottom = vh - cy - SIZE;
    if (fromRight < PEN_ZONE.rightMax && fromBottom > PEN_ZONE.bottomMin && fromBottom < PEN_ZONE.bottomMax) {
        cx = Math.max(MARGIN, cx - 110);
    }
    return { x: cx, y: cy };
}

function defaultPos() {
    return clamp(window.innerWidth - SIZE - MARGIN, window.innerHeight - SIZE - MARGIN);
}

function loadPos() {
    try {
        const raw = localStorage.getItem(POS_KEY);
        if (raw) {
            const [x, y] = JSON.parse(raw) as [number, number];
            if (typeof x === 'number' && typeof y === 'number') return clamp(x, y);
        }
    } catch { /* corrupt/blocked storage — fall through */ }
    return defaultPos();
}

function nudgeFor(s: { tasksToday: number; tasksDone: number; habitStreak: number; capturedToday: number }) {
    if (s.tasksToday > 0 && s.tasksDone < s.tasksToday) return `${s.tasksToday - s.tasksDone} task${s.tasksToday - s.tasksDone === 1 ? '' : 's'} left today`;
    if (s.habitStreak > 0) return `🔥 ${s.habitStreak}-day habit streak — keep it up!`;
    if (s.capturedToday === 0) return 'Got a thought? Tap me to capture it.';
    return 'All caught up today ✨';
}

// The living, movable orb of your assistant. It:
// - tracks your cursor with its eyes AND tilts its whole body toward it in 3D
// - blinks naturally, breathes, and dozes off after 45s of inactivity
// - wanders to a new resting spot on its own every so often (rolling squash/stretch)
// - can be picked up and dragged anywhere; a hover-revealed pin brings it home
// - opens a radial quick-action ring on right-click/long-press
// - double-click jumps straight into voice recording
// - occasionally nudges you with a real, data-driven speech bubble
export default function SagePersona({ onOpen, mood, hidden, accessory }: SagePersonaProps) {
    const rootRef = useRef<HTMLButtonElement>(null);
    const [pos, setPos] = useState(loadPos);
    const [dragging, setDragging] = useState(false);
    const [walking, setWalking] = useState(false);
    const [blink, setBlink] = useState(false);
    const [asleep, setAsleep] = useState(false);
    const [greet, setGreet] = useState(true);
    const [showDock, setShowDock] = useState(false);
    const [ringOpen, setRingOpen] = useState(false);
    const [nudge, setNudge] = useState<string | null>(null);

    const lastActivity = useRef(Date.now());
    const dragStart = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
    const moved = useRef(false);
    const rafRef = useRef<number | null>(null);
    const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const longPressFired = useRef(false);
    const nudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Cursor-tracking eyes + a real 3D tilt toward the cursor — CSS vars set
    // directly on the node, no re-renders.
    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            lastActivity.current = Date.now();
            setAsleep(false);
            if (rafRef.current) return;
            rafRef.current = requestAnimationFrame(() => {
                rafRef.current = null;
                const el = rootRef.current;
                if (!el || dragging) return;
                const r = el.getBoundingClientRect();
                const cx = r.left + r.width / 2;
                const cy = r.top + r.height / 2;
                const dx = e.clientX - cx;
                const dy = e.clientY - cy;
                const dist = Math.max(1, Math.hypot(dx, dy));
                const reach = Math.min(1, dist / 320);
                el.style.setProperty('--sage-eye-x', `${(dx / dist) * reach * 2.6}px`);
                el.style.setProperty('--sage-eye-y', `${(dy / dist) * reach * 2.6}px`);
                el.style.setProperty('--sage-tilt-x', `${(dx / dist) * reach * MAX_TILT}deg`);
                el.style.setProperty('--sage-tilt-y', `${(-dy / dist) * reach * MAX_TILT}deg`);
            });
        };
        window.addEventListener('mousemove', onMove);
        return () => {
            window.removeEventListener('mousemove', onMove);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [dragging]);

    // Natural blinking, paused while dragging/asleep.
    useEffect(() => {
        let t: ReturnType<typeof setTimeout>;
        const schedule = () => {
            t = setTimeout(() => {
                if (!asleep && !dragging) {
                    setBlink(true); setTimeout(() => setBlink(false), 150);
                    if (Math.random() < 0.25) setTimeout(() => { setBlink(true); setTimeout(() => setBlink(false), 130); }, 260);
                }
                schedule();
            }, 2600 + Math.random() * 3200);
        };
        schedule();
        return () => clearTimeout(t);
    }, [asleep, dragging]);

    // Doze off after inactivity.
    useEffect(() => {
        const t = setInterval(() => {
            if (Date.now() - lastActivity.current > 45_000) setAsleep(true);
        }, 5_000);
        return () => clearInterval(t);
    }, []);

    // One greeting flash per mount.
    useEffect(() => {
        const t = setTimeout(() => setGreet(false), 1300);
        return () => clearTimeout(t);
    }, []);

    // Autonomous wandering — only while idle, awake, not being held, not hidden.
    useEffect(() => {
        const t = setInterval(() => {
            if (hidden || dragging || walking || asleep || ringOpen || mood !== 'idle') return;
            if (Math.random() > 0.22) return;
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const targetX = Math.random() * Math.max(1, vw - SIZE - 2 * MARGIN) + MARGIN;
            const targetY = Math.random() * Math.max(1, vh - SIZE - 170) + 90;
            const next = clamp(targetX, targetY);
            setWalking(true);
            setPos(next);
            const dur = 1500 + Math.random() * 900;
            setTimeout(() => {
                setWalking(false);
                try { localStorage.setItem(POS_KEY, JSON.stringify([next.x, next.y])); } catch { /* ignore */ }
            }, dur);
        }, 6000);
        return () => clearInterval(t);
    }, [hidden, dragging, walking, asleep, ringOpen, mood]);

    // Keep Sage on-screen if the window is resized smaller.
    useEffect(() => {
        const onResize = () => setPos(p => clamp(p.x, p.y));
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    // Occasional, real productivity nudge — only when idle, awake, and available.
    useEffect(() => {
        const tick = async () => {
            if (hidden || dragging || asleep || ringOpen || mood !== 'idle') return;
            try {
                const s = await statsApi.get();
                setNudge(nudgeFor(s));
                if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
                nudgeTimer.current = setTimeout(() => setNudge(null), 6000);
            } catch { /* backend unavailable — skip silently */ }
        };
        const t = setInterval(tick, 110_000);
        const firstRun = setTimeout(tick, 20_000);
        return () => { clearInterval(t); clearTimeout(firstRun); if (nudgeTimer.current) clearTimeout(nudgeTimer.current); };
    }, [hidden, dragging, asleep, ringOpen, mood]);

    // Close the ring on outside click / Escape.
    useEffect(() => {
        if (!ringOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setRingOpen(false); };
        const onClickOutside = () => setRingOpen(false);
        document.addEventListener('keydown', onKey);
        document.addEventListener('pointerdown', onClickOutside);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('pointerdown', onClickOutside);
        };
    }, [ringOpen]);

    const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        dragStart.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
        moved.current = false;
        longPressFired.current = false;
        longPressTimer.current = setTimeout(() => {
            longPressFired.current = true;
            setNudge(null);
            setRingOpen(true);
        }, 520);
    };
    const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
        if (!dragStart.current) return;
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        if (Math.hypot(dx, dy) > 6) {
            moved.current = true;
            setDragging(true);
            if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
        }
        if (moved.current) {
            setPos({ x: dragStart.current.px + dx, y: dragStart.current.py + dy });
            lastActivity.current = Date.now();
            setAsleep(false);
            // Tilt in the direction of the drag, like a ball being pushed.
            const el = rootRef.current;
            if (el) {
                const tiltX = Math.max(-MAX_TILT, Math.min(MAX_TILT, dx / 6));
                const tiltY = Math.max(-MAX_TILT, Math.min(MAX_TILT, dy / 6));
                el.style.setProperty('--sage-tilt-x', `${tiltX}deg`);
                el.style.setProperty('--sage-tilt-y', `${-tiltY}deg`);
            }
        }
    };
    const onPointerUp = () => {
        if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
        if (moved.current) {
            setPos(p => {
                const next = clamp(p.x, p.y);
                try { localStorage.setItem(POS_KEY, JSON.stringify([next.x, next.y])); } catch { /* ignore */ }
                return next;
            });
        }
        setDragging(false);
        dragStart.current = null;
    };

    // Single click opens normally; a genuine double-click jumps straight into
    // recording. The brief delay is the standard click/dblclick disambiguation.
    const handleClick = () => {
        if (moved.current || longPressFired.current) { moved.current = false; longPressFired.current = false; return; }
        if (clickTimer.current) return;
        clickTimer.current = setTimeout(() => {
            clickTimer.current = null;
            onOpen('default');
        }, 230);
    };
    const handleDoubleClick = () => {
        if (clickTimer.current) { clearTimeout(clickTimer.current); clickTimer.current = null; }
        setNudge(null);
        onOpen('talk-record');
    };
    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setNudge(null);
        setRingOpen(o => !o);
    };

    const runRingAction = (intent: SageIntent) => {
        setRingOpen(false);
        onOpen(intent);
    };

    const dock = useCallback(() => {
        setRingOpen(false);
        const next = defaultPos();
        setWalking(true);
        setPos(next);
        setTimeout(() => {
            setWalking(false);
            try { localStorage.setItem(POS_KEY, JSON.stringify([next.x, next.y])); } catch { /* ignore */ }
        }, 1300);
    }, []);

    const sleepNow = useCallback(() => {
        setRingOpen(false);
        setNudge(null);
        setAsleep(true);
    }, []);

    const listening = mood === 'listening';
    const thinking = mood === 'thinking';
    const concerned = mood === 'concerned';

    const ariaLabel = dragging
        ? 'Moving Sage'
        : asleep
            ? 'Sage is asleep — click to wake and open'
            : listening
                ? 'Sage is listening'
                : thinking
                    ? 'Sage is thinking'
                    : concerned
                        ? 'Sage ran into a snag'
                        : 'Open Sage, your assistant';

    // Ring layout: N icons + a dock + a sleep control, arranged in a circle.
    const ringItems = [
        ...RING_ACTIONS.map(a => ({ ...a, onClick: () => runRingAction(a.intent) })),
        { intent: 'dock' as const, emoji: '🏠', label: 'Bring home', onClick: dock },
        { intent: 'sleep' as const, emoji: '😴', label: 'Sleep now', onClick: sleepNow },
    ];
    const ringRadius = SIZE * 1.35;

    return (
        <div
            className={`fixed z-[60] ${hidden ? 'pointer-events-none' : ''}`}
            style={{ left: pos.x, top: pos.y, transition: dragging ? 'none' : 'left 1.3s cubic-bezier(.4,0,.2,1), top 1.3s cubic-bezier(.4,0,.2,1)' }}
            onMouseEnter={() => setShowDock(true)}
            onMouseLeave={() => setShowDock(false)}
        >
            {/* Speech-bubble nudge — real data, not decoration */}
            {nudge && !ringOpen && (
                <div
                    className="sage-bubble absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-max max-w-[200px] px-3 py-2 rounded-xl bg-white dark:bg-gray-900 border border-violet-100 dark:border-violet-900/50 shadow-lg text-xs font-medium text-gray-700 dark:text-gray-200 text-center cursor-pointer"
                    onClick={() => { setNudge(null); onOpen('default'); }}
                >
                    {nudge}
                    <span className="sage-bubble-tail" />
                </div>
            )}

            {/* Radial quick-action ring */}
            {ringOpen && (
                <div className="absolute inset-0" style={{ pointerEvents: 'none' }}>
                    {ringItems.map((item, i) => {
                        const angle = (360 / ringItems.length) * i - 90;
                        const rad = (angle * Math.PI) / 180;
                        const x = SIZE / 2 + ringRadius * Math.cos(rad) - 18;
                        const y = SIZE / 2 + ringRadius * Math.sin(rad) - 18;
                        return (
                            <button
                                key={item.intent}
                                onClick={(e) => { e.stopPropagation(); item.onClick(); }}
                                title={item.label}
                                aria-label={item.label}
                                style={{ left: x, top: y, animationDelay: `${i * 35}ms`, pointerEvents: 'auto' }}
                                className="sage-ring-btn absolute w-9 h-9 rounded-full bg-white dark:bg-gray-900 border border-violet-100 dark:border-violet-800 shadow-lg flex items-center justify-center text-base hover:scale-110 hover:border-violet-300 transition-transform"
                            >
                                {item.emoji}
                            </button>
                        );
                    })}
                </div>
            )}

            <button
                ref={rootRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onClick={handleClick}
                onDoubleClick={handleDoubleClick}
                onContextMenu={handleContextMenu}
                aria-label={ariaLabel}
                title="Sage — click to open, double-click to talk, right-click for quick actions, drag me anywhere"
                style={{ width: SIZE, height: SIZE, touchAction: 'none' }}
                className={`group relative flex items-center justify-center rounded-full text-white cursor-grab active:cursor-grabbing ${listening ? 'sage-listening' : ''} ${hidden ? 'opacity-0' : 'opacity-100'}`}
            >
                <span className="sage-ring text-violet-400" />
                <span className="sage-ring text-violet-300" />
                <span className="sage-ring text-indigo-300" />

                {asleep && !listening && (
                    <span aria-hidden className="absolute inset-0 text-violet-200 text-sm">
                        <span className="sage-z">z</span>
                        <span className="sage-z">z</span>
                        <span className="sage-z">z</span>
                    </span>
                )}

                <span aria-hidden className="absolute right-1 bottom-1 text-violet-300">
                    <span className="sage-mote" />
                    <span className="sage-mote" />
                </span>

                <SageOrb mood={mood} asleep={asleep} dragging={dragging} walking={walking} blink={blink} greet={greet} size={SIZE} grounded />

                <span className={`absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white shadow-sm ${listening ? 'bg-red-500 sage-recdot' : thinking ? 'bg-sky-400' : concerned ? 'bg-orange-400' : asleep ? 'bg-amber-400' : 'bg-emerald-500'}`} />

                {accessory && (
                    <span
                        key={accessory.emoji}
                        title={accessory.label}
                        className="sage-badge absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-white text-[10px] flex items-center justify-center shadow border border-violet-100"
                    >
                        {accessory.emoji}
                    </span>
                )}
            </button>

            {showDock && !hidden && !ringOpen && (
                <button
                    onClick={dock}
                    title="Bring Sage back to the corner"
                    aria-label="Dock Sage to the default corner"
                    className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-gray-900 text-white text-[11px] flex items-center justify-center shadow-md hover:bg-black transition-colors"
                >
                    ⌂
                </button>
            )}
        </div>
    );
}
