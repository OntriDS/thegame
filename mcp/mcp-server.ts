// lib/mcp/mcp-server-enhanced.ts
// Enhanced MCP Server for AI model integration with pixelbrain support
// This file provides enhanced MCP server functionality with tool metadata,
// usage tracking, and pixelbrain discovery capabilities

import fs from 'fs';
import path from 'path';
import { logger } from '@/lib/utils/logger';
import { toolRegistry } from '../tools/registry';

const DEFAULT_LIST_LIMIT = 50;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Tool capability for pixelbrain discovery
 */
export interface ToolCapability {
  name: string;
  description: string;
  parameters: string[];
  returns: string[];
  requiresAuth: boolean;
  rateLimit?: number;
  caching?: boolean;
  cacheTTL?: number;
}

/**
 * Tool metadata for discovery and documentation
 */
export interface ToolMetadata {
  tags: string[];
  roles: string[];
  [key: string]: any;
}

/**
 * Tool usage statistics
 */
export interface ToolUsageStats {
  toolName: string;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageLatency: number;
  lastCalled: Date;
  lastError?: string;
}

/**
 * Tool example for documentation
 */
export interface ToolExample {
  name: string;
  description: string;
  input: Record<string, any>;
  output: any;
}

/**
 * Enhanced MCP Tool interface with metadata
 */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
  handler: (args: any) => Promise<any>;
  metadata: ToolMetadata;
}



/**
 * Server information for pixelbrain discovery
 */
export interface ServerInfo {
  version: string;
  capabilities: string[];
  toolCount: number;
  supportedCategories: string[];
  requiresAuth: boolean;
  supportsStreaming: boolean;
  supportsCaching: boolean;
  maxConnections: number;
}

/**
 * Tool discovery response for pixelbrain
 */
export interface ToolDiscoveryResponse {
  tools: Array<{
    name: string;
    description: string;
    tags: string[];
    roles: string[];
  }>;
  serverInfo: ServerInfo;
  totalTools: number;
  categories: string[];
}

// ============================================================================
// ENHANCED MCP SERVER CLASS
// ============================================================================

export class EnhancedMCPServer {
  private tools: Map<string, MCPTool> = new Map();
  private usageStats: Map<string, ToolUsageStats> = new Map();
  private serverVersion: string = '1.2.0';
  private serverCapabilities: string[] = [
    'tasks',
    'items',
    'characters',
    'players',
    'sites',
    'sales',
    'logs',
    'system',
    'archive',
    'analytics',
  ];

  constructor() {
    this.registerTools();
    this.initializeUsageTracking();
  }

  /**
   * Initialize usage tracking for all tools
   */
  private initializeUsageTracking(): void {
    this.tools.forEach((tool, toolName) => {
      this.usageStats.set(toolName, {
        toolName,
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        averageLatency: 0,
        lastCalled: new Date(),
      });
    });

    logger.info('Usage tracking initialized', { toolCount: this.tools.size });
  }

  /**
   * Record tool usage statistics
   */
  private recordUsage(
    toolName: string,
    success: boolean,
    latency: number,
    errorMessage?: string
  ): void {
    const stats = this.usageStats.get(toolName);
    if (stats) {
      stats.totalCalls++;
      stats.lastCalled = new Date();

      if (success) {
        stats.successfulCalls++;
      } else {
        stats.failedCalls++;
        stats.lastError = errorMessage;
      }

      // Update average latency
      const totalLatency = stats.averageLatency * (stats.totalCalls - 1) + latency;
      stats.averageLatency = totalLatency / stats.totalCalls;
    }
  }

  /**
   * Get usage statistics for a tool
   */
  public getToolUsageStats(toolName: string): ToolUsageStats | undefined {
    return this.usageStats.get(toolName);
  }

  /**
   * Get all usage statistics
   */
  public getAllUsageStats(): Map<string, ToolUsageStats> {
    return this.usageStats;
  }

  /**
   * Get server information for pixelbrain discovery
   */
  public getServerInfo(): ServerInfo {
    return {
      version: this.serverVersion,
      capabilities: this.serverCapabilities,
      toolCount: this.tools.size,
      supportedCategories: ['thegame'],
      requiresAuth: true,
      supportsStreaming: false,
      supportsCaching: true,
      maxConnections: 100,
    };
  }

