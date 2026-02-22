import { useState, useRef, useEffect } from 'react';

interface Message {
    id: string;
    role: 'user' | 'ai';
    text: string;
    time: string;
}

const SUGGESTIONS = [
    "What should I focus on today?",
    "Summarize my week",
    "What habits am I missing?",
    "Give me a motivational quote",
    "Help me write a LinkedIn post",
];

const AI_REPLIES: Record<string, string> = {
    default: "I'm your personal AI assistant! Connect an OpenAI or Gemini API key in Settings to unlock real AI responses. For now, I'm showing you a preview of how I'll work.",
    "What should I focus on today?": "Based on your tasks and goals, I'd suggest:\n\n1. 🎯 Complete Phase 1 of your personal assistant app — you're at 65%!\n2. 📞 Follow up with Rahul on the startup partnership\n3. 💰 Log today's expenses\n\nYou've got this! 💪",
    "Summarize my week": "Here's your week recap:\n\n✅ Tasks: 8 completed, 4 pending\n💪 Habits: 62% streak maintained\n💰 Spent: ₹4,520 (under budget!)\n🎯 Goals: Career goal progressed by 15%\n\nOverall: Great momentum! Keep pushing on health habits.",
    "What habits am I missing?": "Looking at your tracker:\n\n❌ Meditation — only 2/5 days\n❌ Journaling — 0/5 days this week\n✅ Workout — 4/7 days (good!)\n\nI'd suggest starting with just 5 minutes of journaling tonight. Small steps!",
    "Give me a motivational quote": '"You don\'t rise to the level of your goals, you fall to the level of your systems."\n\n— James Clear, Atomic Habits\n\nPerfect for today since you\'re building systems for yourself! 🔥',
    "Help me write a LinkedIn post": "Here's a draft:\n\n🚀 Building my own Personal Assistant app!\n\nTired of juggling 5 different apps for tasks, finance, habits, and notes — so I built one.\n\nFeatures I've shipped so far:\n✅ Universal Capture\n💰 Finance Tracker\n💪 Habit Grid\n🎯 Goals with milestones\n\nBuilding in public — follow along for updates!\n\n#buildinpublic #react #productivity",
};

function getTimeStr() {
    return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function AiChatPage() {
    const [messages, setMessages] = useState<Message[]>([
        { id: '0', role: 'ai', text: "Hey Harsh! 👋 I'm your personal AI assistant. I know about your tasks, goals, habits, and captures.\n\nTry asking me something or pick a suggestion below!", time: getTimeStr() },
    ]);
    const [input, setInput] = useState('');
    const [typing, setTyping] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, typing]);

    const send = (text: string) => {
        if (!text.trim()) return;
        const userMsg: Message = { id: Date.now().toString(), role: 'user', text, time: getTimeStr() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setTyping(true);
        setTimeout(() => {
            const reply = AI_REPLIES[text] || AI_REPLIES.default;
            const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'ai', text: reply, time: getTimeStr() };
            setMessages(prev => [...prev, aiMsg]);
            setTyping(false);
        }, 1000 + Math.random() * 800);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-120px)] max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center text-xl">🤖</div>
                <div>
                    <h1 className="text-sm font-bold text-gray-900">AI Personal Assistant</h1>
                    <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                        <span className="text-xs text-gray-400">Preview mode — connect API key for real AI</span>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'ai' && (
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-1">🤖</div>
                        )}
                        <div className={`max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                            <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user'
                                    ? 'bg-violet-600 text-white rounded-br-sm'
                                    : 'bg-white border border-gray-100 shadow-sm text-gray-800 rounded-bl-sm'
                                }`}>
                                {msg.text}
                            </div>
                            <span className="text-[10px] text-gray-400 mt-1 px-1">{msg.time}</span>
                        </div>
                    </div>
                ))}
                {typing && (
                    <div className="flex items-start gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center text-sm">🤖</div>
                        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
                            {[0, 1, 2].map(i => <span key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Suggestions */}
            <div className="flex gap-2 pb-3 overflow-x-auto no-scrollbar">
                {SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => send(s)}
                        className="flex-shrink-0 px-3 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-xl text-xs font-medium border border-violet-100 transition-colors whitespace-nowrap">
                        {s}
                    </button>
                ))}
            </div>

            {/* Input */}
            <div className="border-t border-gray-100 pt-3">
                <form onSubmit={e => { e.preventDefault(); send(input); }} className="flex gap-2">
                    <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Ask me anything about your day, tasks, goals..."
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400"
                    />
                    <button type="submit" disabled={!input.trim() || typing}
                        className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white rounded-xl text-sm font-semibold transition-colors">
                        Send
                    </button>
                </form>
                <p className="text-[10px] text-gray-400 mt-2 text-center">
                    Add OpenAI / Gemini API key in ⚙️ Settings to enable real AI responses
                </p>
            </div>
        </div>
    );
}
