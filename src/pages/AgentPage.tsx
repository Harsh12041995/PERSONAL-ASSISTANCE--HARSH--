import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Send,
  Square,
  Bot,
  Wrench,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import PageMeta from "../shared/PageMeta";
import {
  streamAgentChat,
  getAgentHealth,
  type AgentStreamEvent,
} from "../services/agent.api";

type Role = "user" | "assistant";

interface ToolItem {
  name: string;
  args: Record<string, unknown>;
  status: "running" | "ok" | "error";
  data?: unknown;
  error?: string;
}

interface UiMessage {
  id: string;
  role: Role;
  content: string;
  tools: ToolItem[];
  runId?: string;
  latencyMs?: number;
  error?: string;
  streaming?: boolean;
}

const SUGGESTIONS = [
  "Log ₹400 for lunch today",
  "Remind me to call Rohan today",
  "Add an idea: build a habit tracker widget",
  "Add a high-priority task to ship the report",
];

const TOOL_META: Record<string, { icon: string; label: string }> = {
  create_task: { icon: "✅", label: "Create task" },
  log_expense: { icon: "💰", label: "Log transaction" },
  add_capture: { icon: "📝", label: "Add capture" },
};

const toolMeta = (name: string) =>
  TOOL_META[name] ?? { icon: "🔧", label: name.replace(/_/g, " ") };

