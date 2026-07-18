import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PenLine, Feather, X, QrCode as QrCodeIcon, Copy, Check } from 'lucide-react';
import QRCode from 'qrcode';
import { toast } from 'react-toastify';
import { captureApi, ICapture } from '../services/personalApi';
import { useTheme } from '../context/ThemeContext';

// Replaces the old third-party "Support" widget slot with something you'll
// actually use: instant capture, quick-action shortcuts, and a mobile bridge —
// scan the QR to open this same portal on your phone (sign in once there and
// everything you capture stays in sync, since it's the same account).

type CaptureType = ICapture['type'];

const TYPES: { type: CaptureType; emoji: string; label: string }[] = [
    { type: 'Idea', emoji: '💡', label: 'Idea' },
    { type: 'Task', emoji: '✅', label: 'Task' },
    { type: 'Journal', emoji: '📓', label: 'Journal' },
    { type: 'Follow-up', emoji: '📞', label: 'Follow-up' },
    { type: 'Money', emoji: '💰', label: 'Money' },
    { type: 'Urgent', emoji: '🔴', label: 'Urgent' },
];

const QUICK_ACTIONS = [
    { label: 'New Task', emoji: '✅', path: '/personal-tasks' },
    { label: 'Log Expense', emoji: '💰', path: '/finance' },
    { label: 'New Event', emoji: '📅', path: '/calendar' },
    { label: 'Full Capture', emoji: '📝', path: '/capture' },
];

export default function QuickNotesPen() {
    const { skin } = useTheme();
    const [open, setOpen] = useState(false);
    const [text, setText] = useState('');
    const [type, setType] = useState<CaptureType>('Idea');
    const [saving, setSaving] = useState(false);
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [copied, setCopied] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Generate the mobile-bridge QR client-side only — no third-party network call,
    // no image ever leaves this device. Re-tint it when the skin changes.
    useEffect(() => {
        if (!open) return;
        QRCode.toDataURL(window.location.origin, {
            width: 168,
            margin: 1,
            color: { dark: skin === 'book' ? '#3a2e1f' : '#4c1d95', light: '#0000' },
        }).then(setQrDataUrl).catch(() => setQrDataUrl(''));
    }, [open, skin]);

    useEffect(() => {
        if (open) setTimeout(() => textareaRef.current?.focus(), 200);
    }, [open]);

    // Close on outside click or Escape.
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        const onClick = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('keydown', onKey);
        document.addEventListener('mousedown', onClick);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('mousedown', onClick);
        };
    }, [open]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim() || saving) return;
        setSaving(true);
        const tc = TYPES.find(t => t.type === type)!;
        try {
            await captureApi.create({ type, text: text.trim(), emoji: tc.emoji });
            toast.success(`Saved to ${tc.label} ✓`);
            setText('');
        } catch {
            toast.error("Couldn't save — please try again.");
        } finally {
            setSaving(false);
        }
    };

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.origin);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            toast.error('Clipboard unavailable — copy the URL from your address bar.');
        }
    };

    const PenIcon = skin === 'book' ? Feather : PenLine;

    return (
        <>
            {/* Edge tab */}
            <button
                onClick={() => setOpen(o => !o)}
                aria-label={open ? 'Close notebook' : 'Open notebook'}
                title="Notebook — quick capture"
                className={`fixed right-0 bottom-[150px] z-[70] flex flex-col items-center gap-1.5 py-4 px-2 rounded-l-2xl border border-r-0 border-white/10 shadow-lg transition-all duration-300 bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-600 text-white hover:pr-3 hover:shadow-violet-500/40 ${open ? 'translate-x-full opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'
                    }`}
            >
                <PenIcon className="w-5 h-5" />
                <span className="text-[10px] font-semibold tracking-widest [writing-mode:vertical-rl] rotate-180">NOTES</span>
            </button>

            {/* Backdrop */}
            {open && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-[70]"
                    onClick={() => setOpen(false)}
                />
            )}

            {/* Sliding panel */}
            <div
                ref={panelRef}
                className={`fixed right-0 top-0 h-full w-full max-w-sm z-[71] bg-white dark:bg-gray-900 border-l border-gray-100 dark:border-gray-800 shadow-2xl transition-transform duration-300 ease-out flex flex-col ${open ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <PenIcon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                        <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">Notebook</h2>
                    </div>
                    <button
                        onClick={() => setOpen(false)}
                        aria-label="Close"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
                    {/* Quick capture */}
                    <form onSubmit={handleSave} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Jot it down</p>
                        <textarea
                            ref={textareaRef}
                            value={text}
                            onChange={e => setText(e.target.value)}
                            placeholder="Whatever's on your mind..."
                            rows={3}
                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 transition-all resize-none"
                        />
                        <div className="flex flex-wrap gap-1.5 mt-3">
                            {TYPES.map(t => (
                                <button
                                    key={t.type}
                                    type="button"
                                    onClick={() => setType(t.type)}
                                    className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${type === t.type
                                        ? 'bg-violet-600 border-violet-600 text-white'
                                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-violet-300 dark:hover:border-violet-700'
                                        }`}
                                >
                                    {t.emoji} {t.label}
                                </button>
                            ))}
                        </div>
                        <button
                            type="submit"
                            disabled={!text.trim() || saving}
                            className="w-full mt-3 py-2.5 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-50"
                        >
                            {saving ? 'Saving…' : 'Save to Notebook'}
                        </button>
                    </form>

                    {/* Quick actions */}
                    <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Quick actions</p>
                        <div className="grid grid-cols-2 gap-2">
                            {QUICK_ACTIONS.map(a => (
                                <Link
                                    key={a.path}
                                    to={a.path}
                                    onClick={() => setOpen(false)}
                                    className="flex items-center gap-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:border-violet-200 dark:hover:border-violet-800 hover:shadow-sm transition-all"
                                >
                                    <span>{a.emoji}</span>{a.label}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Mobile bridge */}
                    <div className="bg-gradient-to-br from-indigo-50/50 to-violet-50/50 dark:from-indigo-950/30 dark:to-violet-950/30 rounded-2xl border border-violet-100 dark:border-violet-900/50 p-4">
                        <p className="text-[10px] font-semibold text-violet-700 dark:text-violet-300 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            <QrCodeIcon className="w-3.5 h-3.5" /> Continue on your phone
                        </p>
                        <div className="flex items-center gap-3">
                            {qrDataUrl ? (
                                <img
                                    src={qrDataUrl}
                                    alt="Scan to open this portal on your phone"
                                    className="w-20 h-20 rounded-lg bg-white p-1 border border-violet-100 flex-shrink-0"
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-lg bg-white/60 border border-violet-100 animate-pulse flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-indigo-900/80 dark:text-indigo-200/90 leading-relaxed">
                                    Scan to open this portal on your phone. Sign in once — everything you capture stays in sync.
                                </p>
                                <button
                                    type="button"
                                    onClick={copyLink}
                                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 dark:text-violet-300 hover:text-violet-700 dark:hover:text-violet-200 transition-colors"
                                >
                                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                    {copied ? 'Copied!' : 'Copy link'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
