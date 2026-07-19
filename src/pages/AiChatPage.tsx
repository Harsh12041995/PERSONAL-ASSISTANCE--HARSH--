import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PageMeta from '../shared/PageMeta';
import { chatApiService } from '../services/chat.api';
import { settingsApi } from '../services/personalApi';

interface Message {
  _id: string;
  sender_type: 'user' | 'bot' | 'system';
  content: string;
  createdAt: string;
}

const SUGGESTIONS = [
  'What should I focus on today?',
  'Summarize my week',
  'What habits should I improve?',
  'Help me plan my calendar',
  'Draft a LinkedIn post',
];

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

export default function AiChatPage() {
  const { user } = useAuth() as any;
  const userId = user?.id || user?._id || null;
  const conversationId = useMemo(() => (userId ? `bot_${userId}` : null), [userId]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [error, setError] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  useEffect(() => {
    settingsApi
      .get()
      .then((s) => setHasApiKey(Boolean(s?.geminiApiKey?.trim() || s?.chatgptApiKey?.trim())))
      .catch(() => setHasApiKey(false));
  }, []);

  useEffect(() => {
    if (!conversationId || !userId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    const load = async () => {
      setIsLoading(true);
      setError('');
      try {
        const res = await chatApiService.getMessages(conversationId, userId, 1, 100);
        // getMessages returns { success:false } on error instead of throwing.
        if (res && res.success === false) {
          setError('Failed to load chat history.');
          return;
        }
        const loaded = [...(res?.data?.messages || [])].sort(
          (a: Message, b: Message) => +new Date(a.createdAt) - +new Date(b.createdAt)
        );
        if (!loaded.length) {
          setMessages([
            {
              _id: 'welcome',
              sender_type: 'bot',
              content:
                "I am your upgraded personal assistant. I can help with planning, execution, writing, and weekly reviews.",
              createdAt: new Date().toISOString(),
            },
          ]);
          return;
        }
        setMessages(loaded as Message[]);
      } catch {
        setError('Failed to load chat history.');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [conversationId, userId]);

  const autosize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const send = async (text: string) => {
    if (!text.trim() || !userId || !conversationId || isSending) return;

    const clean = text.trim();
    setError('');
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = '44px';

    const optimisticUser: Message = {
      _id: `temp_${Date.now()}`,
      sender_type: 'user',
      content: clean,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticUser]);
    setTyping(true);
    setIsSending(true);

    try {
      const res = await chatApiService.sendMessage(clean, userId, conversationId);
      // The service layer swallows HTTP errors into { success:false } rather
      // than throwing — so guard on success + payload shape before rendering,
      // otherwise we'd push blank `undefined` bubbles into the thread.
      const userMsg = res?.data?.user_message as Message | undefined;
      const botMsg = res?.data?.bot_message as Message | undefined;
      if (!res?.success || !userMsg || !botMsg) {
        setMessages((prev) => prev.filter((m) => m._id !== optimisticUser._id));
        setError(res?.error || 'Could not send message. Please try again.');
        return;
      }
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m._id !== optimisticUser._id);
        return [...withoutTemp, userMsg, botMsg];
      });
    } catch {
      setMessages((prev) => prev.filter((m) => m._id !== optimisticUser._id));
      setError('Could not send message. Please try again.');
    } finally {
      setTyping(false);
      setIsSending(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const onInputKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const clearChat = async () => {
    if (!conversationId) return;
    await chatApiService.clearConversation(conversationId);
    setMessages([
      {
        _id: 'welcome_reset',
        sender_type: 'bot',
        content: 'Chat cleared. Start a new conversation anytime.',
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  return (
    <>
      <PageMeta title="AI Assistant" description="Upgraded AI chat for personal productivity" />
      <div className="mx-auto flex h-[calc(100vh-120px)] max-w-4xl flex-col rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 text-xl">🤖</div>
            <div>
              <h1 className="text-sm font-bold text-gray-900">AI Chat — ask &amp; talk</h1>
              <p className="text-xs text-gray-400">
                {hasApiKey ? 'Using your Gemini/ChatGPT key' : 'Using local AI (Ollama) — add a cloud key in Settings for cloud models'}
              </p>
            </div>
          </div>
          <button
            onClick={clearChat}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            Clear chat
          </button>
        </div>

        <Link to="/agent" className="mb-3 flex items-center justify-between rounded-xl bg-violet-50 border border-violet-100 px-3 py-2 text-xs text-violet-700 hover:bg-violet-100 transition-colors">
          <span>💬 This is plain chat — it answers questions. Need it to <b>do</b> things (create tasks, log expenses)?</span>
          <span className="font-semibold whitespace-nowrap">Open Agent →</span>
        </Link>

        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          {isLoading && <p className="text-center text-sm text-gray-400">Loading messages...</p>}
          {!isLoading &&
            messages.map((msg) => (
              <div key={msg._id} className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[86%] ${msg.sender_type === 'user' ? '' : 'mr-auto'}`}>
                  <div
                    className={`whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.sender_type === 'user'
                        ? 'rounded-br-sm bg-violet-600 text-white'
                        : 'rounded-bl-sm border border-gray-100 bg-gray-50 text-gray-800'
                    }`}
                  >
                    {msg.content}
                  </div>
                  <p className="mt-1 px-1 text-[10px] text-gray-400">{fmtTime(msg.createdAt)}</p>
                </div>
              </div>
            ))}

          {typing && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm border border-gray-100 bg-gray-50 px-4 py-3">
                <div className="flex items-center gap-1">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: `${i * 0.12}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => send(suggestion)}
              disabled={isSending}
              className="whitespace-nowrap rounded-xl border border-violet-100 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
        </div>

        {error && <p className="mb-2 text-xs text-red-500">{error}</p>}

        <form onSubmit={onSubmit} className="border-t border-gray-100 pt-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                autosize();
              }}
              onKeyDown={onInputKeyDown}
              placeholder="Ask for planning, writing, priorities, habit review..."
              rows={1}
              className="min-h-[44px] max-h-[160px] flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
            <button
              type="submit"
              disabled={!input.trim() || isSending}
              className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send
            </button>
          </div>
          <p className="mt-2 text-center text-[10px] text-gray-400">Press Enter to send, Shift+Enter for new line</p>
        </form>
      </div>
    </>
  );
}