  /**
   * Discover tools for pixelbrain integration
   */
  public discoverTools(): ToolDiscoveryResponse {
    const tools = Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      tags: tool.metadata.tags,
      roles: tool.metadata.roles,
    }));

    const categories = ['thegame'];

    logger.info('Tools discovered', { toolCount: tools.length, categories });

    return {
      tools,
      serverInfo: this.getServerInfo(),
      totalTools: tools.length,
      categories,
    };
  }

  /**
   * Register all tools with enhanced metadata
   */
  private registerTools() {
    let toolboxData = { tools: [] as any[] };
    try {
      const toolboxPath = path.resolve(process.cwd(), 'tools', 'toolbox.json');
      const content = fs.readFileSync(toolboxPath, 'utf8');
      toolboxData = JSON.parse(content);
    } catch (error) {
      logger.error('Failed to load tools/toolbox.json in TheGame MCP server', { error: String(error) });
    }

    const schemas = new Map<string, any>();
    for (const t of toolboxData.tools) {
      schemas.set(t.id, t);
    }

    for (const [id, handler] of toolRegistry.entries()) {
      const schema = schemas.get(id);
      if (!schema) {
        logger.warn(`Handler defined for ${id} but schema not found in toolbox.json. Skipping.`);
        continue;
      }
      
      const wrappedHandler = async (args: any) => {
        const startTime = Date.now();
        try {
          const result = await handler(args);
          this.recordUsage(id, true, Date.now() - startTime);
          return result;
        } catch (error) {
          this.recordUsage(id, false, Date.now() - startTime, (error as Error).message);
          throw error;
        }
      };

      this.registerTool({
        name: schema.id,
        description: schema.description,
        inputSchema: schema.parameters,
        metadata: { tags: schema.tags, roles: schema.roles },
        handler: wrappedHandler,
      });
    }
  }

  /**
   * Register a single tool
   */
  private registerTool(tool: MCPTool): void {
    this.tools.set(tool.name, tool);
    logger.debug('Tool registered', {
      name: tool.name,
    });
  }

  /**
   * Get all tools
   */
  public getTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools by category
   */
  public getToolsByCategory(category: string): MCPTool[] {
    return Array.from(this.tools.values()).filter(
      (tool) => tool.metadata.category === category
    );
  }

  /**
   * Get tools by tag
   */
  public getToolsByTag(tag: string): MCPTool[] {
    return Array.from(this.tools.values()).filter((tool) =>
      tool.metadata.tags.includes(tag)
    );
  }

  /**
   * Get deprecated tools
   */
  public getDeprecatedTools(): MCPTool[] {
    return [];
  }

  /**
   * Call a tool with usage tracking
   */
  public async callTool(name: string, args: any): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }

    if (false) {
      // Reserved for deprecation logic
    }

    const startTime = Date.now();
    try {
      const result = await tool.handler(args);
      this.recordUsage(name, true, Date.now() - startTime);
      return result;
    } catch (error) {
      this.recordUsage(name, false, Date.now() - startTime, (error as Error).message);
      throw error;
    }
  }

  /**
   * Get tool schema with metadata
   */
  public getToolSchema(name: string): any {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }

    return {
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      metadata: tool.metadata,
    };
  }

  /**
   * Get all tool schemas
   */
  public getAllToolSchemas(): any[] {
    return Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      metadata: tool.metadata,
    }));
  }

  /**
   * Validate tool input
   */
  public validateToolInput(toolName: string, input: any): ValidationResult {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return {
        valid: false,
        errors: [`Tool ${toolName} not found`],
        warnings: [],
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validation logic (simplified)

    // Validate against schema (basic implementation)
    const requiredProperties = tool.inputSchema.required || [];
    for (const prop of requiredProperties) {
      if (!input[prop]) {
        errors.push(`Missing required property: ${prop}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

/**
 * Validation result
 */
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// EXPORTS
// ============================================================================

// Export singleton instance
export const enhancedMcpServer = new EnhancedMCPServer();
