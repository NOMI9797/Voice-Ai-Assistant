import { Pinecone } from '@pinecone-database/pinecone';

// Environment variables validation
const requiredEnvVars = {
  PINECONE_API_KEY: process.env.PINECONE_API_KEY,
  PINECONE_INDEX_NAME: process.env.PINECONE_INDEX_NAME,
};

// Validate required environment variables
Object.entries(requiredEnvVars).forEach(([key, value]) => {
  if (!value) {
    console.warn(`⚠️  ${key} is not set. Please add it to your .env.local file.`);
  }
});

export interface MemoryConfig {
  indexName: string;
  maxResults: number;
  similarityThreshold: number;
}

export const memoryConfig: MemoryConfig = {
  indexName: process.env.PINECONE_INDEX_NAME || 'research-memory',
  maxResults: 10,
  similarityThreshold: 0.7,
};

export class MemoryError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'MemoryError';
  }
}

// Memory document interface
export interface MemoryDocument {
  id: string;
  content: string;
  metadata: {
    userId: string;
    sessionId?: string;
    query: string;
    response: string;
    sources?: string[];
    timestamp: string;
    type: 'web_search' | 'conversation' | 'document' | 'summary';
    tags?: string[];
    confidence?: number;
  };
}

// Memory search result interface
export interface MemorySearchResult {
  id: string;
  content: string;
  metadata: MemoryDocument['metadata'];
  similarity: number;
}

export class PineconeMemoryManager {
  private pinecone!: Pinecone;
  private index: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  private isInitialized: boolean = false;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      const apiKey = process.env.PINECONE_API_KEY;
      const indexName = process.env.PINECONE_INDEX_NAME;

      if (!apiKey || !indexName) {
        console.warn('Pinecone API key or index name not configured. Memory system will not be available.');
        this.isInitialized = false;
        return;
      }

      // Initialize Pinecone
      this.pinecone = new Pinecone({
        apiKey: apiKey,
      });

      // Get or create index
      this.index = this.pinecone.index(indexName);
      
      // Test connection
      await this.index.describeIndexStats();

