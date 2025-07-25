import { MongoClient, Db, Collection } from 'mongodb';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    searchUsed?: boolean;
    sources?: string[];
    confidence?: number;
    processingTime?: number;
  };
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: ChatMessage[];
  metadata?: {
    topic?: string;
    tags?: string[];
    summary?: string;
  };
}

export interface ChatStats {
  totalSessions: number;
  totalMessages: number;
  averageMessagesPerSession: number;
  recentSessions: number;
}

export class MongoChatManager {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private collection: Collection | null = null;
  private isInitialized: boolean = false;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
      const dbName = process.env.MONGODB_DB_NAME || 'voice-ai-assistant';
      
      this.client = new MongoClient(mongoUri);
      await this.client.connect();
      
      this.db = this.client.db(dbName);
      this.collection = this.db.collection('chat_sessions');
      
      // Create indexes for better performance
      await this.collection.createIndex({ userId: 1, updatedAt: -1 });
      await this.collection.createIndex({ 'messages.content': 'text' });
      
      this.isInitialized = true;
      console.log('✅ MongoDB Chat Manager initialized');
    } catch (error) {
      console.error('❌ Failed to initialize MongoDB Chat Manager:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Create a new chat session
   */
  async createChatSession(userId: string, title?: string): Promise<string> {
    if (!this.isInitialized || !this.collection) {
      throw new Error('Chat manager is not initialized');
    }

    const sessionId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session: ChatSession = {
      id: sessionId,
      userId,
      title: title || `Chat ${new Date().toLocaleDateString()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [],
    };

    await this.collection.insertOne(session);
    console.log(`✅ Created chat session: ${sessionId}`);
    return sessionId;
  }

  /**
   * Add a message to a chat session
   */
  async addMessage(sessionId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<void> {
    if (!this.isInitialized || !this.collection) {
      throw new Error('Chat manager is not initialized');
    }

    const chatMessage: ChatMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    await this.collection.updateOne(
      { id: sessionId },
      { 
        $push: { messages: chatMessage as any },
        $set: { updatedAt: new Date() }
      }
    );

    console.log(`✅ Added message to session: ${sessionId}`);
  }

  /**
   * Get a chat session with all messages
   */
  async getChatSession(sessionId: string): Promise<ChatSession | null> {
    if (!this.isInitialized || !this.collection) {
      throw new Error('Chat manager is not initialized');
    }

    const session = await this.collection.findOne({ id: sessionId });
    return session as ChatSession | null;
  }

  /**
   * Get user's chat sessions (recent first)
   */
  async getUserSessions(userId: string, limit: number = 10): Promise<ChatSession[]> {
    if (!this.isInitialized || !this.collection) {
      throw new Error('Chat manager is not initialized');
    }

    const sessions = await this.collection
      .find({ userId })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .toArray();

    return sessions as unknown as ChatSession[];
  }

  /**
   * Search chat sessions by content
   */
  async searchChatSessions(userId: string, query: string, limit: number = 5): Promise<ChatSession[]> {
    if (!this.isInitialized || !this.collection) {
      throw new Error('Chat manager is not initialized');
    }

    const sessions = await this.collection
      .find({
        userId,
        $text: { $search: query }
      })
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .toArray();

    return sessions as unknown as ChatSession[];
  }

  /**
   * Update chat session title
   */
  async updateSessionTitle(sessionId: string, title: string): Promise<void> {
    if (!this.isInitialized || !this.collection) {
      throw new Error('Chat manager is not initialized');
    }

    await this.collection.updateOne(
      { id: sessionId },
      { $set: { title, updatedAt: new Date() } }
    );
  }

  /**
   * Delete a chat session
   */
  async deleteChatSession(sessionId: string): Promise<boolean> {
    if (!this.isInitialized || !this.collection) {
      throw new Error('Chat manager is not initialized');
    }

    const result = await this.collection.deleteOne({ id: sessionId });
    return result.deletedCount > 0;
  }

  /**
   * Get chat statistics
   */
  async getChatStats(userId: string): Promise<ChatStats> {
    if (!this.isInitialized || !this.collection) {
      throw new Error('Chat manager is not initialized');
    }

    const pipeline = [
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          totalMessages: { $sum: { $size: '$messages' } }
        }
      }
    ];

    const stats = await this.collection.aggregate(pipeline).toArray();
    const sessionStats = stats[0] || { totalSessions: 0, totalMessages: 0 };

    // Get recent sessions (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const recentSessions = await this.collection.countDocuments({
      userId,
      updatedAt: { $gte: weekAgo }
    });

    return {
      totalSessions: sessionStats.totalSessions,
      totalMessages: sessionStats.totalMessages,
      averageMessagesPerSession: sessionStats.totalSessions > 0 
        ? Math.round(sessionStats.totalMessages / sessionStats.totalSessions) 
        : 0,
      recentSessions,
    };
  }

  /**
   * Check if chat manager is ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get chat manager status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      mongoConnected: !!this.client,
      dbName: process.env.MONGODB_DB_NAME || 'voice-ai-assistant',
    };
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
    }
  }
}

// Singleton instance
let chatInstance: MongoChatManager | null = null;

/**
 * Get or create the chat manager instance
 */
export const getChatManager = (): MongoChatManager => {
  if (!chatInstance) {
    chatInstance = new MongoChatManager();
  }
  return chatInstance;
};

/**
 * Reset the chat manager instance (useful for testing)
 */
export const resetChatManager = (): void => {
  chatInstance = null;
}; 