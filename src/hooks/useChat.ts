import { useState, useEffect, useCallback, useRef } from 'react';
import { chatApiService } from '../services/chat.api';
import type { Message, ChatState, ConversationType, Conversation } from '../types/chat.types';

interface UseChatProps {
  userId: string | null;
  isSocketConnected: boolean;
  sendBotMessageViaSocket: (message: string, conversationId?: string, callback?: (response: any) => void) => void;
  sendMessageViaSocket: (conversationId: string, content: string, callback?: (response: any) => void) => void; // NEW
  onNewMessage: (callback: (data: any) => void) => void;
  onUserTyping: (callback: (data: any) => void) => void;
  isWidgetOpen: boolean; // NEW: Track if widget is open
  currentConversation?: Conversation | null; // NEW: Current conversation details
}

interface UseChatReturn {
  messages: Message[];
  conversationId: string | null;
  conversationType: ConversationType; // NEW
  isTyping: boolean;
  isLoading: boolean;
  unreadCount: number; // NEW: Unread message counter
  sendMessage: (content: string) => Promise<void>;
  loadPreviousMessages: () => Promise<void>;
  clearMessages: () => void;
  clearUnreadCount: () => void; // NEW: Clear unread counter
  setConversation: (conversation: Conversation) => void; // NEW: Set active conversation
}

/**
 * Custom hook for chat state and message handling
 * Manages messages, conversation, typing indicators, and sending via Socket.io or REST API
 */
