import { ChromaClient } from 'chromadb';
import { MongoClient } from 'mongodb';

// Environment variables validation
const requiredEnvVars = {
  MONGODB_URI: process.env.MONGODB_URI,
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
  embeddingModel: string;
  maxResults: number;
  similarityThreshold: number;
}

export const memoryConfig: MemoryConfig = {
  collectionName: 'research_memory',
  embeddingModel: 'all-MiniLM-L6-v2', // Default embedding model
  maxResults: 10,
  similarityThreshold: 0.7,
};

export class MemoryError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'MemoryError';
  }
}

// MongoDB connection
export const createMongoClient = (): MongoClient => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new MemoryError('MONGODB_URI is required. Please add it to your .env.local file.');
  }
  
  return new MongoClient(uri);
};

// ChromaDB connection
export const createChromaClient = (): ChromaClient => {
  const host = process.env.CHROMA_HOST || 'localhost';
  const port = process.env.CHROMA_PORT || '8000';
  
  try {
    return new ChromaClient({
      path: `http://${host}:${port}`,
    });
  } catch (error) {
    console.error('Failed to connect to ChromaDB:', error);
    throw new MemoryError('Failed to connect to ChromaDB. Please ensure ChromaDB is running.');
  }
};

// Memory document interface
export interface MemoryDocument {
  id: string;
  content: string;
  metadata: {
    userId: string;
    query: string;
    response: string;
    sources?: string[];
    timestamp: Date;
    type: 'web_search' | 'conversation' | 'document' | 'summary';
    tags?: string[];
    confidence?: number;
  };
  embedding?: number[];
}

// Memory search result interface
export interface MemorySearchResult {
  id: string;
  content: string;
  metadata: MemoryDocument['metadata'];
  similarity: number;
} 