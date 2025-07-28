import { ChatGroq } from '@langchain/groq';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { AgentExecutor } from 'langchain/agents';
import { createGroqLLM, agentConfig, LangChainError } from './config';
import { getToolsManager, ToolsManager } from './tools';
import { getMemoryManager, PineconeMemoryManager } from './memory/pineconeMemoryManager';
import { getConversationMemoryManager } from './memory/conversationMemory';

export interface AgentResponse {
  content: string;
  sources?: string[];
  confidence?: number;
  processingTime?: number;
  searchUsed?: boolean;
}

export interface AgentRequest {
  query: string;
  context?: string;
  userId?: string;
  sessionId?: string;
}

export class ResearchAgent {
  private llm!: ChatGroq;
  private toolsManager!: ToolsManager;
  private memoryManager!: PineconeMemoryManager;
  private agentExecutor: AgentExecutor | null = null;
  private isInitialized: boolean = false;

  constructor() {
    try {
      this.llm = createGroqLLM();
      this.toolsManager = getToolsManager();
      this.memoryManager = getMemoryManager();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize ResearchAgent:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Process a user query and return an intelligent response
   */
  async processQuery(request: AgentRequest): Promise<AgentResponse> {
    const startTime = Date.now();

    try {
      if (!this.isInitialized) {
        throw new LangChainError('Agent is not properly initialized. Please check your API configuration.');
      }

      // Validate input
      if (!request.query || request.query.trim().length === 0) {
        throw new LangChainError('Query cannot be empty.');
      }

      // Check if query requires web search
      const shouldUseWebSearch = this.shouldUseWebSearch(request.query);
      
      // Check for relevant memories first (session-specific)
      let relevantMemories: Array<{
        id: string;
        content: string;
        metadata: {
          userId: string;
          sessionId?: string;
          query: string;
          response: string;
          sources?: string[];
          timestamp: string;
          type: string;
          tags?: string[];
          confidence?: number;
        };
        similarity: number;
      }> = [];
      if (request.userId && this.memoryManager.isReady()) {
        try {
          // Search for memories with intelligent context detection
          if (request.sessionId) {
            console.log(`🔍 Searching for memories with sessionId: ${request.sessionId}`);
            
            // Improve search query for follow-up questions
            let searchQuery = request.query;
            const lowerQuery = request.query.toLowerCase();
            let searchLimit = 5; // Increased base limit
            
            // Detect follow-up questions and pronouns that need context
            const followUpIndicators = ['its', 'this', 'that', 'they', 'them', 'those', 'it', 'he', 'she', 'his', 'her', 'their'];
            const isFollowUpQuestion = followUpIndicators.some(indicator => lowerQuery.includes(indicator));
            
            if (isFollowUpQuestion) {
              // For follow-up questions, search for the most recent conversations first
              console.log(`🔍 Detected follow-up question, searching for recent context in current session`);
              searchLimit = 8; // Get more memories to find the most recent relevant ones
            }
            
            relevantMemories = await this.memoryManager.searchMemories(searchQuery, request.userId, searchLimit, request.sessionId);
            if (relevantMemories.length > 0) {
              console.log(`🧠 Found ${relevantMemories.length} relevant memories in current session (${request.sessionId})`);
              // Log the found memories for debugging
              relevantMemories.forEach((memory, index) => {
                console.log(`  Memory ${index + 1}: sessionId=${memory.metadata.sessionId}, query="${memory.metadata.query}"`);
              });
            } else {
              console.log(`🧠 No relevant memories found in current session (${request.sessionId})`);
            }
          } else {
            console.log('🧠 No session ID provided, skipping memory search');
          }
        } catch (error) {
          console.warn('Failed to search memories:', error);
        }
      }
      
      let content: string;
      let sources: string[] = [];
      let searchUsed = false;

      if (shouldUseWebSearch && this.toolsManager.isToolAvailable('web_search')) {
        // Use web search tool
        const webSearchTool = this.toolsManager.getTool('web_search');
        if (webSearchTool) {
          console.log('🔍 Using web search for query:', request.query);
          const searchResult = await webSearchTool.invoke(request.query);
          content = searchResult;
          
          // Extract sources from search results
          sources = this.extractSourcesFromSearchResult(searchResult);
          searchUsed = true;
        } else {
          // Fallback to direct LLM response with memory context
          content = await this.getDirectLLMResponse(request, relevantMemories);
        }
      } else {
        // Use direct LLM response with memory context
        console.log('🧠 Using LLM knowledge for query:', request.query);
        content = await this.getDirectLLMResponse(request, relevantMemories);
      }
      
      const processingTime = Date.now() - startTime;

      // Store the interaction in memory
      if (request.userId && this.memoryManager.isReady()) {
        try {
          console.log(`💾 Storing memory for session: ${request.sessionId || 'no-session'}`);
          await this.memoryManager.storeMemory({
            content: request.query,
            metadata: {
              userId: request.userId,
              sessionId: request.sessionId,
              query: request.query,
              response: content,
              sources,
              timestamp: new Date().toISOString(),
              type: searchUsed ? 'web_search' : 'conversation',
              confidence: this.calculateConfidence(content),
            },
          });
        } catch (error) {
          console.warn('Failed to store memory:', error);
        }
      }

      // Enhance response with follow-up suggestions and memory context
      const formattedContent = this.enhanceResponse(content, request.query, searchUsed, sources, relevantMemories);

      return {
        content: formattedContent,
        sources,
        processingTime,
        confidence: this.calculateConfidence(content),
        searchUsed
      };

    } catch (error) {
      console.error('Error processing query:', error);
      
      if (error instanceof LangChainError) {
        throw error;
      }

      throw new LangChainError(
        'Failed to process your request. Please try again.',
        'PROCESSING_ERROR'
      );
    }
  }

  /**
   * Format user query with context
   */
  private formatUserQuery(request: AgentRequest): string {
    let formattedQuery = request.query.trim();

    // Add context if available
    if (request.context) {
      formattedQuery = `Context: ${request.context}\n\nQuestion: ${formattedQuery}`;
    }

    // Add user ID for tracking
    if (request.userId) {
      formattedQuery = `[User: ${request.userId}]\n${formattedQuery}`;
    }

    // Add instruction for follow-up questions
    if (formattedQuery.toLowerCase().includes('its') || 
        formattedQuery.toLowerCase().includes('this') || 
        formattedQuery.toLowerCase().includes('that') ||
        formattedQuery.toLowerCase().includes('they') ||
        formattedQuery.toLowerCase().includes('them')) {
      formattedQuery = `Note: This appears to be a follow-up question. Please refer to the memory context above to understand what the user is referring to.\n\n${formattedQuery}`;
    }

    return formattedQuery;
  }

  /**
   * Enhance response with additional formatting and suggestions
   */
  private enhanceResponse(content: string, originalQuery: string, searchUsed: boolean, sources: string[], relevantMemories: Array<{
    id: string;
    content: string;
    metadata: {
      userId: string;
      query: string;
      response: string;
      sources?: string[];
      timestamp: string;
      type: string;
      tags?: string[];
      confidence?: number;
    };
    similarity: number;
  }> = []): string {
    let enhanced = content;

    // Add memory context if available
    if (relevantMemories.length > 0) {
      enhanced = `🧠 **Memory Context**\n\nI found ${relevantMemories.length} relevant previous interactions that might be helpful:\n\n${relevantMemories.map((memory, index) => {
        const timestamp = new Date(memory.metadata.timestamp);
        const timeAgo = Math.round((Date.now() - timestamp.getTime()) / (1000 * 60)); // minutes ago
        const responsePreview = memory.metadata.response.length > 300 
          ? memory.metadata.response.substring(0, 300) + '...' 
          : memory.metadata.response;
        
        return `${index + 1}. **Previous Query:** ${memory.metadata.query}\n   **Response:** ${responsePreview}\n   **Time:** ${timeAgo} minutes ago | **Similarity:** ${Math.round(memory.similarity * 100)}%\n`;
      }).join('\n')}\n\n**IMPORTANT:** Use this context to understand what the user is referring to in their current question. If they use words like "its", "this", "that", "they", "them", refer to the previous conversation to understand the context. Pay attention to the most recent conversations first.\n\n---\n\n${enhanced}`;
    }

    // Add source transparency header
    if (searchUsed && sources.length > 0) {
      enhanced = `🔍 **Web Search Results**\n\n${enhanced}\n\n**Sources:**\n${sources.map((source, index) => `${index + 1}. ${source}`).join('\n')}`;
    } else if (!searchUsed) {
      enhanced = `🧠 **AI Knowledge Response**\n\n${enhanced}\n\n*This response is based on my training data and general knowledge.*`;
    }

    // Add follow-up suggestions based on query type
    const suggestions = this.generateFollowUpSuggestions(originalQuery);
    if (suggestions.length > 0) {
      enhanced += '\n\n**Follow-up Questions:**\n';
      suggestions.forEach((suggestion, index) => {
        enhanced += `${index + 1}. ${suggestion}\n`;
      });
    }

    return enhanced;
  }

  /**
   * Generate relevant follow-up questions
   */
  private generateFollowUpSuggestions(query: string): string[] {
    const suggestions: string[] = [];
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('what') || lowerQuery.includes('how')) {
      suggestions.push('Would you like me to search for more recent information on this topic?');
      suggestions.push('Should I save this information to your research memory?');
    }

    if (lowerQuery.includes('search') || lowerQuery.includes('find')) {
      suggestions.push('Would you like me to analyze the search results in more detail?');
      suggestions.push('Should I summarize the key findings for you?');
    }

    if (lowerQuery.includes('pdf') || lowerQuery.includes('document')) {
      suggestions.push('Would you like me to extract specific sections from the document?');
      suggestions.push('Should I create a summary of the main points?');
    }

    return suggestions.slice(0, 2); // Limit to 2 suggestions
  }

  /**
   * Calculate confidence score based on response characteristics
   */
  private calculateConfidence(content: string): number {
    // Simple confidence calculation based on response length and structure
    const length = content.length;
    const hasSources = content.includes('**Sources:**') || content.includes('http');
    const hasStructure = content.includes('**') || content.includes('\n\n');

    let confidence = 0.5; // Base confidence

    if (length > 100) confidence += 0.2;
    if (length > 300) confidence += 0.1;
    if (hasSources) confidence += 0.2;
    if (hasStructure) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  /**
   * Check if the agent is ready to process queries
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Determine if a query should use web search
   */
  private shouldUseWebSearch(query: string): boolean {
    const lowerQuery = query.toLowerCase();
    const searchKeywords = [
      'search', 'find', 'latest', 'recent', 'news', 'current', 'today', 
      'now', 'update', 'information about', 'what is', 'who is', 'when',
      'where', 'how to', 'latest news', 'current events', 'recent developments'
    ];
    
    return searchKeywords.some(keyword => lowerQuery.includes(keyword));
  }

  /**
   * Get direct LLM response without tools
   */
  private async getDirectLLMResponse(request: AgentRequest, relevantMemories: Array<{
    id: string;
    content: string;
    metadata: {
      userId: string;
      sessionId?: string;
      query: string;
      response: string;
      sources?: string[];
      timestamp: string;
      type: string;
      tags?: string[];
      confidence?: number;
    };
    similarity: number;
  }> = []): Promise<string> {
    let contextMessage = '';
    
    // Load conversation history from MongoDB for proper context
    if (request.sessionId) {
      try {
        const conversationMemoryManager = getConversationMemoryManager();
        const conversationContext = await conversationMemoryManager.getConversationContext(request.sessionId);
        
        if (conversationContext) {
          contextMessage = `\n\n${conversationContext}`;
          console.log(`📚 Loaded conversation context for session: ${request.sessionId}`);
        } else {
          console.log(`📚 No conversation history found for session: ${request.sessionId}`);
        }
      } catch (error) {
        console.warn('Failed to load conversation context:', error);
      }
    }
    
    // Add Pinecone memory context as additional context (for knowledge retrieval)
    if (relevantMemories.length > 0) {
      const memoryContext = `\n\nADDITIONAL KNOWLEDGE CONTEXT:\n${relevantMemories.map((memory, index) => {
        const timestamp = new Date(memory.metadata.timestamp).toLocaleTimeString();
        const sessionInfo = memory.metadata.sessionId ? ` (Session: ${memory.metadata.sessionId})` : '';
        return `${index + 1}. Previous Query: "${memory.metadata.query}"${sessionInfo} [${timestamp}]\n   Response: ${memory.metadata.response.substring(0, 300)}...\n   Similarity: ${(memory.similarity * 100).toFixed(1)}%\n`;
      }).join('\n')}\n\nUse this additional knowledge context if relevant to the current question. Pay special attention to the most recent and most similar memories.`;
      
      contextMessage += memoryContext;
    }

    const messages = [
      new SystemMessage(agentConfig.systemPrompt + contextMessage),
      new HumanMessage(this.formatUserQuery(request))
    ];

    const response = await this.llm.invoke(messages);
    return response.content as string;
  }

  /**
   * Extract sources from search result
   */
  private extractSourcesFromSearchResult(searchResult: string): string[] {
    const sources: string[] = [];
    const linkRegex = /Link: (https?:\/\/[^\s\n]+)/g;
    let match;

    while ((match = linkRegex.exec(searchResult)) !== null) {
      sources.push(match[1]);
    }

    return sources;
  }

  /**
   * Get agent status information
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      model: agentConfig.model,
      temperature: agentConfig.temperature,
      tools: this.toolsManager.getStatus(),
      memory: this.memoryManager.getStatus(),
    };
  }
}

// Singleton instance
let agentInstance: ResearchAgent | null = null;

/**
 * Get or create the research agent instance
 */
export const getResearchAgent = (): ResearchAgent => {
  if (!agentInstance) {
    agentInstance = new ResearchAgent();
  }
  return agentInstance;
};

/**
 * Reset the agent instance (useful for testing or reconfiguration)
 */
export const resetResearchAgent = (): void => {
  agentInstance = null;
}; 