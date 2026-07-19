import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Mic, PenLine, Camera, Monitor, ScrollText, X, Square, Pause, Play,
    Download, Sparkles, Send, ScanEye, CircleDot, Trash2,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { captureApi } from '../../services/personalApi';
import { CAPTURE_TYPES, captureMeta, CaptureType } from '../../constants/capture';
import { aiIntelligence } from '../../services/aiIntelligence';
import { streamAgentChat } from '../../services/agent.api';
import SageOrb from './SageOrb';
import type { SageMood, SageIntent } from './types';

// ─── Types & constants ────────────────────────────────────────────────────────

type Tab = 'talk' | 'note' | 'camera' | 'screen' | 'ledger';

interface LedgerEntry { t: string; icon: string; text: string }

interface SageStudioProps {
    onClose: () => void;
    mood: SageMood;
    /** How the studio was opened — sets the initial tab and can auto-start an action. */
    intent?: SageIntent;
    onMood: (mood: SageMood) => void;
    celebrate: () => void;
}

const INTENT_TAB: Record<SageIntent, Tab> = {
    default: 'talk',
    'talk-record': 'talk',
    note: 'note',
    camera: 'camera',
};

interface SpeechResultEvent {
    results: { length: number;[index: number]: { isFinal: boolean;[index: number]: { transcript: string } | undefined } };
}
interface SpeechErrorEvent { error?: string }
type SpeechRecognitionLike = {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((event: SpeechResultEvent) => void) | null;
    onerror: ((event: SpeechErrorEvent) => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;


const LANGUAGES = [
    { value: 'en-IN', label: 'English (India)' },
    { value: 'en-US', label: 'English (US)' },
    { value: 'hi-IN', label: 'Hindi' },
];

const LEDGER_KEY = 'sage_ledger_v1';
const NOTE_DRAFT_KEY = 'sage_note_draft_v1';
const TALK_DRAFT_KEY = 'sage_talk_draft_v1';

const now = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
const fmtDur = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

const download = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
};

// ─── Shared small UI ──────────────────────────────────────────────────────────

const TypeChips = ({ value, onChange, disabled }: { value: CaptureType; onChange: (t: CaptureType) => void; disabled?: boolean }) => (
    <div className="flex flex-wrap gap-1.5">
        {CAPTURE_TYPES.map(c => (
            <button key={c.type} type="button" disabled={disabled} onClick={() => onChange(c.type)}
                className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors disabled:opacity-50 ${value === c.type
                    ? 'bg-violet-600 border-violet-600 text-white'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-violet-300'}`}>
                {c.emoji} {c.type}
            </button>
        ))}
    </div>
);

const Panel = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 ${className}`}>{children}</div>
);

// ─── The Studio ───────────────────────────────────────────────────────────────

export default function SageStudio({ onClose, mood, intent = 'default', onMood, celebrate }: SageStudioProps) {
    const [tab, setTab] = useState<Tab>(INTENT_TAB[intent]);
    // Consume the auto-start intent once — switching tabs manually afterward
    // shouldn't keep re-triggering "start recording" etc.
    const [autoIntent, setAutoIntent] = useState(intent);
    const [ledger, setLedger] = useState<LedgerEntry[]>(() => {
        try { return JSON.parse(localStorage.getItem(LEDGER_KEY) || '[]'); } catch { return []; }
    });

    // A transient mood (e.g. a hiccup) that reverts to idle a couple seconds
    // later — used for error/thinking blips that shouldn't linger forever.
    const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const flash = useCallback((m: SageMood, revertMs = 2200) => {
        onMood(m);
        if (flashTimer.current) clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => onMood('idle'), revertMs);
    }, [onMood]);
    useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current); }, []);

    const log = useCallback((icon: string, text: string) => {
        setLedger(prev => {
            const next = [{ t: now(), icon, text }, ...prev].slice(0, 60);
            localStorage.setItem(LEDGER_KEY, JSON.stringify(next));
            return next;
        });
    }, []);

    const saveCapture = useCallback(async (type: CaptureType, emoji: string, text: string, label: string) => {
        await captureApi.create({ type, text, emoji });
        toast.success(`${label} saved to your inbox ✓`);
        celebrate();
    }, [celebrate]);

    // Escape closes
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
        { id: 'talk', label: 'Talk', icon: Mic },
        { id: 'note', label: 'Note', icon: PenLine },
        { id: 'camera', label: 'Camera', icon: Camera },
        { id: 'screen', label: 'Screen', icon: Monitor },
        { id: 'ledger', label: 'Ledger', icon: ScrollText },
    ];

    return (
        <>
            <div className="fixed inset-0 bg-black/25 backdrop-blur-[2px] z-[80]" onClick={onClose} />
            <div className="fixed right-0 top-0 h-full w-full max-w-lg z-[81] bg-gray-50 dark:bg-gray-950 border-l border-gray-100 dark:border-gray-800 shadow-2xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
                    <div className="flex items-center gap-2.5">
                        <span className="flex-shrink-0">
                            <SageOrb mood={mood} size={30} />
                        </span>
                        <div>
                            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">Sage — your personal scribe</h2>
                            <p className="text-[11px] text-gray-400 mt-0.5">Speak, write, show — everything worth keeping gets kept.</p>
                        </div>
                    </div>
                    <button onClick={onClose} aria-label="Close Sage"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 px-4 pt-3 pb-2 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => { setTab(t.id); setAutoIntent('default'); }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${tab === t.id
                                ? 'bg-violet-600 text-white'
                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                            <t.icon className="w-3.5 h-3.5" /> {t.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {tab === 'talk' && <TalkTab log={log} onMood={onMood} flash={flash} saveCapture={saveCapture} autoRecord={autoIntent === 'talk-record'} />}
                    {tab === 'note' && <NoteTab log={log} flash={flash} saveCapture={saveCapture} autoFocus={autoIntent === 'note'} />}
                    {tab === 'camera' && <MediaTab kind="camera" log={log} onMood={onMood} flash={flash} saveCapture={saveCapture} autoStart={autoIntent === 'camera'} />}
                    {tab === 'screen' && <MediaTab kind="screen" log={log} onMood={onMood} flash={flash} saveCapture={saveCapture} autoStart={false} />}
                    {tab === 'ledger' && <LedgerTab ledger={ledger} clear={() => { setLedger([]); localStorage.removeItem(LEDGER_KEY); }} />}
                </div>
            </div>
        </>
    );
}

// ─── Talk: live transcription + audio recording + hand-off to the Agent ──────

function TalkTab({ log, onMood, flash, saveCapture, autoRecord }: {
    log: (i: string, t: string) => void; onMood: (m: SageMood) => void; flash: (m: SageMood, ms?: number) => void;
    saveCapture: (t: CaptureType, e: string, x: string, l: string) => Promise<void>; autoRecord?: boolean;
}) {
    const [status, setStatus] = useState<'idle' | 'recording' | 'paused'>('idle');
    const [finalText, setFinalText] = useState(() => localStorage.getItem(TALK_DRAFT_KEY) || '');
    const [interim, setInterim] = useState('');
    const [lang, setLang] = useState('en-IN');
    const [type, setType] = useState<CaptureType>('Idea');
    const [elapsed, setElapsed] = useState(0);
    const [level, setLevel] = useState(0);
    const [error, setError] = useState('');
    const [audioUrl, setAudioUrl] = useState('');
    const [refining, setRefining] = useState(false);
    const [agentAnswer, setAgentAnswer] = useState('');
    const [agentBusy, setAgentBusy] = useState(false);

    const recogRef = useRef<SpeechRecognitionLike | null>(null);
    const stopIntentRef = useRef(false);
    const streamRef = useRef<MediaStream | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const rafRef = useRef<number | null>(null);
    const startRef = useRef(0);
    const abortRef = useRef<AbortController | null>(null);

    const transcript = useMemo(() => `${finalText} ${interim}`.trim(), [finalText, interim]);
    const words = transcript ? transcript.split(/\s+/).filter(Boolean).length : 0;

    useEffect(() => { if (finalText) localStorage.setItem(TALK_DRAFT_KEY, finalText); }, [finalText]);

    const teardown = useCallback(() => {
        stopIntentRef.current = true;
        recogRef.current?.stop();
        if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        audioCtxRef.current?.close().catch(() => undefined);
        audioCtxRef.current = null;
        setLevel(0);
        onMood('idle');
    }, [onMood]);

    useEffect(() => () => { teardown(); abortRef.current?.abort(); }, [teardown]);

    useEffect(() => {
        if (status !== 'recording') return;
        const t = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 400);
        return () => clearInterval(t);
    }, [status]);

    const start = async () => {
        setError('');
        const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
        const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
        if (!Ctor) { setError('Speech recognition needs Chrome or Edge on desktop.'); return; }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // Audio file recording alongside live transcription.
            const rec = new MediaRecorder(stream);
            chunksRef.current = [];
            rec.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data); };
            rec.onstop = () => {
                if (!chunksRef.current.length) return;
                const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
                setAudioUrl(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(blob); });
            };
            rec.start(1000);
            recorderRef.current = rec;

            // Mic level meter.
            const ctx = new AudioContext();
            audioCtxRef.current = ctx;
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 128;
            ctx.createMediaStreamSource(stream).connect(analyser);
            const data = new Uint8Array(analyser.frequencyBinCount);
            const meter = () => {
                analyser.getByteFrequencyData(data);
                setLevel(Math.min(100, Math.round((data.reduce((a, v) => a + v, 0) / data.length / 255) * 160)));
                rafRef.current = requestAnimationFrame(meter);
            };
            meter();

            // Live transcription.
            const recog: SpeechRecognitionLike = new Ctor();
            recog.continuous = true;
            recog.interimResults = true;
            recog.lang = lang;
            recog.onresult = (ev: SpeechResultEvent) => {
                let fin = ''; let mid = '';
                for (let i = 0; i < ev.results.length; i++) {
                    const chunk = ev.results[i][0]?.transcript || '';
                    if (ev.results[i].isFinal) fin += `${chunk} `; else mid += chunk;
                }
                if (fin) setFinalText(prev => `${prev} ${fin}`.replace(/\s+/g, ' ').trimStart());
                setInterim(mid);
            };
            recog.onerror = (ev: SpeechErrorEvent) => setError(`Mic/speech error: ${ev.error || 'unknown'}`);
            recog.onend = () => {
                if (!stopIntentRef.current) { try { recog.start(); } catch { /* browser throttled */ } }
            };
            stopIntentRef.current = false;
            recog.start();
            recogRef.current = recog;

            startRef.current = Date.now();
            setElapsed(0);
            setStatus('recording');
            onMood('listening');
            log('🎙️', 'Started a voice session');
        } catch {
            setError('Microphone unavailable — grant permission and retry.');
            teardown();
            flash('concerned');
        }
    };

    // Opened via the radial ring's "Start talking" action — jump straight into
    // recording. A ref keeps this to exactly one call regardless of re-renders
    // (including React 18 Strict Mode's mount→cleanup→mount in dev).
    const startFnRef = useRef(start);
    startFnRef.current = start;
    useEffect(() => {
        if (!autoRecord) return;
        const t = setTimeout(() => startFnRef.current(), 350);
        return () => clearTimeout(t);
    }, [autoRecord]);

    const stop = (paused: boolean) => {
        teardown();
        setInterim('');
        setStatus(paused ? 'paused' : 'idle');
        if (!paused) log('🎙️', `Voice session ended (${fmtDur(elapsed)}, ${words} words)`);
    };

    const save = async () => {
        if (!finalText.trim()) return;
        try {
            const chip = captureMeta(type);
            await saveCapture(type, chip.emoji, finalText.trim(), 'Transcript');
            log('💾', `Transcript saved as ${type} (${words} words)`);
            setFinalText('');
            localStorage.removeItem(TALK_DRAFT_KEY);
        } catch {
            toast.error("Couldn't save — transcript kept as draft.");
            flash('concerned');
        }
    };

    const refine = async () => {
        if (!finalText.trim()) return;
        setRefining(true);
        onMood('thinking');
        try {
            const refined = await aiIntelligence.refineTranscript(finalText.trim());
            setFinalText(refined);
            log('✨', 'Transcript refined by AI');
            onMood('idle');
        } catch {
            toast.error('Refine failed — is an AI key set in Settings?');
            flash('concerned');
        }
        finally { setRefining(false); }
    };

    const askAgent = async () => {
        if (!finalText.trim() || agentBusy) return;
        setAgentBusy(true);
        setAgentAnswer('');
        onMood('thinking');
        abortRef.current = new AbortController();
        log('🧩', 'Handed transcript to the Personal Agent');
        try {
            await streamAgentChat({
                message: finalText.trim(),
                signal: abortRef.current.signal,
                onEvent: e => {
                    if (e.type === 'text') setAgentAnswer(prev => prev + e.delta);
                    if (e.type === 'final' && e.text) setAgentAnswer(e.text);
                    if (e.type === 'tool_call') setAgentAnswer(prev => `${prev}\n⚙ ${e.name}…\n`);
                    if (e.type === 'error') setAgentAnswer(prev => `${prev}\n⚠ ${e.error}`);
                },
            });
            onMood('idle');
        } catch {
            setAgentAnswer(prev => prev || '⚠ Agent unreachable — start the agent tier (Ollama + backend).');
            flash('concerned');
        } finally { setAgentBusy(false); }
    };

    return (
        <>
            <Panel>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        {status === 'recording' && <span className="w-2.5 h-2.5 rounded-full bg-red-500 sage-recdot" />}
                        <p className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-widest">
                            {status === 'recording' ? 'Listening…' : status === 'paused' ? 'Paused' : 'Ready'}
                        </p>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-gray-400 font-mono">
                        <span>{fmtDur(elapsed)}</span><span>{words} words</span>
                        <select value={lang} onChange={e => setLang(e.target.value)} disabled={status === 'recording'}
                            className="text-[11px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-1.5 py-1 text-gray-600 dark:text-gray-300">
                            {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                        </select>
                    </div>
                </div>

                {/* Equalizer */}
                <div className="sage-eq text-violet-500 mb-3" style={{ ['--lvl' as string]: level }}>
                    {Array.from({ length: 24 }).map((_, i) => <span key={i} />)}
                </div>

                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3 min-h-[110px] max-h-[200px] overflow-y-auto mb-3">
                    <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                        {finalText}
                        {interim && <span className="text-gray-400 italic"> {interim}</span>}
                        {!transcript && <span className="text-gray-400">Press record and just talk — I'll write it down.</span>}
                    </p>
                </div>

                {error && <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/40 rounded-lg px-3 py-2 mb-3">{error}</p>}

                <div className="flex flex-wrap items-center gap-2">
                    {status !== 'recording' ? (
                        <button onClick={start} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors">
                            <Mic className="w-4 h-4" /> {status === 'paused' ? 'Resume' : 'Record'}
                        </button>
                    ) : (
                        <>
                            <button onClick={() => stop(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors">
                                <Pause className="w-4 h-4" /> Pause
                            </button>
                            <button onClick={() => stop(false)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-800 hover:bg-black dark:bg-gray-700 text-white text-sm font-semibold transition-colors">
                                <Square className="w-3.5 h-3.5" /> Stop
                            </button>
                        </>
                    )}
                    {audioUrl && (
                        <a href={audioUrl} download={`sage-audio-${Date.now()}.webm`}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:border-violet-300 transition-colors">
                            <Download className="w-3.5 h-3.5" /> Audio
                        </a>
                    )}
                </div>
            </Panel>

            {finalText.trim() && (
                <Panel>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Keep it</p>
                    <TypeChips value={type} onChange={setType} />
                    <div className="flex flex-wrap gap-2 mt-3">
                        <button onClick={save} className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors">Save to inbox</button>
                        <button onClick={refine} disabled={refining} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 text-sm font-semibold hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-colors disabled:opacity-50">
                            <Sparkles className="w-3.5 h-3.5" /> {refining ? 'Refining…' : 'Refine'}
                        </button>
                        <button onClick={askAgent} disabled={agentBusy} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm font-semibold hover:border-violet-300 transition-colors disabled:opacity-50">
                            <Send className="w-3.5 h-3.5" /> {agentBusy ? 'Sage is acting…' : 'Ask my Agent to act on this'}
                        </button>
                    </div>
                </Panel>
            )}

            {(agentAnswer || agentBusy) && (
                <Panel>
                    <p className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        🧩 Agent {agentBusy && <span className="animate-spin h-3 w-3 border-b-2 border-violet-500 rounded-full inline-block" />}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">{agentAnswer || 'Thinking…'}</p>
                    <Link to="/agent" className="inline-block mt-2 text-xs font-semibold text-violet-600 dark:text-violet-300 hover:underline">Open the full Agent →</Link>
                </Panel>
            )}
        </>
    );
}

// ─── Note: crash-proof quick notes ────────────────────────────────────────────

function NoteTab({ log, flash, saveCapture, autoFocus }: {
    log: (i: string, t: string) => void; flash: (m: SageMood, ms?: number) => void;
    saveCapture: (t: CaptureType, e: string, x: string, l: string) => Promise<void>; autoFocus?: boolean;
}) {
    const [text, setText] = useState(() => localStorage.getItem(NOTE_DRAFT_KEY) || '');
    const [type, setType] = useState<CaptureType>('Idea');
    const [saving, setSaving] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Opened via the radial ring's "Quick note" action — focus immediately.
    useEffect(() => {
        if (autoFocus) textareaRef.current?.focus();
    }, [autoFocus]);

    // Debounced draft — a refresh or crash never loses a word.
    useEffect(() => {
        const t = setTimeout(() => {
            if (text) localStorage.setItem(NOTE_DRAFT_KEY, text);
            else localStorage.removeItem(NOTE_DRAFT_KEY);
        }, 400);
        return () => clearTimeout(t);
    }, [text]);

    const words = text.trim() ? text.trim().split(/\s+/).length : 0;

    const save = async () => {
        if (!text.trim() || saving) return;
        setSaving(true);
        try {
            const chip = captureMeta(type);
            await saveCapture(type, chip.emoji, text.trim(), 'Note');
            log('✍️', `Note saved as ${type} (${words} words)`);
            setText('');
            localStorage.removeItem(NOTE_DRAFT_KEY);
        } catch {
            toast.error("Couldn't save — your note is kept as a draft.");
            flash('concerned');
        }
        finally { setSaving(false); }
    };

    return (
        <Panel>
            <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Scratchpad — autosaves every keystroke</p>
                <span className="text-[11px] text-gray-400 font-mono">{words} words</span>
            </div>
            <textarea ref={textareaRef} value={text} onChange={e => setText(e.target.value)} rows={9}
                placeholder="Write freely. Drafts survive refreshes, crashes, and second thoughts."
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-300 transition-all resize-none mb-3" />
            <TypeChips value={type} onChange={setType} />
            <div className="flex gap-2 mt-3">
                <button onClick={save} disabled={!text.trim() || saving}
                    className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                    {saving ? 'Saving…' : 'Save to inbox'}
                </button>
                <button onClick={() => { setText(''); localStorage.removeItem(NOTE_DRAFT_KEY); }}
                    className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    Clear
                </button>
            </div>
        </Panel>
    );
}

// ─── Camera / Screen: record clips + AI frame analysis ───────────────────────

function MediaTab({ kind, log, onMood, flash, saveCapture, autoStart }: {
    kind: 'camera' | 'screen'; log: (i: string, t: string) => void; onMood: (m: SageMood) => void;
    flash: (m: SageMood, ms?: number) => void;
    saveCapture: (t: CaptureType, e: string, x: string, l: string) => Promise<void>; autoStart?: boolean;
}) {
    const [live, setLive] = useState(false);
    const [recording, setRecording] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [error, setError] = useState('');
    const [snapshot, setSnapshot] = useState('');
    const [analysis, setAnalysis] = useState('');
    const [analyzing, setAnalyzing] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const startRef = useRef(0);

    const icon = kind === 'camera' ? '📷' : '🖥️';
    const noun = kind === 'camera' ? 'Camera' : 'Screen';

    const stopAll = useCallback(() => {
        if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop();
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
        setLive(false);
        setRecording(false);
        onMood('idle');
    }, [onMood]);

    useEffect(() => () => stopAll(), [stopAll]);

    useEffect(() => {
        if (!recording) return;
        const t = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 400);
        return () => clearInterval(t);
    }, [recording]);

    const start = async () => {
        setError('');
        try {
            const stream = kind === 'camera'
                ? await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 } }, audio: true })
                : await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
            streamRef.current = stream;
            if (videoRef.current) videoRef.current.srcObject = stream;
            // If the user stops sharing from the browser UI, follow suit.
            stream.getVideoTracks()[0]?.addEventListener('ended', stopAll);
            setLive(true);
            log(icon, `${noun} preview started`);
        } catch {
            setError(kind === 'camera'
                ? 'Camera unavailable — grant permission and retry.'
                : 'Screen share was declined or is unavailable here.');
            flash('concerned');
        }
    };

    // Opened via the radial ring's "Snapshot" action — start the camera
    // immediately. Ref-guarded so it fires exactly once, Strict Mode included.
    const startFnRef = useRef(start);
    startFnRef.current = start;
    useEffect(() => {
        if (!autoStart) return;
        const t = setTimeout(() => startFnRef.current(), 350);
        return () => clearTimeout(t);
    }, [autoStart]);

    const record = () => {
        const stream = streamRef.current;
        if (!stream) return;
        const rec = new MediaRecorder(stream);
        chunksRef.current = [];
        rec.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data); };
        rec.onstop = () => {
            if (!chunksRef.current.length) return;
            const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'video/webm' });
            download(blob, `sage-${kind}-${Date.now()}.webm`);
            const dur = fmtDur(Math.floor((Date.now() - startRef.current) / 1000));
            log('🎬', `${noun} clip recorded (${dur}) — downloaded to your device`);
            saveCapture('Journal', icon, `${icon} Recorded a ${kind} clip (${dur}) via Sage.`, 'Recording log')
                .catch(() => undefined);
        };
        rec.start(1000);
        recorderRef.current = rec;
        startRef.current = Date.now();
        setElapsed(0);
        setRecording(true);
        onMood('listening');
    };

    const stopRecord = () => {
        recorderRef.current?.stop();
        setRecording(false);
        onMood('idle');
    };

    const takeSnapshot = () => {
        const video = videoRef.current;
        if (!video || !video.videoWidth) return;
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 900 / video.videoWidth);
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
        setSnapshot(canvas.toDataURL('image/jpeg', 0.82));
        setAnalysis('');
        log(icon, `${noun} frame captured`);
    };

    const analyze = async () => {
        if (!snapshot || analyzing) return;
        setAnalyzing(true);
        setAnalysis('');
        onMood('thinking');
        try {
            const result = await aiIntelligence.analyzeImage(
                snapshot, 'image/jpeg',
                kind === 'screen'
                    ? 'This is a screenshot of my screen. Summarize what I am working on and anything notable, in 2-4 concise sentences.'
                    : undefined,
            );
            setAnalysis(result);
            log('🔍', `${noun} frame analyzed by AI`);
            await saveCapture('Journal', '🔍', `🔍 ${noun} frame analysis (via Sage): ${result}`, 'Analysis');
        } catch (err: unknown) {
            const e = err as { response?: { data?: { error?: { message?: string } | string } } };
            const raw = e.response?.data?.error;
            const msg = typeof raw === 'string' ? raw : raw?.message;
            setAnalysis(`⚠ ${msg || 'Analysis needs a Gemini or ChatGPT key in Settings → AI (and a running backend).'}`);
            flash('concerned');
        } finally { setAnalyzing(false); }
    };

    return (
        <>
            <Panel>
                <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-widest flex items-center gap-2">
                        {recording && <span className="w-2.5 h-2.5 rounded-full bg-red-500 sage-recdot" />}
                        {noun} {recording && <span className="font-mono text-red-500">{fmtDur(elapsed)}</span>}
                    </p>
                    {kind === 'screen' && <span className="text-[10px] text-gray-400">record a work session or analyze what's on screen</span>}
                </div>

                <div className="rounded-xl overflow-hidden bg-gray-900 aspect-video mb-3 relative">
                    <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-contain" />
                    {!live && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-2">
                            {kind === 'camera' ? <Camera className="w-8 h-8" /> : <Monitor className="w-8 h-8" />}
                            <p className="text-xs">Preview will appear here</p>
                        </div>
                    )}
                </div>

                {error && <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/40 rounded-lg px-3 py-2 mb-3">{error}</p>}

                <div className="flex flex-wrap gap-2">
                    {!live ? (
                        <button onClick={start} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors">
                            {kind === 'camera' ? <Camera className="w-4 h-4" /> : <Monitor className="w-4 h-4" />} Start {noun.toLowerCase()}
                        </button>
                    ) : (
                        <>
                            {!recording ? (
                                <button onClick={record} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors">
                                    <CircleDot className="w-4 h-4" /> Record
                                </button>
                            ) : (
                                <button onClick={stopRecord} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-800 hover:bg-black dark:bg-gray-700 text-white text-sm font-semibold transition-colors">
                                    <Square className="w-3.5 h-3.5" /> Stop & download
                                </button>
                            )}
                            <button onClick={takeSnapshot} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm font-semibold hover:border-violet-300 transition-colors">
                                <ScanEye className="w-4 h-4" /> Snapshot
                            </button>
                            <button onClick={stopAll} className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <Play className="w-3.5 h-3.5 rotate-90" />
                            </button>
                        </>
                    )}
                </div>
            </Panel>

            {snapshot && (
                <Panel>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Captured frame</p>
                    <img src={snapshot} alt="Captured frame" className="rounded-xl border border-gray-200 dark:border-gray-700 max-h-44 mb-3" />
                    <div className="flex flex-wrap gap-2">
                        <button onClick={analyze} disabled={analyzing}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                            <ScanEye className="w-4 h-4" /> {analyzing ? 'Sage is looking…' : 'Analyze with AI'}
                        </button>
                        <a href={snapshot} download={`sage-frame-${Date.now()}.jpg`}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:border-violet-300 transition-colors">
                            <Download className="w-3.5 h-3.5" /> Save frame
                        </a>
                    </div>
                    {analysis && (
                        <div className="mt-3 rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/50 p-3">
                            <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">{analysis}</p>
                        </div>
                    )}
                </Panel>
            )}
        </>
    );
}

// ─── Ledger: everything Sage did for you ─────────────────────────────────────

function LedgerTab({ ledger, clear }: { ledger: LedgerEntry[]; clear: () => void }) {
    return (
        <Panel>
            <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Sage's ledger — everything gets written down</p>
                {ledger.length > 0 && (
                    <button onClick={clear} className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3 h-3" /> Clear
                    </button>
                )}
            </div>
            {ledger.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                    <p className="text-2xl mb-1">📜</p>
                    <p className="text-xs">Nothing yet. Talk, write, or record — it all lands here.</p>
                </div>
            ) : (
                <ul className="space-y-2 max-h-[430px] overflow-y-auto">
                    {ledger.map((e, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm">
                            <span className="flex-shrink-0">{e.icon}</span>
                            <span className="flex-1 text-gray-700 dark:text-gray-200 leading-snug">{e.text}</span>
                            <span className="text-[10px] text-gray-400 font-mono flex-shrink-0 pt-0.5">{e.t}</span>
                        </li>
                    ))}
                </ul>
            )}
            <p className="text-[11px] text-gray-400 mt-3 leading-relaxed">
                Transcripts, notes, and analyses are also saved to your <Link to="/capture" className="text-violet-600 dark:text-violet-300 font-semibold hover:underline">Capture inbox</Link>. Recordings download to your device.
            </p>
        </Panel>
    );
}
