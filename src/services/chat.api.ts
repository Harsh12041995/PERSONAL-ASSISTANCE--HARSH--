import { settingsApi } from './personalApi';

const CHAT_STORE_KEY = 'ai_chat_store_v1';

type SenderType = 'user' | 'bot';

interface ChatMessage {
  _id: string;
  content: string;
  sender_type: SenderType;
  sender_id: string;
  conversation_id: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

interface ChatStore {
  conversations: Record<string, ChatMessage[]>;
}

const nowIso = () => new Date().toISOString();
const makeId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const loadStore = (): ChatStore => {
  try {
    const raw = localStorage.getItem(CHAT_STORE_KEY);
    if (!raw) return { conversations: {} };
    const parsed = JSON.parse(raw);
    if (!parsed?.conversations) return { conversations: {} };
    return parsed;
  } catch {
    return { conversations: {} };
  }
};

const saveStore = (store: ChatStore) => {
  localStorage.setItem(CHAT_STORE_KEY, JSON.stringify(store));
};

const systemReply = async (content: string): Promise<string> => {
  const input = content.trim().toLowerCase();
  const settings = await settingsApi.get().catch(() => null as any);
  const displayName = settings?.displayName || 'there';

  if (input.includes('focus') || input.includes('today')) {
    return `Top 3 focus areas for today, ${displayName}:\n\n1. Close one high-impact task before noon.\n2. Review calendar and protect 90 minutes for deep work.\n3. Finish one pending admin item to reduce mental load.`;
  }

  if (input.includes('week') || input.includes('summary')) {
    return `Weekly review template:\n\n- Wins: 3 things that moved your goals\n- Misses: 2 things that slipped\n- Pattern: what distracted you most\n- Next week: one clear priority + one non-negotiable habit`;
  }

  if (input.includes('habit')) {
    return `Habit tune-up:\n\n- Keep one anchor habit in the morning\n- Track only 3 core habits daily\n- Use "minimum version" rules (2 min, 1 rep, 1 note) on low-energy days`;
  }

  if (input.includes('linkedin')) {
    return `LinkedIn draft:\n\nBuilding my personal command center has changed how I execute.\n\nI combined tasks, goals, and notes into one workflow so context switching doesn't kill momentum.\n\nBig lesson: productivity improves when your system is simpler than your ambition.\n\n#buildinpublic #productivity #react`;
  }

  if (input.includes('calendar')) {
    return 'Calendar tip: block focus time first, then place meetings around it. Protect at least one uninterrupted 60-90 minute block daily.';
  }

  return `I can help with planning, prioritization, writing drafts, habit systems, and weekly reviews.\n\nTry: "Plan my day", "Summarize my week", or "Draft a LinkedIn post."`;
};

export const chatApiService = {
  getMessages: async (conversationId: string, _userId: string, page: number, limit: number) => {
    const store = loadStore();
    const all = store.conversations[conversationId] || [];

    // Return latest messages when page=1 in reverse-chronological order (hook reverses it back)
    const sorted = [...all].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    const start = (page - 1) * limit;
    const messages = sorted.slice(start, start + limit);

    return {
      success: true,
      data: {
        messages,
        pagination: {
          page,
          limit,
          total: all.length,
          pages: Math.max(1, Math.ceil(all.length / limit)),
        },
      },
    };
  },

  sendMessage: async (content: string, userId: string, conversationId?: string) => {
    const cid = conversationId || `bot_${userId}`;
    const store = loadStore();
    const current = store.conversations[cid] || [];

    const userMessage: ChatMessage = {
      _id: makeId('usr'),
      content: content.trim(),
      sender_type: 'user',
      sender_id: userId,
      conversation_id: cid,
      createdAt: nowIso(),
    };

    const botText = await systemReply(content);
    const botMessage: ChatMessage = {
      _id: makeId('bot'),
      content: botText,
      sender_type: 'bot',
      sender_id: 'assistant',
      conversation_id: cid,
      createdAt: nowIso(),
      metadata: {
        provider: 'local-preview',
      },
    };

    store.conversations[cid] = [...current, userMessage, botMessage];
    saveStore(store);

    return {
      success: true,
      data: {
        conversation_id: cid,
        user_message: userMessage,
        bot_message: botMessage,
      },
      message: 'Message processed',
    };
  },

  clearConversation: async (conversationId: string) => {
    const store = loadStore();
    delete store.conversations[conversationId];
    saveStore(store);
    return { success: true };
  },
};
