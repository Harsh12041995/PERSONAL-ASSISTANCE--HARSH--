import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import SagePersona from './sage/SagePersona';
import SageStudio from './sage/SageStudio';
import type { SageMood, PageAccessory, SageIntent } from './sage/types';

// Sage — the portal's resident assistant. SagePersona is the living,
// movable character; clicking it opens the SageStudio capture studio (voice,
// notes, camera/screen, AI vision, a ledger of everything it did for you).
// This component owns the shared mood state and reacts to which part of the
// portal you're currently in.

const PAGE_ACCESSORY: { match: string; emoji: string; label: string }[] = [
    { match: '/finance', emoji: '💰', label: 'counting coins' },
    { match: '/calendar', emoji: '⏰', label: 'watching the clock' },
    { match: '/health', emoji: '💪', label: 'staying active' },
    { match: '/career', emoji: '💼', label: 'on the clock' },
    { match: '/knowledge', emoji: '📖', label: 'reading up' },
    { match: '/blogs', emoji: '📖', label: 'reading up' },
    { match: '/goals', emoji: '🎯', label: 'aiming high' },
    { match: '/social', emoji: '📱', label: 'staying social' },
    { match: '/agent', emoji: '🧠', label: 'circuits humming' },
    { match: '/ai-chat', emoji: '🧠', label: 'circuits humming' },
    { match: '/portfolio', emoji: '📁', label: 'reviewing projects' },
    { match: '/hq', emoji: '📋', label: 'running HQ' },
    { match: '/personal-tasks', emoji: '✅', label: 'checking tasks' },
    { match: '/workflow-manager', emoji: '⚙️', label: 'tending the workflow' },
];

const GlobalAIHub: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [intent, setIntent] = useState<SageIntent>('default');
    const [mood, setMood] = useState<SageMood>('idle');
    const happyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const location = useLocation();
    const lastPath = useRef(location.pathname);

    // A brief celebration whenever something is saved through Sage.
    const celebrate = useCallback(() => {
        setMood('happy');
        if (happyTimer.current) clearTimeout(happyTimer.current);
        happyTimer.current = setTimeout(() => setMood('idle'), 2600);
    }, []);

    useEffect(() => () => {
        if (happyTimer.current) clearTimeout(happyTimer.current);
        if (noticeTimer.current) clearTimeout(noticeTimer.current);
    }, []);

    const accessory: PageAccessory | null = (() => {
        const hit = PAGE_ACCESSORY.find(p => location.pathname.startsWith(p.match));
        return hit ? { emoji: hit.emoji, label: hit.label } : null;
    })();

    // A quick "noticing the new page" pulse — only when Sage is otherwise idle
    // and the studio is closed, so it never interrupts a real interaction.
    useEffect(() => {
        if (location.pathname === lastPath.current) return;
        lastPath.current = location.pathname;
        if (mood !== 'idle' || isOpen) return;
        setMood('thinking');
        if (noticeTimer.current) clearTimeout(noticeTimer.current);
        noticeTimer.current = setTimeout(() => setMood('idle'), 1100);
        // mood/isOpen are read as guards only; re-running this effect when they
        // change is harmless since the pathname-equality check above bails out.
    }, [location.pathname, mood, isOpen]);

    const handleOpen = useCallback((i: SageIntent = 'default') => {
        setIntent(i);
        setIsOpen(true);
    }, []);

    return (
        <>
            <SagePersona mood={mood} hidden={isOpen} accessory={accessory} onOpen={handleOpen} />

            {isOpen && (
                <SageStudio
                    mood={mood}
                    intent={intent}
                    onClose={() => { setIsOpen(false); setMood('idle'); setIntent('default'); }}
                    onMood={setMood}
                    celebrate={celebrate}
                />
            )}
        </>
    );
};

export default GlobalAIHub;
