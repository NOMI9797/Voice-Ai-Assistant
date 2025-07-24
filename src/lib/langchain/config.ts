import { ChatGroq } from '@langchain/groq';

// Environment variables validation
const requiredEnvVars = {
  GROQ_API_KEY: process.env.GROQ_API_KEY,
};

// Validate required environment variables
Object.entries(requiredEnvVars).forEach(([key, value]) => {
  if (!value || value === 'your_groq_api_key_here') {
    console.warn(`⚠️  ${key} is not set. Please add it to your .env.local file.`);
  }
});

// Groq LLM Configuration
export const createGroqLLM = () => {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    throw new Error('GROQ_API_KEY is required. Please add it to your .env.local file.');
  }

  return new ChatGroq({
    apiKey,
    model: 'llama3-8b-8192', // Fast and efficient model
    temperature: 0.7,
    maxTokens: 4096,
    topP: 0.9,
  });
};

// Agent Configuration
export const agentConfig = {
  model: 'llama3-8b-8192',
  temperature: 0.7,
  maxTokens: 4096,
  systemPrompt: `You are an intelligent AI research assistant that helps users find, analyze, and recall information.

Your capabilities include:
- Web search for real-time information
- PDF document analysis
- Memory storage and retrieval
- Natural language processing

When a user asks a question:
1. Determine the best approach (web search, document analysis, memory recall)
2. Provide clear, concise, and accurate responses
3. Store useful information for future reference
4. Always cite your sources when possible

Be helpful, accurate, and professional in all interactions.`,
};

// Error handling utilities
export class LangChainError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'LangChainError';
  }
}

// Response formatting utilities
export const formatResponse = (content: string, sources?: string[]) => {
  let formatted = content;
  
  if (sources && sources.length > 0) {
    formatted += '\n\n**Sources:**\n';
    sources.forEach((source, index) => {
      formatted += `${index + 1}. ${source}\n`;
    });
  }
  
  return formatted;
}; 