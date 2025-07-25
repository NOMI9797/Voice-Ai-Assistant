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
          query: document.metadata.query,
          response: document.metadata.response,
          sources: document.metadata.sources?.join('|') || '',
          timestamp: document.metadata.timestamp,
          type: document.metadata.type,
          confidence: document.metadata.confidence?.toString() || '',
        },
      }]);

      console.log(`✅ Memory stored with ID: ${id}`);
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
    limit: number = memoryConfig.maxResults
  ): Promise<MemorySearchResult[]> {
    if (!this.isInitialized) {
      console.warn('Memory manager not initialized, returning empty results');
      return [];
    }

    try {
      const queryEmbedding = this.generateSimpleEmbedding(query);
      
      // Search in Pinecone
      const results = await this.index.query({
        vector: queryEmbedding,
        topK: limit,
        filter: {
          userId: { $eq: userId },
        },
        includeMetadata: true,
      });

      if (!results.matches || results.matches.length === 0) {
        return [];
      }

      // Process results
      const searchResults: MemorySearchResult[] = [];
      
      for (const match of results.matches) {
        if (match.metadata && match.score && match.score >= memoryConfig.similarityThreshold) {
          searchResults.push({
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
            similarity: match.score,
          });
        }
      }

      return searchResults.sort((a, b) => b.similarity - a.similarity);
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