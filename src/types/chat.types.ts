export type SenderType = 'user' | 'bot' | 'system';

export type ConversationType = 'private' | 'group' | 'bot';

export type MessageStatus = 'sent' | 'delivered' | 'read';

// User interface for participants and user search
export interface User {
  _id: string;
  first_name: string; // API returns first_name
  last_name: string; // API returns last_name
  name?: string; // Computed field for convenience
  email: string;
  username?: string;
  phone?: string;
  avatar?: string;
  online?: boolean;
  status?: string;
}

export interface Message {
  _id: string;
  content: string;
  sender_type: SenderType;
  sender_id?: string;
  sender_name?: string; // NEW: For displaying user names
  sender_avatar?: string; // NEW: For displaying user avatars
  conversation_id: string;
  createdAt: string;
  updatedAt?: string;
  status?: MessageStatus; // NEW: Message delivery/read status
  metadata?: {
    provider?: string;
    [key: string]: any;
  };
  read_by?: string[];
  delivered_to?: string[];
}

export interface Conversation {
  _id: string;
  participants: string[];
  participant_details?: User[]; // NEW: Full participant information
  conversation_type: ConversationType;
  title?: string; // NEW: For group chat names
  last_message?: Message;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface SendMessagePayload {
  message: string;
  conversation_id?: string;
}

// NEW: Payload for creating conversations
export interface CreateConversationPayload {
  participant_ids: string[];
  conversation_type: 'private' | 'group';
  title?: string; // Required for group, optional for private
}

// NEW: Response for creating conversations
export interface CreateConversationResponse {
  success: boolean;
  data: {
    conversation_id: string;
    conversation: Conversation;
  };
  message?: string;
}

export interface SendMessageResponse {
  success: boolean;
  data: {
    conversation_id: string;
    user_message: Message;
    bot_message: Message;
  };
  message?: string;
}

export interface ConversationsResponse {
  success: boolean;
  data: {
    conversations: Conversation[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export interface MessagesResponse {
  success: boolean;
  data: {
    messages: Message[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

// NEW: Response for user search/list
export interface UsersResponse {
  success: boolean;
  data: {
    users: User[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export interface SocketConnectedData {
  socketId: string;
  userId: string;
}

export interface SocketNewMessageData {
  message: Message;
  conversation_id: string;
}

export interface SocketTypingData {
  userId: string;
  conversation_id: string;
}

export interface ChatState {
  messages: Message[];
  conversationId: string | null;
  isConnected: boolean;
  isTyping: boolean;
  isLoading: boolean;
}

export interface SocketConfig {
  url: string;
  userId: string;
  transports?: ('websocket' | 'polling')[];
}
