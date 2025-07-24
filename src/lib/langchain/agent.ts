import { ChatGroq } from '@langchain/groq';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createGroqLLM, agentConfig, LangChainError } from './config';

export interface AgentResponse {
  content: string;
  sources?: string[];
  confidence?: number;
  processingTime?: number;
}

export interface AgentRequest {
  query: string;
  context?: string;
  userId?: string;
}

export class ResearchAgent {
  private llm!: ChatGroq;
  private isInitialized: boolean = false;

  constructor() {
    try {
      this.llm = createGroqLLM();
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

      // Prepare messages
      const messages = [
        new SystemMessage(agentConfig.systemPrompt),
        new HumanMessage(this.formatUserQuery(request))
      ];

      // Get response from LLM
      const response = await this.llm.invoke(messages);
      
      const processingTime = Date.now() - startTime;

      // Extract and format response
      const content = response.content as string;
      const formattedContent = this.enhanceResponse(content, request.query);

      return {
        content: formattedContent,
        processingTime,
        confidence: this.calculateConfidence(content),
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
  private enhanceResponse(content: string, originalQuery: string): string {
    let enhanced = content;

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
   * Get agent status information
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      model: agentConfig.model,
      temperature: agentConfig.temperature,
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