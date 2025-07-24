import { ChatGroq } from '@langchain/groq';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { AgentExecutor } from 'langchain/agents';
import { createGroqLLM, agentConfig, LangChainError } from './config';
import { getToolsManager, ToolsManager } from './tools';

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
}

export class ResearchAgent {
  private llm!: ChatGroq;
  private toolsManager!: ToolsManager;
  private agentExecutor: AgentExecutor | null = null;
  private isInitialized: boolean = false;

  constructor() {
    try {
      this.llm = createGroqLLM();
      this.toolsManager = getToolsManager();
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
          // Fallback to direct LLM response
          content = await this.getDirectLLMResponse(request);
        }
      } else {
        // Use direct LLM response
        console.log('🧠 Using LLM knowledge for query:', request.query);
        content = await this.getDirectLLMResponse(request);
      }
      
      const processingTime = Date.now() - startTime;

      // Enhance response with follow-up suggestions
      const formattedContent = this.enhanceResponse(content, request.query, searchUsed, sources);

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

    if (request.context) {
      formattedQuery = `Context: ${request.context}\n\nQuestion: ${formattedQuery}`;
    }

    if (request.userId) {
      formattedQuery = `[User: ${request.userId}]\n${formattedQuery}`;
    }

    return formattedQuery;
  }

  /**
   * Enhance response with additional formatting and suggestions
   */
  private enhanceResponse(content: string, originalQuery: string, searchUsed: boolean, sources: string[]): string {
    let enhanced = content;

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
  private async getDirectLLMResponse(request: AgentRequest): Promise<string> {
    const messages = [
      new SystemMessage(agentConfig.systemPrompt),
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