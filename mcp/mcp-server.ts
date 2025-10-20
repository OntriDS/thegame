// lib/mcp/mcp-server.ts
// MCP Server for AI model integration with existing DataStore

import * as DataStore from '@/data-store/datastore';
import { appendEntityLog, updateEntityLogField } from '@/workflows/entities-logging';
import { Task, Item, Character, Player, Site, Sale } from '@/types/entities';
import { ItemStatus, TaskType, TaskStatus, TaskPriority, ItemType, ItemCategory } from '@/types/enums';

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
  handler: (args: any) => Promise<any>;
}

export class MCPServer {
  private tools: Map<string, MCPTool> = new Map();

  constructor() {
    this.registerTools();
  }

  private registerTools() {
    // Task operations
    this.registerTool({
      name: 'get_tasks',
      description: 'Get all tasks from the system',
      inputSchema: {
        type: 'object',
        properties: {
          status: { type: 'string', description: 'Filter by task status' },
          limit: { type: 'number', description: 'Maximum number of tasks to return' }
        }
      },
      handler: async (args) => {
        const tasks = await DataStore.getAllTasks();
        if (args.status) {
          return tasks.filter(task => task.status === args.status);
        }
        if (args.limit) {
          return tasks.slice(0, args.limit);
        }
        return tasks;
      }
    });

    this.registerTool({
      name: 'create_task',
      description: 'Create a new task',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Task title' },
          description: { type: 'string', description: 'Task description' },
          status: { type: 'string', description: 'Task status', default: 'pending' },
          priority: { type: 'string', description: 'Task priority', default: 'medium' }
        },
        required: ['title']
      },
      handler: async (args) => {
        const task: Task = {
          id: crypto.randomUUID(),
          name: args.title,
          description: args.description || '',
          type: TaskType.ASSIGNMENT,
          status: args.status || TaskStatus.CREATED,
          priority: args.priority || TaskPriority.NORMAL,
          station: 'Strategy',
          progress: 0,
          order: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          links: [],
          // Add other required fields with defaults
          dueDate: undefined,
          parentId: null,
          isRecurrentParent: false,
          isTemplate: false,
          outputItemId: null,
          siteId: null,
          targetSiteId: null,
          sourceSaleId: null,
          customerCharacterId: null,
          outputItemType: undefined,
          outputItemSubType: undefined,
          outputQuantity: undefined,
          outputUnitCost: undefined,
          outputItemPrice: undefined,
          isNewItem: false,
          isSold: false,
          outputItemStatus: undefined,
          doneAt: undefined,
          collectedAt: undefined,
          cost: 0,
          revenue: 0,
          isNotPaid: false,
          isNotCharged: false,
          rewards: { points: { xp: 0, rp: 0, fp: 0, hp: 0 } },
          isCollected: false
        };
        return await DataStore.upsertTask(task);
      }
    });

    this.registerTool({
      name: 'update_task',
      description: 'Update an existing task',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Task ID' },
          updates: { type: 'object', description: 'Fields to update' }
        },
        required: ['id', 'updates']
      },
      handler: async (args) => {
        const tasks = await DataStore.getAllTasks();
        const existingTask = tasks.find(task => task.id === args.id);
        if (!existingTask) {
          throw new Error(`Task with ID ${args.id} not found`);
        }
        const updatedTask = { ...existingTask, ...args.updates, updatedAt: new Date() };
        return await DataStore.upsertTask(updatedTask);
      }
    });

    this.registerTool({
      name: 'delete_task',
      description: 'Delete a task',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Task ID' }
        },
        required: ['id']
      },
      handler: async (args) => {
        await DataStore.removeTask(args.id);
        return { success: true, message: `Task ${args.id} deleted` };
      }
    });

    // Item operations
    this.registerTool({
      name: 'get_items',
      description: 'Get all items from the system',
      inputSchema: {
        type: 'object',
        properties: {
          type: { type: 'string', description: 'Filter by item type' },
          limit: { type: 'number', description: 'Maximum number of items to return' }
        }
      },
      handler: async (args) => {
        const items = await DataStore.getAllItems();
        if (args.type) {
          return items.filter(item => item.type === args.type);
        }
        if (args.limit) {
          return items.slice(0, args.limit);
        }
        return items;
      }
    });

    this.registerTool({
      name: 'create_item',
      description: 'Create a new item',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Item name' },
          description: { type: 'string', description: 'Item description' },
          type: { type: 'string', description: 'Item type' },
          value: { type: 'number', description: 'Item value' }
        },
        required: ['name', 'type']
      },
      handler: async (args) => {
        const item: Item = {
          id: crypto.randomUUID(),
          name: args.name,
          description: args.description || '',
          type: args.type as ItemType,
          status: ItemStatus.CREATED,
          station: 'Strategy',
          stock: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          links: [],
          // Add other required fields with defaults
          dimensions: undefined,
          size: undefined,
          unitCost: args.value || 0,
          additionalCost: 0,
          price: args.value || 0,
          value: 0,
          quantitySold: 0,
          targetAmount: undefined,
          isCollected: false
        };
        return await DataStore.upsertItem(item);
      }
    });

    // Character operations
    this.registerTool({
      name: 'get_characters',
      description: 'Get all characters from the system',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Maximum number of characters to return' }
        }
      },
      handler: async (args) => {
        const characters = await DataStore.getAllCharacters();
        if (args.limit) {
          return characters.slice(0, args.limit);
        }
        return characters;
      }
    });

    // Player operations
    this.registerTool({
      name: 'get_players',
      description: 'Get all players from the system',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Maximum number of players to return' }
        }
      },
      handler: async (args) => {
        const players = await DataStore.getAllPlayers();
        if (args.limit) {
          return players.slice(0, args.limit);
        }
        return players;
      }
    });

    // Site operations
    this.registerTool({
      name: 'get_sites',
      description: 'Get all sites from the system',
      inputSchema: {
        type: 'object',
        properties: {
          type: { type: 'string', description: 'Filter by site type' },
          limit: { type: 'number', description: 'Maximum number of sites to return' }
        }
      },
      handler: async (args) => {
        const sites = await DataStore.getAllSites();
        if (args.type) {
          return sites.filter(site => site.metadata?.type === args.type);
        }
        if (args.limit) {
          return sites.slice(0, args.limit);
        }
        return sites;
      }
    });

    // Sales operations
    this.registerTool({
      name: 'get_sales',
      description: 'Get all sales from the system',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Maximum number of sales to return' }
        }
      },
      handler: async (args) => {
        const sales = await DataStore.getAllSales();
        if (args.limit) {
          return sales.slice(0, args.limit);
        }
        return sales;
      }
    });

    // Log operations
    this.registerTool({
      name: 'get_logs',
      description: 'Get log entries for a specific entity type',
      inputSchema: {
        type: 'object',
        properties: {
          logType: { type: 'string', description: 'Log type (tasks, items, character, player, sales, sites)' },
          limit: { type: 'number', description: 'Maximum number of log entries to return' }
        },
        required: ['logType']
      },
      handler: async (args) => {
        // For now, return a simple message since we don't have a getLogEntries function
        // This would need to be implemented in entities-logging.ts if needed
        return { message: 'Log retrieval not yet implemented', logType: args.logType };
      }
    });

    // System operations
    this.registerTool({
      name: 'get_system_status',
      description: 'Get overall system status and entity counts',
      inputSchema: {
        type: 'object',
        properties: {}
      },
      handler: async () => {
        const [tasks, items, characters, players, sites, sales] = await Promise.all([
          DataStore.getAllTasks(),
          DataStore.getAllItems(),
          DataStore.getAllCharacters(),
          DataStore.getAllPlayers(),
          DataStore.getAllSites(),
          DataStore.getAllSales()
        ]);

        return {
          status: 'operational',
          entityCounts: {
            tasks: tasks.length,
            items: items.length,
            characters: characters.length,
            players: players.length,
            sites: sites.length,
            sales: sales.length
          },
          timestamp: new Date().toISOString()
        };
      }
    });

    // Reset operations (for AI-assisted resets)
    this.registerTool({
      name: 'reset_system',
      description: 'Reset the system to defaults (use with caution)',
      inputSchema: {
        type: 'object',
        properties: {
          mode: { type: 'string', description: 'Reset mode (clear, defaults, backfill)', default: 'defaults' }
        }
      },
      handler: async (args) => {
        // Reset functionality not yet implemented in new architecture
        return { message: 'Reset functionality not yet implemented', mode: args.mode };
      }
    });
  }

  private registerTool(tool: MCPTool) {
    this.tools.set(tool.name, tool);
  }

  public getTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  public async callTool(name: string, args: any): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }
    return await tool.handler(args);
  }

  public getToolSchema(name: string): any {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }
    return {
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    };
  }
}

// Export singleton instance
export const mcpServer = new MCPServer();
