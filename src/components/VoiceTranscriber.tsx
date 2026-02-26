import React, { useEffect, useMemo, useRef, useState } from 'react';
import { aiIntelligence } from '../services/aiIntelligence';
import { captureApi, ICapture } from '../services/personalApi';

interface VoiceTranscriberProps {
    onClose: () => void;
    initialType?: ICapture['type'];
}

type RecognitionStatus = 'idle' | 'recording' | 'paused' | 'saving' | 'saved';

type SpeechRecognitionLike = {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((event: any) => void) | null;
    onerror: ((event: any) => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
};

const CATEGORIES: { type: ICapture['type']; emoji: string; color: string }[] = [
    { type: 'Idea', emoji: '💡', color: 'bg-amber-100 text-amber-700' },
    { type: 'Task', emoji: '✅', color: 'bg-emerald-100 text-emerald-700' },
    { type: 'Journal', emoji: '📓', color: 'bg-violet-100 text-violet-700' },
    { type: 'Follow-up', emoji: '📞', color: 'bg-sky-100 text-sky-700' },
    { type: 'Money', emoji: '💰', color: 'bg-green-100 text-green-700' },
];

const LANGUAGES = [
    { value: 'en-US', label: 'English (US)' },
    { value: 'en-IN', label: 'English (India)' },
    { value: 'hi-IN', label: 'Hindi (India)' },
];

const DRAFT_KEY = 'voice_capture_draft_v1';

const VoiceTranscriber: React.FC<VoiceTranscriberProps> = ({ onClose, initialType = 'Idea' }) => {
    const [status, setStatus] = useState<RecognitionStatus>('idle');
    const [selectedType, setSelectedType] = useState<ICapture['type']>(initialType);
    const [selectedLanguage, setSelectedLanguage] = useState('en-US');
    const [finalTranscript, setFinalTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [isRefining, setIsRefining] = useState(false);
    const [error, setError] = useState('');
    const [savedCapture, setSavedCapture] = useState<ICapture | null>(null);
    const [elapsedSec, setElapsedSec] = useState(0);
    const [audioLevel, setAudioLevel] = useState(0);

    const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
    const manuallyStoppedRef = useRef(false);
    const startAtRef = useRef<number | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const levelRafRef = useRef<number | null>(null);

    const transcript = useMemo(() => `${finalTranscript}${interimTranscript}`.trim(), [finalTranscript, interimTranscript]);
    const wordCount = useMemo(() => (transcript ? transcript.split(/\s+/).filter(Boolean).length : 0), [transcript]);

    useEffect(() => {
        const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognitionCtor) {
            setError('Speech Recognition is not supported in this browser. Use Chrome/Edge desktop.');
            return;
        }

        const recognition: SpeechRecognitionLike = new SpeechRecognitionCtor();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = selectedLanguage;

        recognition.onresult = (event: any) => {
            let nextFinal = '';
            let nextInterim = '';

            for (let i = 0; i < event.results.length; i++) {
                const chunk = event.results[i][0]?.transcript || '';
                if (event.results[i].isFinal) {
                    nextFinal += `${chunk} `;
                } else {
                    nextInterim += chunk;
                }
            }

            setFinalTranscript(nextFinal.trim());
            setInterimTranscript(nextInterim);
        };

        recognition.onerror = (event: any) => {
            setError(`Microphone/Speech error: ${event.error || 'unknown'}`);
            setStatus('idle');
        };

        recognition.onend = () => {
            if (manuallyStoppedRef.current) {
                manuallyStoppedRef.current = false;
                return;
            }
            if (status === 'recording') {
                try {
                    recognition.start();
                } catch {
                    setStatus('idle');
                }
            }
        };

        recognitionRef.current = recognition;

        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) {
            try {
                const draft = JSON.parse(raw);
                if (draft?.transcript) {
                    setFinalTranscript(draft.transcript);
                }
                if (draft?.type) {
                    setSelectedType(draft.type);
                }
            } catch {
                // Ignore invalid draft data
            }
        }

        return () => {
            manuallyStoppedRef.current = true;
            recognitionRef.current?.stop();
            if (levelRafRef.current) cancelAnimationFrame(levelRafRef.current);
            streamRef.current?.getTracks().forEach((t) => t.stop());
            audioCtxRef.current?.close().catch(() => undefined);
        };
    }, []);

    useEffect(() => {
        if (recognitionRef.current) {
            recognitionRef.current.lang = selectedLanguage;
        }
    }, [selectedLanguage]);

    useEffect(() => {
        if (status !== 'recording') return;
        const timer = setInterval(() => {
            if (!startAtRef.current) return;
            setElapsedSec(Math.floor((Date.now() - startAtRef.current) / 1000));
        }, 250);
        return () => clearInterval(timer);
    }, [status]);

    useEffect(() => {
        if (!transcript) return;
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ transcript, type: selectedType, updatedAt: new Date().toISOString() }));
    }, [transcript, selectedType]);

    const startAudioMeter = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const audioCtx = new AudioContext();
            audioCtxRef.current = audioCtx;

            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            analyserRef.current = analyser;
            source.connect(analyser);

            const data = new Uint8Array(analyser.frequencyBinCount);
            const measure = () => {
                if (!analyserRef.current || status !== 'recording') return;
                analyserRef.current.getByteFrequencyData(data);
                const sum = data.reduce((acc, v) => acc + v, 0);
                const avg = sum / data.length;
                setAudioLevel(Math.min(100, Math.round((avg / 255) * 100)));
                levelRafRef.current = requestAnimationFrame(measure);
            };
            measure();
        } catch {
            setAudioLevel(0);
        }
    };

    const startRecording = async () => {
        setError('');
        setSavedCapture(null);
        setInterimTranscript('');
        if (!finalTranscript.trim()) {
            setFinalTranscript('');
        }
        setElapsedSec(0);
        startAtRef.current = Date.now();

        try {
            recognitionRef.current?.start();
            setStatus('recording');
            await startAudioMeter();
        } catch {
            setError('Unable to start recording. Grant microphone permission and retry.');
            setStatus('idle');
        }
    };

    const pauseRecording = () => {
        manuallyStoppedRef.current = true;
        recognitionRef.current?.stop();
        setStatus('paused');
        setInterimTranscript('');
        if (levelRafRef.current) cancelAnimationFrame(levelRafRef.current);
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setAudioLevel(0);
    };

    const stopRecordingAndSave = async () => {
        manuallyStoppedRef.current = true;
        recognitionRef.current?.stop();
        setInterimTranscript('');
        if (levelRafRef.current) cancelAnimationFrame(levelRafRef.current);
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setAudioLevel(0);

        if (!finalTranscript.trim()) {
            setStatus('idle');
            return;
        }

        setStatus('saving');
        try {
            const typeConf = CATEGORIES.find((c) => c.type === selectedType) || CATEGORIES[0];
            const newCapture = await captureApi.create({
                type: selectedType,
                text: finalTranscript.trim(),
                rawText: finalTranscript.trim(),
                emoji: typeConf.emoji,
                isRefined: false,
            });
            setSavedCapture(newCapture);
            setStatus('saved');
            localStorage.removeItem(DRAFT_KEY);
        } catch {
            setError('Failed to save voice capture. Transcript is still available in draft.');
            setStatus('paused');
        }
    };

    const handleRefine = async () => {
        if (!savedCapture || !finalTranscript.trim()) return;
        setIsRefining(true);
        try {
            const refined = await aiIntelligence.refineTranscript(finalTranscript.trim());
            const updated = await captureApi.update(savedCapture._id, {
                text: refined,
                isRefined: true,
            });
            setSavedCapture(updated);
            setFinalTranscript(refined);
            setInterimTranscript('');
        } catch {
            setError('AI refinement failed. Raw transcript remains saved.');
        } finally {
            setIsRefining(false);
        }
    };

    const clearDraft = () => {
        setFinalTranscript('');
        setInterimTranscript('');
        setSavedCapture(null);
        setStatus('idle');
        localStorage.removeItem(DRAFT_KEY);
    };

    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100">
                <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-6 text-white">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">Voice Capture</h2>
                            <p className="text-violet-100/90 text-sm mt-1">Record, pause, resume, auto-save raw transcript, then refine with AI.</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-5">
                    <div className="flex flex-wrap gap-2 items-center">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat.type}
                                onClick={() => setSelectedType(cat.type)}
                                disabled={status === 'recording' || status === 'saving'}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${selectedType === cat.type ? `${cat.color} border-current` : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                            >
                                {cat.emoji} {cat.type}
                            </button>
                        ))}
                        <div className="ml-auto flex items-center gap-2">
                            <label className="text-xs font-semibold text-slate-500">Language</label>
                            <select
                                value={selectedLanguage}
                                onChange={(e) => setSelectedLanguage(e.target.value)}
                                disabled={status === 'recording' || status === 'saving'}
                                className="text-xs rounded-lg border border-slate-200 px-2 py-1.5 bg-white"
                            >
                                {LANGUAGES.map((lang) => (
                                    <option key={lang.value} value={lang.value}>{lang.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                            <p className="text-[11px] uppercase text-slate-400 font-bold">Status</p>
                            <p className="text-sm font-semibold text-slate-700">{status}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                            <p className="text-[11px] uppercase text-slate-400 font-bold">Duration</p>
                            <p className="text-sm font-semibold text-slate-700">{formatDuration(elapsedSec)}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                            <p className="text-[11px] uppercase text-slate-400 font-bold">Words</p>
                            <p className="text-sm font-semibold text-slate-700">{wordCount}</p>
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-bold text-slate-500">Mic Level</p>
                            <p className="text-xs text-slate-400">{audioLevel}%</p>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full bg-violet-500 transition-all" style={{ width: `${audioLevel}%` }} />
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 min-h-[160px] max-h-[260px] overflow-y-auto">
                        <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                            {transcript || <span className="text-slate-400">Start recording to generate transcript...</span>}
                        </p>
                    </div>

                    {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

                    <div className="flex flex-wrap gap-2">
                        {status === 'idle' || status === 'paused' ? (
                            <button onClick={startRecording} className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700">
                                {status === 'paused' ? 'Resume' : 'Start Recording'}
                            </button>
                        ) : null}

                        {status === 'recording' ? (
                            <>
                                <button onClick={pauseRecording} className="px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600">Pause</button>
                                <button onClick={stopRecordingAndSave} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700">Stop & Save</button>
                            </>
                        ) : null}

                        {status === 'saved' && savedCapture && !savedCapture.isRefined ? (
                            <button onClick={handleRefine} disabled={isRefining} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60">
                                {isRefining ? 'Refining...' : 'Enhance with AI'}
                            </button>
                        ) : null}

                        <button onClick={clearDraft} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm font-semibold hover:bg-slate-200">Clear</button>
                        <button
                            onClick={async () => {
                                if (!transcript) return;
                                try {
                                    await navigator.clipboard.writeText(transcript);
                                    setError('');
                                } catch {
                                    setError('Copy failed.');
                                }
                            }}
                            className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm font-semibold hover:bg-slate-200"
                        >
                            Copy Text
                        </button>
                        <button onClick={onClose} className="ml-auto px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-black">Close</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VoiceTranscriber;
