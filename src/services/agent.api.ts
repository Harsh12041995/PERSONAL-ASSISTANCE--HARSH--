// src/services/agent.api.ts
// Client for the local-first agent runtime. Chat is streamed over SSE via
// fetch (EventSource can't send the auth header or POST a body). Catalog/runs
// use the shared axios instance.

import { apiBaseUrl } from "../config/environment";
import { authService } from "./authService";
import api from "./axiosInstance";

export type AgentRole = "user" | "assistant";

export interface AgentHistoryItem {
  role: AgentRole;
  content: string;
}

/** Events emitted by POST /agent/chat (SSE). */
export type AgentStreamEvent =
  | { type: "step"; step: number }
  | { type: "tool_call"; name: string; args: Record<string, unknown> }
  | { type: "tool_result"; name: string; ok: boolean; data?: unknown; error?: string }
  | { type: "text"; delta: string }
  | { type: "done"; steps: number }
  | { type: "final"; runId: string; text: string; latencyMs: number }
  | { type: "error"; error: string };

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  destructive?: boolean;
}

export interface StreamParams {
  message: string;
  history?: AgentHistoryItem[];
  conversationId?: string;
  onEvent: (e: AgentStreamEvent) => void;
  signal?: AbortSignal;
}

/**
 * Stream an agent turn. Resolves when the stream ends; rejects on transport
 * error or abort. All progress is delivered through `onEvent`.
 */
export async function streamAgentChat({
  message,
  history,
  conversationId,
  onEvent,
  signal,
}: StreamParams): Promise<void> {
  const token = authService.getToken();
  const res = await fetch(`${apiBaseUrl}/agent/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, history, conversationId }),
    signal,
  });

  if (!res.ok || !res.body) {
    let msg = `Agent request failed (${res.status})`;
    try {
      const j = await res.json();
      msg = j?.error?.message || j?.message || msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by a blank line.
    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      for (const line of frame.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload) continue;
        try {
          onEvent(JSON.parse(payload) as AgentStreamEvent);
        } catch {
          /* skip malformed frame */
        }
      }
    }
  }
}

/** The registered tool catalog (for display in the UI). */
export async function getAgentTools(): Promise<AgentTool[]> {
  const res = await api.get("/agent/tools");
  return res.data?.data ?? [];
}

export interface AgentRunSummary {
  _id: string;
  input: string;
  output: string;
  status: "running" | "completed" | "error";
  steps: number;
  latencyMs?: number;
  createdAt: string;
}

export async function getAgentRuns(): Promise<AgentRunSummary[]> {
  const res = await api.get("/agent/runs");
  return res.data?.data ?? [];
}

/** Whether the local Ollama engine is reachable. */
export async function getAgentHealth(): Promise<{ reachable: boolean; model: string }> {
  const res = await api.get("/agent/health");
  const d = res.data?.data ?? {};
  return { reachable: !!d.reachable, model: d.model ?? "" };
}
