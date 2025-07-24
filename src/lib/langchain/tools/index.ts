import { Tool } from '@langchain/core/tools';
import { getWebSearchTool, EnhancedWebSearchTool } from './webSearch';

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
    this.initializeTools();
  }

  /**
   * Initialize all available tools
   */
  private initializeTools(): void {
    try {
      // Initialize web search tool
      const webSearchTool = getWebSearchTool();
      if (webSearchTool.isAvailable()) {
        this.tools.set('web_search', webSearchTool);
        console.log('✅ Web search tool initialized');
      } else {
        console.warn('⚠️  Web search tool not available');
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