export const useChat = ({
  userId,
  isSocketConnected,
  sendBotMessageViaSocket,
  sendMessageViaSocket, // NEW
  onNewMessage,
  onUserTyping,
  isWidgetOpen, // NEW
  currentConversation, // NEW
}: UseChatProps): UseChatReturn => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationType, setConversationType] = useState<ConversationType>('bot'); // NEW
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedInitialMessages, setHasLoadedInitialMessages] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0); // NEW: Unread counter
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load previous messages when conversation ID is available
  useEffect(() => {
    if (conversationId && !hasLoadedInitialMessages && userId) {
      loadInitialMessages();
    }
  }, [conversationId, userId, hasLoadedInitialMessages]);

  // Listen for new messages via Socket.io
  useEffect(() => {
    if (!isSocketConnected) return;

    const handleNewMessage = (data: any) => {
      const newMessage = data.message;
      
      // Clear typing indicator immediately when ANY message arrives
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      setIsTyping(false);
      
      // Increment unread count for bot messages when widget is closed
      if (newMessage.sender_type === 'bot' && !isWidgetOpen) {
        setUnreadCount((prev) => prev + 1);
      }
      
      // Add message if not already in the list (avoid duplicates)
      setMessages((prev) => {
        const exists = prev.some((msg) => msg._id === newMessage._id);
        if (exists) return prev;
        
        // Remove optimistic message if this is the real version
        // Optimistic messages have temp IDs and matching content
        const withoutOptimistic = prev.filter(msg => {
          // Keep if not temporary
          if (!msg._id.startsWith('temp-')) return true;
          // Remove if same content and sender (this is the optimistic version of the new message)
          if (msg.content === newMessage.content && msg.sender_id === newMessage.sender_id) {
            return false;
          }
          return true;
        });
        
        return [...withoutOptimistic, newMessage];
      });

      // Update conversation ID if not set
      if (!conversationId && data.conversation_id) {
        setConversationId(data.conversation_id);
      }
    };

    const handleUserTyping = (data: any) => {
      // Show typing indicator for bot
      if (data.userId !== userId) {
        setIsTyping(true);
        
        // Auto-hide typing indicator after 3 seconds
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
        }, 3000);
      }
    };

    onNewMessage(handleNewMessage);
    onUserTyping(handleUserTyping);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [isSocketConnected, conversationId, userId, isWidgetOpen, onNewMessage, onUserTyping]);

  // Load initial messages when conversationId changes
  useEffect(() => {
    if (!conversationId || !userId || hasLoadedInitialMessages) return;
    
    // Join the conversation room via socket
    if (isSocketConnected && window.socketService) {
      console.log('🔗 Joining conversation room:', conversationId);
      window.socketService.joinConversation(conversationId);
    }
    
    loadInitialMessages();
  }, [conversationId, userId, hasLoadedInitialMessages, isSocketConnected]);

  /**
   * Clean up: Leave conversation room when unmounting or switching conversations
   */
  useEffect(() => {
    return () => {
      if (conversationId && window.socketService) {
        console.log('👋 Leaving conversation room:', conversationId);
        window.socketService.leaveConversation(conversationId);
      }
    };
  }, [conversationId]);

  /**
   * Load initial messages for existing conversation
   */
  const loadInitialMessages = async () => {
    if (!userId || !conversationId) return;

    setIsLoading(true);
    try {
      const response = await chatApiService.getMessages(conversationId, userId, 1, 50);
      if (response.success) {
        // Messages come in reverse chronological order, reverse them for display
        const loadedMessages = response.data.messages.reverse();
        
        // DEBUG: Check what fields messages have
        console.log('📜 Loaded historical messages:', loadedMessages);
        if (loadedMessages.length > 0) {
          console.log('Sample message fields:', Object.keys(loadedMessages[0]));
          console.log('Current userId:', userId);
        }
        
        setMessages(loadedMessages);
        setHasLoadedInitialMessages(true);
      }
    } catch (error) {
      console.error('Failed to load initial messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Send message via Socket.io (preferred) or REST API (fallback)
   */
  const sendMessage = useCallback(
    async (content: string) => {
      if (!userId || !content.trim()) return;

      // Create optimistic user message
      const optimisticMessage: Message = {
        _id: `temp-${Date.now()}`,
        content: content.trim(),
        sender_type: 'user',
        sender_id: userId,
        conversation_id: conversationId || '',
        createdAt: new Date().toISOString(),
        status: 'sent',
      };

      // Add optimistic message to UI immediately
      setMessages((prev) => [...prev, optimisticMessage]);

      try {
        // ROUTE BASED ON CONVERSATION TYPE
        if (conversationType === 'private' || conversationType === 'group') {
          // USER-TO-USER MESSAGE
          if (!conversationId || !sendMessageViaSocket) {
            console.error('Cannot send user message: missing conversation ID or socket function');
            setMessages((prev) => prev.filter((msg) => msg._id !== optimisticMessage._id));
            return;
          }

          sendMessageViaSocket(conversationId, content.trim(), (response) => {
            console.log('User message response:', response);
            if (!response?.success) {
              console.error('Failed to send user message');
              setMessages((prev) => prev.filter((msg) => msg._id !== optimisticMessage._id));
            }
            // Message will arrive via new_message socket event
          });
          return;
        }

        // BOT MESSAGE (existing logic)
        // Show typing indicator
        setIsTyping(true);
        // Safety timeout: clear typing indicator after 10 seconds max
        const typingTimeout = setTimeout(() => {
          setIsTyping(false);
        }, 10000);

        try {
          if (isSocketConnected) {
            // Send via Socket.io (preferred)
            sendBotMessageViaSocket(content, conversationId || undefined, (response) => {
              clearTimeout(typingTimeout);
              setIsTyping(false); // Clear typing indicator immediately
              
              if (response.success) {
                // Update conversation ID if this is the first message
                if (!conversationId && response.conversation_id) {
                  setConversationId(response.conversation_id);
                }

                // Replace optimistic message with real user message
                setMessages((prev) => {
                  const withoutOptimistic = prev.filter((msg) => msg._id !== optimisticMessage._id);
                  // Add both user message and bot message from response
                  return [...withoutOptimistic, response.user_message, response.bot_message];
                });
              } else {
                console.error('Failed to send message:', response.error);
                
                // Remove optimistic message on failure
                setMessages((prev) => prev.filter((msg) => msg._id !== optimisticMessage._id));
              }
            });
          } else {
            // Fallback to REST API
            const response = await chatApiService.sendMessage(content, userId, conversationId || undefined);

            if (response.success) {
              // Update conversation ID
              if (!conversationId) {
                setConversationId(response.data.conversation_id);
              }

              // Replace optimistic message and add bot response
              setMessages((prev) => {
                const withoutOptimistic = prev.filter((msg) => msg._id !== optimisticMessage._id);
                return [...withoutOptimistic, response.data.user_message, response.data.bot_message];
              });
            }

            setIsTyping(false);
          }
        } catch (error) {
          console.error('Error sending message:', error);
          clearTimeout(typingTimeout);
          setIsTyping(false);
          
          // Remove optimistic message on error
          setMessages((prev) => prev.filter((msg) => msg._id !== optimisticMessage._id));
        }
      } catch (error) {
        console.error('Error in sendMessage:', error);
        setIsTyping(false);
        setMessages((prev) => prev.filter((msg) => msg._id !== optimisticMessage._id));
      }
    },
    [userId, conversationId, conversationType, isSocketConnected, sendBotMessageViaSocket, sendMessageViaSocket]
  );

  /**
   * Load more previous messages (pagination)
   */
  const loadPreviousMessages = useCallback(async () => {
    if (!userId || !conversationId || isLoading) return;

    setIsLoading(true);
    try {
      // Calculate next page based on current message count
      const currentPage = Math.ceil(messages.length / 50) + 1;
      const response = await chatApiService.getMessages(conversationId, userId, currentPage, 50);

      if (response.success && response.data.messages.length > 0) {
        // Prepend older messages
        setMessages((prev) => [...response.data.messages.reverse(), ...prev]);
      }
    } catch (error) {
      console.error('Failed to load previous messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, conversationId, messages.length, isLoading]);

  /**
   * Clear all messages (for testing or reset)
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setIsTyping(false);
    setHasLoadedInitialMessages(false);
  }, []);

  /**
   * Clear unread message counter
   */
  const clearUnreadCount = useCallback(() => {
    setUnreadCount(0);
  }, []);

  /**
   * Set active conversation (for switching between conversations)
   */
  const setConversation = useCallback((conversation: Conversation) => {
    setConversationId(conversation._id);
    setConversationType(conversation.conversation_type);
    setMessages([]); // Clear messages when switching conversations
    setHasLoadedInitialMessages(false);
  }, []);

  return {
    messages,
    conversationId,
    conversationType,
    isTyping,
    isLoading,
    unreadCount,
    sendMessage,
    loadPreviousMessages,
    clearMessages,
    clearUnreadCount,
    setConversation,
  };
};
