export const chatApiService = {
    getMessages: async (_conversationId: string, _userId: string, _page: number, _limit: number) => {
        return { success: true, data: { messages: [] } };
    },
    sendMessage: async (_content: string, _userId: string, _conversationId?: string) => {
        const msg = { _id: 'new', content: _content, sender_type: 'bot', sender_id: 'bot', conversation_id: 'new', createdAt: new Date().toISOString() };
        return { success: true, data: { conversation_id: 'new', user_message: { ...msg, sender_type: 'user' }, bot_message: msg } };
    }
};
