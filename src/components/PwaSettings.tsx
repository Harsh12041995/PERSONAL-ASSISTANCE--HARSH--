import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { enablePush, disablePush, isSubscribed, isPushSupported, notificationPermission } from '../services/push';
import { pushApi } from '../services/personalApi';

// Chrome fires this before showing its install banner; we stash it to trigger
// installation from our own button.
interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PwaSettings() {
    const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null);
    const [installed, setInstalled] = useState(false);
    const [subscribed, setSubscribed] = useState(false);
    const [busy, setBusy] = useState(false);
    const supported = isPushSupported();

    useEffect(() => {
        const onPrompt = (e: Event) => { e.preventDefault(); setInstallEvt(e as BeforeInstallPromptEvent); };
        const onInstalled = () => { setInstalled(true); setInstallEvt(null); };
        window.addEventListener('beforeinstallprompt', onPrompt);
        window.addEventListener('appinstalled', onInstalled);
        // Already running as an installed app?
        if (window.matchMedia('(display-mode: standalone)').matches) setInstalled(true);
        isSubscribed().then(setSubscribed);
        return () => {
            window.removeEventListener('beforeinstallprompt', onPrompt);
            window.removeEventListener('appinstalled', onInstalled);
        };
    }, []);

    const install = async () => {
        if (!installEvt) return;
        await installEvt.prompt();
        const { outcome } = await installEvt.userChoice;
        if (outcome === 'accepted') setInstalled(true);
        setInstallEvt(null);
    };

    const togglePush = async () => {
        setBusy(true);
        try {
            if (subscribed) {
                await disablePush();
                setSubscribed(false);
                toast.info('Notifications turned off.');
            } else {
                const res = await enablePush();
                if (res.ok) {
                    setSubscribed(true);
                    toast.success('Notifications enabled 🔔');
                } else {
                    const msg: Record<string, string> = {
                        unsupported: 'Your browser doesn’t support push notifications.',
                        'server-not-configured': 'Push isn’t configured on the server yet (set VAPID keys).',
                        denied: 'Notification permission was blocked. Enable it in your browser settings.',
                    };
                    toast.error(msg[res.reason] || 'Could not enable notifications.');
                }
            }
        } finally { setBusy(false); }
    };

    const sendTest = async () => {
        try { await pushApi.test(); toast.success('Test notification sent!'); }
        catch { toast.error('Could not send test (is push configured?).'); }
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <div>
                <h2 className="text-sm font-bold text-gray-800">📱 App & Notifications</h2>
                <p className="text-xs text-gray-400 mt-0.5">Install the portal like a native app and get reminders on your phone.</p>
            </div>

            {/* Install */}
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50">
                <div>
                    <p className="text-sm font-medium text-gray-700">Install app</p>
                    <p className="text-xs text-gray-400">
                        {installed ? 'Installed — launch it from your home screen.'
                            : installEvt ? 'Add the portal to your home screen / desktop.'
                                : 'On iOS: Share → “Add to Home Screen”. On desktop Chrome: the install icon in the address bar.'}
                    </p>
                </div>
                {!installed && installEvt && (
                    <button onClick={install} className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold whitespace-nowrap">
                        Install
                    </button>
                )}
                {installed && <span className="text-xs font-semibold text-emerald-600 whitespace-nowrap">✓ Installed</span>}
            </div>

            {/* Push */}
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50">
                <div>
                    <p className="text-sm font-medium text-gray-700">Push notifications</p>
                    <p className="text-xs text-gray-400">
                        {!supported ? 'Not supported in this browser.'
                            : notificationPermission() === 'denied' ? 'Blocked — allow notifications in browser settings.'
                                : 'Habit nudges, follow-up reminders & your daily brief.'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {subscribed && (
                        <button onClick={sendTest} className="px-3 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-100 whitespace-nowrap">
                            Send test
                        </button>
                    )}
                    <button onClick={togglePush} disabled={busy || !supported}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors disabled:opacity-50
                            ${subscribed ? 'border border-gray-200 text-gray-600 hover:bg-gray-100' : 'bg-violet-600 hover:bg-violet-700 text-white'}`}>
                        {busy ? '…' : subscribed ? 'Turn off' : 'Enable'}
                    </button>
                </div>
            </div>
        </div>
    );
}
