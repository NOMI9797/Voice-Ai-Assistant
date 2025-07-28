import { getChatManager } from '@/lib/database/mongoChatManager';
import { ChatMessage } from '@/lib/database/mongoChatManager';

export interface ConversationMemory {
  conversationId: string;
  messages: ChatMessage[];
  formattedHistory: string;
}

export class ConversationMemoryManager {
  private chatManager = getChatManager();

  /**
   * Load conversation history from MongoDB and format it for LLM context
   */
  async loadConversationMemory(conversationId: string): Promise<ConversationMemory | null> {
    try {
      if (!this.chatManager.isReady()) {
        console.warn('Chat manager not ready, cannot load conversation memory');
        return null;
      }

      const session = await this.chatManager.getChatSession(conversationId);
      if (!session) {
        console.log(`No conversation found for ID: ${conversationId}`);
        return null;
      }

      // Format conversation history for LLM context
      const formattedHistory = this.formatConversationHistory(session.messages);

      return {
        conversationId,
        messages: session.messages,
        formattedHistory
      };
    } catch (error) {
      console.error('Failed to load conversation memory:', error);
      return null;
    }
  }

  /**
   * Format conversation messages into a string for LLM context
   */
  private formatConversationHistory(messages: ChatMessage[]): string {
    if (messages.length === 0) {
      return '';
    }

    const formattedMessages = messages.map((message, index) => {
      const role = message.role === 'user' ? 'User' : 'Assistant';
      const timestamp = new Date(message.timestamp).toLocaleTimeString();
      return `${index + 1}. ${role} (${timestamp}): ${message.content}`;
    });

    return formattedMessages.join('\n\n');
  }

  /**
   * Get conversation context for LLM prompt
   */
  async getConversationContext(conversationId: string): Promise<string> {
    const memory = await this.loadConversationMemory(conversationId);
    
    if (!memory || memory.messages.length === 0) {
      return '';
    }

    // Return the last 15 messages for better context (increased from 10)
    const recentMessages = memory.messages.slice(-15);
    const recentHistory = this.formatConversationHistory(recentMessages);
    
    return `CONVERSATION HISTORY:\n${recentHistory}\n\nIMPORTANT: Use this conversation history to understand the context. If the user asks follow-up questions using words like "its", "this", "that", "they", "them", "those", "it", refer to the previous conversation to understand what they're referring to. Pay special attention to the most recent exchanges for context.`;
  }

  /**
   * Check if a conversation has any history
   */
  async hasConversationHistory(conversationId: string): Promise<boolean> {
    const memory = await this.loadConversationMemory(conversationId);
    return memory !== null && memory.messages.length > 0;
  }

  /**
   * Get the last few messages for quick context
   */
  async getRecentContext(conversationId: string, messageCount: number = 3): Promise<string> {
    const memory = await this.loadConversationMemory(conversationId);
    
    if (!memory || memory.messages.length === 0) {
      return '';
    }

    const recentMessages = memory.messages.slice(-messageCount);
    return this.formatConversationHistory(recentMessages);
  }
}

// Singleton instance
let conversationMemoryManager: ConversationMemoryManager | null = null;

export const getConversationMemoryManager = (): ConversationMemoryManager => {
  if (!conversationMemoryManager) {
    conversationMemoryManager = new ConversationMemoryManager();
  }
  return conversationMemoryManager;
}; 