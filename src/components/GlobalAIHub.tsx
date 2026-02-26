import React, { useState } from 'react';
import VoiceTranscriber from './VoiceTranscriber';

const GlobalAIHub: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* ── Floating Action Button ────────────────────────────────────────── */}
            <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-3">
                {/* Tooltip / Label on hover could be added here */}

                <button
                    onClick={() => setIsOpen(true)}
                    className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-600 text-white shadow-2xl hover:shadow-violet-500/50 transition-all duration-500 hover:scale-110 active:scale-95"
                    title="AI Magic Hub"
                >
                    {/* Pulsing effect */}
                    <span className="absolute inset-0 rounded-full bg-violet-400 animate-ping opacity-20 group-hover:opacity-40 transition-opacity"></span>

                    {/* Glassmorphism overlay */}
                    <span className="absolute inset-0 rounded-full border border-white/20 bg-white/5 backdrop-blur-[2px]"></span>

                    <span className="relative z-10 text-2xl group-hover:rotate-12 transition-transform duration-300">
                        ✨
                    </span>

                    {/* Badge / Status Indicator */}
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-sm"></span>
                </button>
            </div>

            {/* ── Voice Transcriber Modal ─────────────────────────────────────── */}
            {isOpen && <VoiceTranscriber onClose={() => setIsOpen(false)} />}
        </>
    );
};

export default GlobalAIHub;
