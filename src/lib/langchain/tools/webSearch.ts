import { Tool } from '@langchain/core/tools';

// Environment variables validation
const requiredEnvVars = {
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
  GOOGLE_CX: process.env.GOOGLE_CX,
};

// Validate required environment variables
Object.entries(requiredEnvVars).forEach(([key, value]) => {
  if (!value) {
    console.warn(`⚠️  ${key} is not set. Please add it to your .env.local file.`);
  }
});

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  source: string;
}

export interface WebSearchResponse {
  results: SearchResult[];
  totalResults: number;
  searchTime: number;
  query: string;
}

interface GoogleSearchResult {
  items?: Array<{
    title: string;
    link: string;
    snippet: string;
  }>;
  searchInformation?: {
    totalResults: string;
  };
}

export class WebSearchError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'WebSearchError';
  }
}

/**
 * Enhanced web search tool using Google Custom Search API
 */
export class EnhancedWebSearchTool extends Tool {
  name = 'web_search';
  description = 'Search the web for current information. Use this tool when you need to find recent or real-time information about topics, news, facts, or any current events.';
  
  private apiKey!: string;
  private cx!: string;
  private isInitialized: boolean = false;

  constructor() {
    super();
    
    const apiKey = process.env.GOOGLE_API_KEY;
    const cx = process.env.GOOGLE_CX;
    
    if (!apiKey || !cx) {
      console.warn('Google Custom Search API not configured. Web search will not be available.');
      this.isInitialized = false;
      return;
    }

    this.apiKey = apiKey;
    this.cx = cx;
    this.isInitialized = true;
    console.log('✅ Google Custom Search API initialized');
  }

  /**
   * Execute web search using Google Custom Search API
   */
  async _call(input: string): Promise<string> {
    if (!this.isInitialized) {
      throw new WebSearchError('Web search is not available. Please check your Google Custom Search API configuration.');
    }

    try {
      const startTime = Date.now();
      
      // Execute search using Google Custom Search API
      const result = await this.performGoogleSearch(input);
      const searchTime = Date.now() - startTime;

      // Parse and format results
      const formattedResults = this.parseGoogleSearchResults(result, input, searchTime);
      
      return this.formatSearchResponse(formattedResults);

    } catch (error) {
      console.error('Web search error:', error);
      
      if (error instanceof WebSearchError) {
        throw error;
      }

      throw new WebSearchError(
        'Failed to perform web search. Please try again.',
        'SEARCH_ERROR'
      );
    }
  }

  /**
   * Perform search using Google Custom Search API
   */
  private async performGoogleSearch(query: string): Promise<GoogleSearchResult> {
    const url = 'https://www.googleapis.com/customsearch/v1';
    const params = new URLSearchParams({
      key: this.apiKey,
      cx: this.cx,
      q: query,
      num: '5', // Limit to 5 results
    });

    const response = await fetch(`${url}?${params}`);
    
    if (!response.ok) {
      throw new WebSearchError(`Google API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Parse Google Custom Search results into structured format
   */
  private parseGoogleSearchResults(rawResult: GoogleSearchResult, query: string, searchTime: number): WebSearchResponse {
    const results: SearchResult[] = [];
    
    // Handle Google Custom Search API response format
    if (rawResult.items && Array.isArray(rawResult.items)) {
      rawResult.items.forEach((item) => {
        results.push({
          title: item.title || 'No title',
          link: item.link || '#',
          snippet: item.snippet || 'No description available',
          source: this.extractDomain(item.link) || 'Unknown source',
        });
      });
    }

    return {
      results,
      totalResults: parseInt(rawResult.searchInformation?.totalResults || '0', 10) || results.length,
      searchTime,
      query,
    };
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '');
    } catch {
      return 'Unknown source';
    }
  }

  /**
   * Format search response for the agent
   */
  private formatSearchResponse(searchResponse: WebSearchResponse): string {
    if (searchResponse.results.length === 0) {
      return `No search results found for "${searchResponse.query}". Please try rephrasing your question.`;
    }

    let formatted = `**Search Results for: "${searchResponse.query}"**\n\n`;
    formatted += `Found ${searchResponse.totalResults} results in ${searchResponse.searchTime}ms\n\n`;

    searchResponse.results.forEach((result, index) => {
      formatted += `**${index + 1}. ${result.title}**\n`;
      formatted += `Source: ${result.source}\n`;
      formatted += `${result.snippet}\n`;
      formatted += `Link: ${result.link}\n\n`;
    });

    formatted += `**Summary:** Based on the search results, I found relevant information about "${searchResponse.query}". `;
    formatted += `The top results include sources from ${searchResponse.results.map(r => r.source).join(', ')}. `;
    formatted += `Would you like me to provide more details about any specific aspect of these results?`;

    return formatted;
  }

  /**
   * Check if web search is available
   */
  isAvailable(): boolean {
    return this.isInitialized;
  }

  /**
   * Get tool status information
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      name: this.name,
      description: this.description,
    };
  }
}

// Singleton instance
let webSearchInstance: EnhancedWebSearchTool | null = null;

/**
 * Get or create the web search tool instance
 */
export const getWebSearchTool = (): EnhancedWebSearchTool => {
  if (!webSearchInstance) {
    webSearchInstance = new EnhancedWebSearchTool();
  }
  return webSearchInstance;
};

/**
 * Reset the web search tool instance (useful for testing or reconfiguration)
 */
export const resetWebSearchTool = (): void => {
  webSearchInstance = null;
}; 