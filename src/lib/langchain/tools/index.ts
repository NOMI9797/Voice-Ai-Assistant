import { Tool } from '@langchain/core/tools';
import { getWebSearchTool, EnhancedWebSearchTool } from './webSearch';

// Lazy load processors to avoid initialization issues
let getPDFProcessor: any = null;
let getYouTubeProcessor: any = null;

const loadProcessors = async () => {
  if (!getPDFProcessor) {
    try {
      const pdfModule = await import('./pdfProcessor');
      getPDFProcessor = pdfModule.getPDFProcessor;
    } catch (error) {
      console.error('Failed to load PDF processor:', error);
    }
  }
  
  if (!getYouTubeProcessor) {
    try {
      const youtubeModule = await import('./youtubeProcessor');
      getYouTubeProcessor = youtubeModule.getYouTubeProcessor;
    } catch (error) {
      console.error('Failed to load YouTube processor:', error);
    }
  }
};

export interface ToolStatus {
  name: string;
  description: string;
  isAvailable: boolean;
  isInitialized: boolean;
}

export class ToolsManager {
  private tools: Map<string, Tool> = new Map();
  private isInitialized: boolean = false;

  constructor() {
    // Initialize tools asynchronously
    this.initializeTools().catch(error => {
      console.error('Failed to initialize tools:', error);
    });
  }

  /**
   * Initialize all available tools
   */
  private async initializeTools(): Promise<void> {
    try {
      // Initialize web search tool
      const webSearchTool = getWebSearchTool();
      if (webSearchTool.isAvailable()) {
        this.tools.set('web_search', webSearchTool);
        console.log('✅ Web search tool initialized');
      } else {
        console.warn('⚠️  Web search tool not available');
      }

      // Lazy load processors
      await loadProcessors();

      // Initialize PDF processor tool
      if (getPDFProcessor) {
        const pdfProcessorTool = getPDFProcessor();
        this.tools.set('pdf_processor', pdfProcessorTool);
        console.log('✅ PDF processor tool initialized');
      } else {
        console.warn('⚠️  PDF processor tool not available');
      }

      // Initialize YouTube processor tool
      if (getYouTubeProcessor) {
        const youtubeProcessorTool = getYouTubeProcessor();
        this.tools.set('youtube_processor', youtubeProcessorTool);
        console.log('✅ YouTube processor tool initialized');
      } else {
        console.warn('⚠️  YouTube processor tool not available');
      }

      this.isInitialized = true;
      console.log(`✅ Tools manager initialized with ${this.tools.size} tools`);
    } catch (error) {
      console.error('Failed to initialize tools manager:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Get all available tools
   */
  getTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get a specific tool by name
   */
  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if a tool is available
   */
  isToolAvailable(name: string): boolean {
    const tool = this.tools.get(name);
    if (tool instanceof EnhancedWebSearchTool) {
      return tool.isAvailable();
    }
    return !!tool;
  }

  /**
   * Get status of all tools
   */
  getToolsStatus(): ToolStatus[] {
    const status: ToolStatus[] = [];

    // Web search tool status
    const webSearchTool = this.tools.get('web_search') as EnhancedWebSearchTool;
    if (webSearchTool) {
      const toolStatus = webSearchTool.getStatus();
      status.push({
        name: toolStatus.name,
        description: toolStatus.description,
        isAvailable: webSearchTool.isAvailable(),
        isInitialized: toolStatus.isInitialized,
      });
    } else {
      status.push({
        name: 'web_search',
        description: 'Search the web for current information',
        isAvailable: false,
        isInitialized: false,
      });
    }

    // PDF processor tool status
    const pdfProcessorTool = this.tools.get('pdf_processor');
    status.push({
      name: 'pdf_processor',
      description: 'Process and analyze PDF documents',
      isAvailable: !!pdfProcessorTool,
      isInitialized: !!pdfProcessorTool,
    });

    // YouTube processor tool status
    const youtubeProcessorTool = this.tools.get('youtube_processor');
    status.push({
      name: 'youtube_processor',
      description: 'Process and analyze YouTube videos',
      isAvailable: !!youtubeProcessorTool,
      isInitialized: !!youtubeProcessorTool,
    });

    return status;
  }

  /**
   * Check if tools manager is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.tools.size > 0;
  }

  /**
   * Get tools manager status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      totalTools: this.tools.size,
      availableTools: this.getToolsStatus(),
    };
  }
}

// Singleton instance
let toolsManagerInstance: ToolsManager | null = null;

/**
 * Get or create the tools manager instance
 */
export const getToolsManager = (): ToolsManager => {
  if (!toolsManagerInstance) {
    toolsManagerInstance = new ToolsManager();
  }
  return toolsManagerInstance;
};

/**
 * Reset the tools manager instance (useful for testing or reconfiguration)
 */
export const resetToolsManager = (): void => {
  toolsManagerInstance = null;
}; 