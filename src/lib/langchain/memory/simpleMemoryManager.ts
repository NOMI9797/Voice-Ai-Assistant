import { ChromaClient, Collection } from 'chromadb';

// Environment variables validation
const requiredEnvVars = {
  CHROMA_HOST: process.env.CHROMA_HOST,
  CHROMA_PORT: process.env.CHROMA_PORT,
};

// Validate required environment variables
Object.entries(requiredEnvVars).forEach(([key, value]) => {
  if (!value) {
    console.warn(`⚠️  ${key} is not set. Please add it to your .env.local file.`);
  }
});

export interface MemoryConfig {
  collectionName: string;
  maxResults: number;
  similarityThreshold: number;
}

export const memoryConfig: MemoryConfig = {
  collectionName: 'research_memory',
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

export class SimpleMemoryManager {
  private chromaClient!: ChromaClient;
  private collection!: Collection;
  private isInitialized: boolean = false;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Initialize ChromaDB
      const host = process.env.CHROMA_HOST || 'localhost';
      const port = process.env.CHROMA_PORT || '8000';
      
      this.chromaClient = new ChromaClient({
        path: `http://${host}:${port}`,
      });
      
      // Get or create collection
      this.collection = await this.chromaClient.getOrCreateCollection({
        name: memoryConfig.collectionName,
        metadata: {
          description: 'Research assistant memory storage',
        },
      });

      this.isInitialized = true;
      console.log('✅ Simple memory manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize simple memory manager:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Store a memory document with embedding
   */
  async storeMemory(document: Omit<MemoryDocument, 'id'>): Promise<string> {
    if (!this.isInitialized) {
      throw new MemoryError('Memory manager is not initialized');
    }

    try {
      const id = this.generateId();
      
      // Store in ChromaDB with embedding
      await this.collection.add({
        ids: [id],
        documents: [document.content],
        metadatas: [{
          userId: document.metadata.userId,
          query: document.metadata.query,
          response: document.metadata.response,
          timestamp: document.metadata.timestamp,
          type: document.metadata.type,
          confidence: document.metadata.confidence?.toString() || '',
        }],
      });

      console.log(`✅ Memory stored with ID: ${id}`);
      return id;
    } catch (error) {
      console.error('Failed to store memory:', error);
      throw new MemoryError('Failed to store memory');
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
      throw new MemoryError('Memory manager is not initialized');
    }

    try {
      // Search in ChromaDB
      const results = await this.collection.query({
        queryTexts: [query],
        nResults: limit,
        where: { userId },
      });

      if (!results.ids || results.ids.length === 0) {
        return [];
      }

      // Process results
      const searchResults: MemorySearchResult[] = [];
      const memoryIds = results.ids[0];
      const documents = results.documents?.[0] || [];
      const metadatas = results.metadatas?.[0] || [];
      const distances = results.distances?.[0] || [];

      for (let i = 0; i < memoryIds.length; i++) {
        const id = memoryIds[i];
        const content = documents[i];
        const metadata = metadatas[i];
        const distance = distances[i];

        if (content && metadata && typeof distance === 'number') {
          const similarity = 1 - distance; // Convert distance to similarity
          
          if (similarity >= memoryConfig.similarityThreshold) {
                         searchResults.push({
               id,
               content,
               metadata: metadata as unknown as MemoryDocument['metadata'],
               similarity,
             });
          }
        }
      }

      return searchResults.sort((a, b) => b.similarity - a.similarity);
    } catch (error) {
      console.error('Failed to search memories:', error);
      throw new MemoryError('Failed to search memories');
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
      const results = await this.collection.get({
        where: { userId },
      });

      if (!results.ids || results.ids.length === 0) {
        return [];
      }

      const memories: MemoryDocument[] = [];
      for (let i = 0; i < results.ids.length; i++) {
        const id = results.ids[i];
        const content = results.documents?.[i];
        const metadata = results.metadatas?.[i];

        if (content && metadata) {
                     memories.push({
             id,
             content,
             metadata: metadata as unknown as MemoryDocument['metadata'],
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
      await this.collection.delete({
        ids: [id],
      });
      
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
      const where = userId ? { userId } : undefined;
      const results = await this.collection.get({ where });
      
      const totalMemories = results.ids?.length || 0;
      const types: Record<string, number> = {};

      if (results.metadatas) {
        results.metadatas.forEach((metadata) => {
          if (metadata && typeof metadata === 'object' && 'type' in metadata) {
            const type = (metadata.type as string) || 'unknown';
            types[type] = (types[type] || 0) + 1;
          }
        });
      }

      return {
        totalMemories,
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
      chromaConnected: !!this.chromaClient,
      collectionName: memoryConfig.collectionName,
    };
  }
}

// Singleton instance
let memoryInstance: SimpleMemoryManager | null = null;

/**
 * Get or create the memory manager instance
 */
export const getMemoryManager = (): SimpleMemoryManager => {
  if (!memoryInstance) {
    memoryInstance = new SimpleMemoryManager();
  }
  return memoryInstance;
};

/**
 * Reset the memory manager instance (useful for testing)
 */
export const resetMemoryManager = (): void => {
  memoryInstance = null;
}; 