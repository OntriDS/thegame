// lib/mcp/mcp-server-enhanced.ts
// Enhanced MCP Server for AI model integration with pixelbrain support
// This file provides enhanced MCP server functionality with tool metadata,
// usage tracking, and pixelbrain discovery capabilities

import * as DataStore from '@/data-store/datastore';
import { appendEntityLog, updateEntityLogField } from '@/workflows/entities-logging';
import { Task, Item, Character, Player, Site, Sale } from '@/types/entities';
import { ItemStatus, TaskType, TaskStatus, TaskPriority, ItemType, ItemCategory } from '@/types/enums';
import { logger } from '@/lib/utils/logger';

const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 200;

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
  version: string;
  category: string;
  capabilities: ToolCapability[];
  deprecated: boolean;
  deprecationDate?: Date;
  replacementTool?: string;
  examples: ToolExample[];
  tags: string[];
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

function parseStringArrayFilter(value: unknown): string[] | undefined | null {
  if (value === undefined) return undefined;
  if (typeof value === 'string') {
    const parsed = value.trim();
    return parsed ? [parsed] : [];
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : String(item || '').trim()))
      .filter((item) => item.length > 0);
  }
  return null;
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
    version: string;
    category: string;
    capabilities: ToolCapability[];
    deprecated: boolean;
    replacementTool?: string;
    examples: ToolExample[];
    tags: string[];
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
    const categories = Array.from(
      new Set(Array.from(this.tools.values()).map((tool) => tool.metadata.category))
    );

    return {
      version: this.serverVersion,
      capabilities: this.serverCapabilities,
      toolCount: this.tools.size,
      supportedCategories: categories,
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
      version: tool.metadata.version,
      category: tool.metadata.category,
      capabilities: tool.metadata.capabilities,
      deprecated: tool.metadata.deprecated,
      replacementTool: tool.metadata.replacementTool,
      examples: tool.metadata.examples,
      tags: tool.metadata.tags,
    }));

    const categories = Array.from(
      new Set(tools.map((tool) => tool.category))
    );

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
    // Task operations
    this.registerTool({
      name: 'get_tasks',
      description: 'Get all tasks from the system with optional filtering',
      inputSchema: {
        type: 'object',
        properties: {
          status: { type: 'string', description: 'Filter by task status' },
          limit: { type: 'number', description: 'Maximum number of tasks to return' },
        },
      },
      metadata: {
        version: '1.1.0',
        category: 'tasks',
        capabilities: [
          {
            name: 'query',
            description: 'Query tasks with filters',
            parameters: ['status', 'limit'],
            returns: ['Task[]'],
            requiresAuth: true,
            rateLimit: 100,
            caching: true,
            cacheTTL: 300,
          },
        ],
        deprecated: false,
        examples: [
          {
            name: 'Get all tasks',
            description: 'Retrieve all tasks from the system',
            input: {},
            output: { tasks: [] },
          },
          {
            name: 'Get completed tasks',
            description: 'Retrieve only completed tasks',
            input: { status: 'completed' },
            output: { tasks: [] },
          },
        ],
        tags: ['read', 'tasks', 'query'],
      },
      handler: async (args) => {
        const startTime = Date.now();
        try {
          const tasks = await DataStore.getAllTasks();
          let result = tasks;

          if (args.status) {
            result = tasks.filter((task) => task.status === args.status);
          }
          if (args.limit) {
            result = result.slice(0, args.limit);
          }

          this.recordUsage('get_tasks', true, Date.now() - startTime);
          return result;
        } catch (error) {
          this.recordUsage('get_tasks', false, Date.now() - startTime, (error as Error).message);
          throw new Error(`Failed to get tasks: ${(error as Error).message}`);
        }
      },
    });

    // Item operations
    this.registerTool({
      name: 'get_items_by_category',
      description: 'Get items filtered by item type and/or sub-item type.',
      inputSchema: {
        type: 'object',
        properties: {
          types: {
            anyOf: [
              { type: 'string', description: 'Single ItemType value' },
              { type: 'array', items: { type: 'string' }, description: 'One or more ItemType values' },
            ],
          },
          subTypes: {
            anyOf: [
              { type: 'string', description: 'Single item subItemType value' },
              { type: 'array', items: { type: 'string' }, description: 'One or more item subItemType values' },
            ],
          },
          limit: { type: 'number', description: 'Maximum number of items to return' },
          offset: { type: 'number', description: 'Pagination offset' },
        },
        required: ['limit'],
      },
      metadata: {
        version: '1.1.0',
        category: 'items',
        capabilities: [
          {
            name: 'query',
            description: 'Query items using optional type/subItemType filters.',
            parameters: ['types', 'subTypes', 'limit', 'offset'],
            returns: ['Item[]'],
            requiresAuth: true,
          },
        ],
        deprecated: false,
        examples: [
          {
            name: 'Get artwork items',
            description: 'Get all ARTWORK items',
            input: { types: ['ARTWORK'], limit: 50 },
            output: { items: [] },
          },
        ],
        tags: ['read', 'items', 'query'],
      },
      handler: async (args) => {
        const startTime = Date.now();
        try {
          const types = parseStringArrayFilter(args.types);
          const subTypes = parseStringArrayFilter(args.subTypes);
          const limit = Number(args.limit);
          const offset = Number(args.offset);
          if (types === null) {
            throw new Error('`types` must be a string or string array.');
          }
          if (subTypes === null) {
            throw new Error('`subTypes` must be a string or string array.');
          }
          const normalizedLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), MAX_LIST_LIMIT) : DEFAULT_LIST_LIMIT;
          const normalizedOffset = Number.isFinite(offset) && offset > 0 ? Math.floor(offset) : 0;

          let items: any[] = [];
          if (types !== undefined && subTypes !== undefined) {
            if (types.length === 0 || subTypes.length === 0) {
              items = [];
            } else {
              const byTypes = await DataStore.getItemsByType(types);
              const bySubTypes = await DataStore.getItemsBySubType(subTypes);
              const subTypeIdSet = new Set(bySubTypes.map((item) => item.id));
              items = byTypes.filter((item) => subTypeIdSet.has(item.id));
            }
          } else if (types !== undefined) {
            items = await DataStore.getItemsByType(types);
          } else if (subTypes !== undefined) {
            items = await DataStore.getItemsBySubType(subTypes);
          } else {
            items = await DataStore.getAllItems();
          }

          const slice = items.slice(
            normalizedOffset,
            normalizedOffset + normalizedLimit
          );
          const data = {
            items: slice,
            count: slice.length,
            total: items.length,
            offset: normalizedOffset,
            limit: normalizedLimit,
            hasMore: normalizedOffset + normalizedLimit < items.length,
          };
          this.recordUsage('get_items_by_category', true, Date.now() - startTime);
          return data;
        } catch (error) {
          this.recordUsage('get_items_by_category', false, Date.now() - startTime, (error as Error).message);
          throw new Error(`Failed to get items by category: ${(error as Error).message}`);
        }
      },
    });

    this.registerTool({
      name: 'get_item_counts',
      description: 'Get item counts by optional item type and/or sub-item type filters.',
      inputSchema: {
        type: 'object',
        properties: {
          types: {
            anyOf: [
              { type: 'string', description: 'Single ItemType value' },
              { type: 'array', items: { type: 'string' }, description: 'One or more ItemType values' },
            ],
          },
          subTypes: {
            anyOf: [
              { type: 'string', description: 'Single item subItemType value' },
              { type: 'array', items: { type: 'string' }, description: 'One or more item subItemType values' },
            ],
          },
        },
      },
      metadata: {
        version: '1.1.0',
        category: 'items',
        capabilities: [
          {
            name: 'query',
            description: 'Count items using optional type/subItemType filters.',
            parameters: ['types', 'subTypes'],
            returns: ['{ count: number }'],
            requiresAuth: true,
          },
        ],
        deprecated: false,
        examples: [
          {
            name: 'Count artwork items',
            description: 'Count all ARTWORK items',
            input: { types: ['ARTWORK'] },
            output: { count: 0 },
          },
        ],
        tags: ['read', 'items', 'query', 'counts'],
      },
      handler: async (args) => {
        const startTime = Date.now();
        try {
          const types = parseStringArrayFilter(args.types);
          const subTypes = parseStringArrayFilter(args.subTypes);
          if (types === null) {
            throw new Error('`types` must be a string or string array.');
          }
          if (subTypes === null) {
            throw new Error('`subTypes` must be a string or string array.');
          }
          const count = await DataStore.countItems(types, subTypes);
          const data = { count };
          this.recordUsage('get_item_counts', true, Date.now() - startTime);
          return data;
        } catch (error) {
          this.recordUsage('get_item_counts', false, Date.now() - startTime, (error as Error).message);
          throw new Error(`Failed to get item counts: ${(error as Error).message}`);
        }
      },
    });

    // Additional tools with enhanced metadata...
    // (Continue with other tools following the same pattern)
  }

  /**
   * Register a single tool
   */
  private registerTool(tool: MCPTool): void {
    this.tools.set(tool.name, tool);
    logger.debug('Tool registered', {
      name: tool.name,
      category: tool.metadata.category,
      version: tool.metadata.version,
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
    return Array.from(this.tools.values()).filter(
      (tool) => tool.metadata.deprecated
    );
  }

  /**
   * Call a tool with usage tracking
   */
  public async callTool(name: string, args: any): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }

    // Check if tool is deprecated
    if (tool.metadata.deprecated) {
      logger.warn('Using deprecated tool', {
        toolName: name,
        replacementTool: tool.metadata.replacementTool,
      });
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
      version: tool.metadata.version,
      category: tool.metadata.category,
      deprecated: tool.metadata.deprecated,
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
      version: tool.metadata.version,
      category: tool.metadata.category,
      deprecated: tool.metadata.deprecated,
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

    // Check deprecated tools
    if (tool.metadata.deprecated) {
      warnings.push(
        `Tool ${toolName} is deprecated. Use ${tool.metadata.replacementTool} instead.`
      );
    }

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