const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export default function AgentPage() {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [engine, setEngine] = useState<{ reachable: boolean; model: string } | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const history = useMemo(
    () =>
      messages
        .filter((m) => m.content.trim())
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content })),
    [messages],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    getAgentHealth()
      .then(setEngine)
      .catch(() => setEngine({ reachable: false, model: "" }));
  }, []);

  const patchLast = (fn: (m: UiMessage) => UiMessage) =>
    setMessages((prev) => {
      if (!prev.length) return prev;
      const next = [...prev];
      next[next.length - 1] = fn(next[next.length - 1]);
      return next;
    });

  const handleEvent = (e: AgentStreamEvent) => {
    switch (e.type) {
      case "tool_call":
        patchLast((m) => ({
          ...m,
          tools: [...m.tools, { name: e.name, args: e.args, status: "running" }],
        }));
        break;
      case "tool_result":
        patchLast((m) => {
          const tools = [...m.tools];
          // update the latest running tool with this name
          for (let i = tools.length - 1; i >= 0; i--) {
            if (tools[i].name === e.name && tools[i].status === "running") {
              tools[i] = {
                ...tools[i],
                status: e.ok ? "ok" : "error",
                data: e.data,
                error: e.error,
              };
              break;
            }
          }
          return { ...m, tools };
        });
        break;
      case "text":
        patchLast((m) => ({ ...m, content: m.content + e.delta }));
        break;
      case "final":
        patchLast((m) => ({
          ...m,
          content: m.content || e.text,
          runId: e.runId,
          latencyMs: e.latencyMs,
          streaming: false,
        }));
        break;
      case "error":
        patchLast((m) => ({ ...m, error: e.error, streaming: false }));
        break;
      default:
        break;
    }
  };

  const send = async (text: string) => {
    const clean = text.trim();
    if (!clean || isSending) return;

    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "44px";

    const priorHistory = history;
    setMessages((prev) => [
      ...prev,
      { id: uid(), role: "user", content: clean, tools: [] },
      { id: uid(), role: "assistant", content: "", tools: [], streaming: true },
    ]);
    setIsSending(true);

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      await streamAgentChat({
        message: clean,
        history: priorHistory,
        onEvent: handleEvent,
        signal: ac.signal,
      });
      patchLast((m) => ({ ...m, streaming: false }));
    } catch (err) {
      const aborted = ac.signal.aborted;
      patchLast((m) => ({
        ...m,
        streaming: false,
        error: aborted ? undefined : err instanceof Error ? err.message : "Request failed",
        content: aborted && !m.content ? "_Stopped._" : m.content,
      }));
    } finally {
      setIsSending(false);
      abortRef.current = null;
    }
  };

  const stop = () => abortRef.current?.abort();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const autosize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  return (
    <>
      <PageMeta title="AI Agent" description="Your local-first agent that takes action on your data" />
      <div className="mx-auto flex h-[calc(100vh-120px)] max-w-4xl flex-col rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5 dark:border-gray-800 dark:bg-gray-900">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
              <Bot size={20} />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900 dark:text-white">Agent — acts on your data</h1>
              <p className="flex items-center gap-1.5 text-xs text-gray-400">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    engine?.reachable ? "bg-emerald-500" : "bg-gray-300"
                  }`}
                />
                {engine === null
                  ? "Checking engine…"
                  : engine.reachable
                  ? `Local engine online · ${engine.model}`
                  : "Local engine offline (start Ollama)"}
              </p>
            </div>
          </div>
          <Link to="/ai-chat" className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors whitespace-nowrap">
            💬 Just chat →
          </Link>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
                <Bot size={26} />
              </div>
              <p className="max-w-md text-sm text-gray-500 dark:text-gray-400">
                I can act on your data — create tasks, log expenses, and capture ideas.
                Try one of the prompts below, or just tell me what you need.
              </p>
            </div>
          )}

          {messages.map((msg) =>
            msg.role === "user" ? (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-[86%] rounded-2xl rounded-br-sm bg-violet-600 px-4 py-3 text-sm leading-relaxed text-white">
                  {msg.content}
                </div>
              </div>
            ) : (
              <div key={msg.id} className="flex justify-start">
                <div className="max-w-[86%] space-y-2">
                  {/* Tool timeline */}
                  {msg.tools.map((t, i) => (
                    <ToolRow key={i} tool={t} />
                  ))}

                  {/* Answer bubble */}
                  {(msg.content || msg.streaming) && (
                    <div className="whitespace-pre-wrap rounded-2xl rounded-bl-sm border border-gray-100 bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-800 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-100">
                      {msg.content}
                      {msg.streaming && !msg.content && (
                        <span className="inline-flex items-center gap-1 text-gray-400">
                          <Loader2 size={14} className="animate-spin" /> thinking…
                        </span>
                      )}
                    </div>
                  )}

                  {msg.error && (
                    <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                      <AlertCircle size={14} /> {msg.error}
                    </div>
                  )}

                  {msg.latencyMs != null && (
                    <p className="px-1 text-[10px] text-gray-400">
                      {msg.tools.length > 0 && `${msg.tools.length} action${msg.tools.length > 1 ? "s" : ""} · `}
                      {(msg.latencyMs / 1000).toFixed(1)}s
                    </p>
                  )}
                </div>
              </div>
            ),
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        {messages.length === 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Composer */}
        <form onSubmit={onSubmit} className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-800">
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                autosize();
              }}
              onKeyDown={onKeyDown}
              placeholder="Tell the agent what to do…"
              rows={1}
              className="min-h-[44px] max-h-[160px] flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            {isSending ? (
              <button
                type="button"
                onClick={stop}
                className="flex items-center gap-1.5 rounded-xl bg-gray-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-700"
              >
                <Square size={15} /> Stop
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send size={15} /> Send
              </button>
            )}
          </div>
          <p className="mt-2 text-center text-[10px] text-gray-400">
            Runs locally on your machine · Enter to send, Shift+Enter for a new line
          </p>
        </form>
      </div>
    </>
  );
}

function ToolRow({ tool }: { tool: ToolItem }) {
  const meta = toolMeta(tool.name);
  const argText = Object.entries(tool.args || {})
    .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
    .join(" · ");

  return (
    <div className="flex items-start gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2 text-xs dark:border-gray-800 dark:bg-gray-900">
      <span className="text-base leading-none">{meta.icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-200">
          <Wrench size={12} className="text-gray-400" />
          {meta.label}
          {tool.status === "running" && <Loader2 size={12} className="animate-spin text-indigo-500" />}
          {tool.status === "ok" && <CheckCircle2 size={12} className="text-emerald-500" />}
          {tool.status === "error" && <AlertCircle size={12} className="text-red-500" />}
        </div>
        {argText && <p className="mt-0.5 truncate text-gray-400">{argText}</p>}
        {tool.status === "error" && tool.error && (
          <p className="mt-0.5 text-red-500">{tool.error}</p>
        )}
      </div>
    </div>
  );
}