      this.isInitialized = true;
      console.log('✅ Pinecone memory manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Pinecone memory manager:', error);
      // Don't fail completely - allow the system to work without memory
      this.isInitialized = false;
    }
  }

  /**
   * Generate simple embeddings (for demo purposes)
   * In production, you'd use a proper embedding model
   */
  private generateSimpleEmbedding(text: string): number[] {
    // Simple hash-based embedding for demo
    const hash = text.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    // Generate a 1024-dimensional vector (matching the Pinecone index)
    const embedding = new Array(1024).fill(0);
    for (let i = 0; i < 1024; i++) {
      embedding[i] = Math.sin(hash + i) * 0.1;
    }
    
    return embedding;
  }

  /**
   * Store a memory document with embedding
   */
  async storeMemory(document: Omit<MemoryDocument, 'id'>): Promise<string> {
    if (!this.isInitialized) {
      console.warn('Memory manager not initialized, skipping memory storage');
      return 'memory_disabled';
    }

    try {
      const id = this.generateId();
      const embedding = this.generateSimpleEmbedding(document.content);
      
      // Store in Pinecone
      await this.index.upsert([{
        id,
        values: embedding,
        metadata: {
          content: document.content,
          userId: document.metadata.userId,
          sessionId: document.metadata.sessionId || '',
          query: document.metadata.query,
          response: document.metadata.response,
          sources: document.metadata.sources?.join('|') || '',
          timestamp: document.metadata.timestamp,
          type: document.metadata.type,
          confidence: document.metadata.confidence?.toString() || '',
        },
      }]);

      console.log(`✅ Memory stored with ID: ${id}, sessionId: ${document.metadata.sessionId || 'none'}`);
      return id;
    } catch (error) {
      console.error('Failed to store memory:', error);
      // Don't throw error, just log it and continue
      return 'memory_error';
    }
  }

  /**
   * Search for similar memories
   */
  async searchMemories(
    query: string,
    userId: string,
    limit: number = memoryConfig.maxResults,
    sessionId?: string
  ): Promise<MemorySearchResult[]> {
    if (!this.isInitialized) {
      console.warn('Memory manager not initialized, returning empty results');
      return [];
    }

    try {
      const queryEmbedding = this.generateSimpleEmbedding(query);
      
      // Build filter based on whether sessionId is provided
      const filter: any = {
        userId: { $eq: userId },
      };
      
      if (sessionId) {
        // Strict session filtering - only get memories with exact sessionId match
        filter.sessionId = { $eq: sessionId };
        console.log(`🔍 Searching memories with filter: userId=${userId}, sessionId=${sessionId}`);
      } else {
        // If no sessionId provided, only get memories that have a sessionId (exclude old memories without sessionId)
        filter.sessionId = { $ne: '' };
        console.log(`🔍 Searching memories with filter: userId=${userId}, sessionId not empty`);
      }
      
      // For debugging: also check if there are any memories without sessionId
      if (sessionId) {
        try {
          const allUserMemories = await this.index.query({
            vector: queryEmbedding,
            topK: 10,
            filter: { userId: { $eq: userId } },
            includeMetadata: true,
          });
          
          const memoriesWithoutSession = allUserMemories.matches?.filter((match: any) => 
            !match.metadata?.sessionId || match.metadata.sessionId === ''
          ) || [];
          
          if (memoriesWithoutSession.length > 0) {
            console.log(`⚠️ Found ${memoriesWithoutSession.length} memories without sessionId for user ${userId}`);
            console.log(`⚠️ These memories will be excluded from session-specific search`);
          }
        } catch (error) {
          console.warn('Failed to check for memories without sessionId:', error);
        }
      }
      
      // Search in Pinecone - get more results initially for better ranking
      const results = await this.index.query({
        vector: queryEmbedding,
        topK: Math.max(limit * 2, 10), // Get more results for better ranking
        filter: filter,
        includeMetadata: true,
      });

      if (!results.matches || results.matches.length === 0) {
        return [];
      }

      // Process results
      const searchResults: MemorySearchResult[] = [];
      
      for (const match of results.matches) {
        if (match.metadata && match.score && match.score >= memoryConfig.similarityThreshold) {
          // Additional check: if sessionId is provided, only include memories with matching sessionId
          if (sessionId && match.metadata.sessionId !== sessionId) {
            console.log(`🚫 Excluding memory with sessionId: ${match.metadata.sessionId} (expected: ${sessionId})`);
            continue;
          }
          
          // Additional safety check: never include memories without sessionId when sessionId is provided
          if (sessionId && (!match.metadata.sessionId || match.metadata.sessionId === '')) {
            console.log(`🚫 Excluding memory without sessionId (expected: ${sessionId})`);
            continue;
          }
          
          searchResults.push({
            id: match.id,
            content: match.metadata.content as string,
            metadata: {
              userId: match.metadata.userId as string,
              sessionId: match.metadata.sessionId as string,
              query: match.metadata.query as string,
              response: match.metadata.response as string,
              sources: match.metadata.sources ? (match.metadata.sources as string).split('|') : [],
              timestamp: match.metadata.timestamp as string,
              type: match.metadata.type as 'web_search' | 'conversation' | 'document' | 'summary',
              confidence: match.metadata.confidence ? parseFloat(match.metadata.confidence as string) : undefined,
            },
            similarity: match.score,
          });
        }
      }

      // Sort by a combination of similarity and recency
      const sortedResults = searchResults.sort((a, b) => {
        // Calculate a combined score that considers both similarity and recency
        const aTimestamp = new Date(a.metadata.timestamp).getTime();
        const bTimestamp = new Date(b.metadata.timestamp).getTime();
        const now = Date.now();
        
        // Recency factor: more recent memories get higher scores
        const aRecency = Math.max(0, 1 - (now - aTimestamp) / (24 * 60 * 60 * 1000)); // Decay over 24 hours
        const bRecency = Math.max(0, 1 - (now - bTimestamp) / (24 * 60 * 60 * 1000));
        
        // Combined score: 70% similarity + 30% recency
        const aScore = (a.similarity * 0.7) + (aRecency * 0.3);
        const bScore = (b.similarity * 0.7) + (bRecency * 0.3);
        
        return bScore - aScore;
      });

      // Debug: Log the top results with their scores
      if (sortedResults.length > 0) {
        console.log(`🧠 Found ${sortedResults.length} relevant memories for query: "${query}"`);
        sortedResults.slice(0, 3).forEach((result, index) => {
          const timestamp = new Date(result.metadata.timestamp);
          const timeAgo = Math.round((Date.now() - timestamp.getTime()) / (1000 * 60)); // minutes ago
          console.log(`  ${index + 1}. Query: "${result.metadata.query}" (${timeAgo}min ago, similarity: ${result.similarity.toFixed(3)})`);
        });
      }

      // Return only the requested number of results
      return sortedResults.slice(0, limit);
    } catch (error) {
      console.error('Failed to search memories:', error);
      // Return empty results instead of throwing
      return [];
    }
  }

  /**
   * Get all memories for a user
   */
  async getUserMemories(userId: string): Promise<MemoryDocument[]> {
    if (!this.isInitialized) {
      throw new MemoryError('Memory manager is not initialized');
    }

    try {
      // Get all vectors for the user
      const results = await this.index.query({
        vector: new Array(1536).fill(0), // Dummy vector
        topK: 1000, // Get all memories
        filter: {
          userId: { $eq: userId },
        },
        includeMetadata: true,
      });

      if (!results.matches || results.matches.length === 0) {
        return [];
      }

      const memories: MemoryDocument[] = [];
      for (const match of results.matches) {
        if (match.metadata) {
          memories.push({
            id: match.id,
            content: match.metadata.content as string,
            metadata: {
              userId: match.metadata.userId as string,
              query: match.metadata.query as string,
              response: match.metadata.response as string,
              sources: match.metadata.sources ? (match.metadata.sources as string).split('|') : [],
              timestamp: match.metadata.timestamp as string,
              type: match.metadata.type as 'web_search' | 'conversation' | 'document' | 'summary',
              confidence: match.metadata.confidence ? parseFloat(match.metadata.confidence as string) : undefined,
            },
          });
        }
      }

      return memories;
    } catch (error) {
      console.error('Failed to get user memories:', error);
      throw new MemoryError('Failed to get user memories');
    }
  }

  /**
   * Delete memory by ID
   */
  async deleteMemory(id: string): Promise<boolean> {
    if (!this.isInitialized) {
      throw new MemoryError('Memory manager is not initialized');
    }

    try {
      await this.index.deleteOne(id);
      console.log(`✅ Memory deleted with ID: ${id}`);
      return true;
    } catch (error) {
      console.error('Failed to delete memory:', error);
      throw new MemoryError('Failed to delete memory');
    }
  }

  /**
   * Delete all memories for a specific session
   */
  async deleteSessionMemories(sessionId: string): Promise<number> {
    if (!this.isInitialized) {
      throw new MemoryError('Memory manager is not initialized');
    }

    try {
      // First, find all memories for this session
      const results = await this.index.query({
        vector: new Array(1024).fill(0), // Dummy vector
        topK: 1000, // Get all memories
        filter: {
          sessionId: { $eq: sessionId },
        },
        includeMetadata: true,
      });

      if (!results.matches || results.matches.length === 0) {
        console.log(`📭 No memories found for session: ${sessionId}`);
        return 0;
      }

      // Delete all memories for this session
      const memoryIds = results.matches.map((match: any) => match.id);
      await this.index.deleteMany(memoryIds);
      
      console.log(`🗑️ Deleted ${memoryIds.length} memories for session: ${sessionId}`);
      return memoryIds.length;
    } catch (error) {
      console.error('Failed to delete session memories:', error);
      throw new MemoryError(`Failed to delete session memories: ${error}`);
    }
  }

  /**
   * Delete all memories for a specific user
   */
  async deleteUserMemories(userId: string): Promise<number> {
    if (!this.isInitialized) {
      throw new MemoryError('Memory manager is not initialized');
    }

    try {
      // First, find all memories for this user
      const results = await this.index.query({
        vector: new Array(1024).fill(0), // Dummy vector
        topK: 1000, // Get all memories
        filter: {
          userId: { $eq: userId },
        },
        includeMetadata: true,
      });

      if (!results.matches || results.matches.length === 0) {
        console.log(`📭 No memories found for user: ${userId}`);
        return 0;
      }

      // Delete all memories for this user
      const memoryIds = results.matches.map((match: any) => match.id);
      await this.index.deleteMany(memoryIds);
      
      console.log(`🗑️ Deleted ${memoryIds.length} memories for user: ${userId}`);
      return memoryIds.length;
    } catch (error) {
      console.error('Failed to delete user memories:', error);
      throw new MemoryError(`Failed to delete user memories: ${error}`);
    }
  }

  /**
   * Get memory statistics
   */
  async getMemoryStats(userId?: string): Promise<{
    totalMemories: number;
    types: Record<string, number>;
  }> {
    if (!this.isInitialized) {
      throw new MemoryError('Memory manager is not initialized');
    }

    try {
      // Get total stats
      const stats = await this.index.describeIndexStats();
      const totalMemories = stats.totalVectorCount || 0;
      
      // Get user-specific memories if userId provided
      let userMemories = 0;
      if (userId) {
        try {
          const userResults = await this.index.query({
            vector: new Array(1024).fill(0), // Dummy vector
            topK: 1000, // Get all memories
            filter: {
              userId: { $eq: userId },
            },
            includeMetadata: true,
          });
          userMemories = userResults.matches?.length || 0;
        } catch (error) {
          console.warn('Failed to get user-specific memories:', error);
        }
      }
      
      // Count by type
      const types: Record<string, number> = {
        conversation: 0,
        web_search: 0,
        document: 0,
      };
      
      // Try to get some actual memories to count types
      try {
        const sampleResults = await this.index.query({
          vector: new Array(1024).fill(0),
          topK: 100,
          includeMetadata: true,
        });
        
                 if (sampleResults.matches) {
           sampleResults.matches.forEach((match: any) => {
             if (match.metadata && match.metadata.type) {
               const type = match.metadata.type as string;
               if (types.hasOwnProperty(type)) {
                 types[type]++;
               }
             }
           });
         }
      } catch (error) {
        console.warn('Failed to get memory types:', error);
        // Fallback to estimated stats
        types.conversation = Math.floor(totalMemories * 0.6);
        types.web_search = Math.floor(totalMemories * 0.3);
        types.document = Math.floor(totalMemories * 0.1);
      }

      return {
        totalMemories: userId ? userMemories : totalMemories,
        types,
      };
    } catch (error) {
      console.error('Failed to get memory stats:', error);
      throw new MemoryError('Failed to get memory stats');
    }
  }

  /**
   * Generate unique ID for memory documents
   */
  private generateId(): string {
    return `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if memory manager is ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get memory manager status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      pineconeConnected: !!this.pinecone,
      indexName: memoryConfig.indexName,
    };
  }
}

// Singleton instance
let memoryInstance: PineconeMemoryManager | null = null;

/**
 * Get or create the memory manager instance
 */
export const getMemoryManager = (): PineconeMemoryManager => {
  if (!memoryInstance) {
    memoryInstance = new PineconeMemoryManager();
  }
  return memoryInstance;
};

/**
 * Reset the memory manager instance (useful for testing)
 */
export const resetMemoryManager = (): void => {
  memoryInstance = null;
}; 