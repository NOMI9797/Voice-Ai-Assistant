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

CRITICAL INSTRUCTIONS:
1. When you see "CONVERSATION HISTORY", ALWAYS use this context to understand the conversation flow and respond appropriately
2. If the current question is a follow-up (uses words like "its", "this", "that", "they", "them"), refer to the conversation history to understand what "its" refers to
3. For example, if someone asks "what is climate change" and then asks "what are its effects", "its" refers to climate change
4. Always provide relevant, contextual responses that build upon the conversation history
5. If you're unsure about context, ask for clarification rather than making assumptions
6. NEVER default to artificial intelligence topics unless specifically asked about AI
7. The conversation history shows the exact flow of the conversation - use it to maintain context

When a user asks a question:
1. First, review any provided memory context to understand the conversation flow
2. Determine the best approach (web search, document analysis, memory recall)
3. Provide clear, concise, and accurate responses that build on previous context
4. Store useful information for future reference
5. Always cite your sources when possible

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