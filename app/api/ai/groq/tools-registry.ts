// app/api/ai/groq/tools-registry.ts
// Simple, secure read-only tools for Groq AI assistant

import { readFileSync } from 'fs';
import { join } from 'path';
import { 
  getAllTasks, getAllItems, getAllSales, getAllFinancials, 
  getAllSites, getAllCharacters, getAllPlayers, getAllAccounts
} from '@/data-store/datastore';
import { getAllLinks } from '@/links/link-registry';
import { TaskStatus, TaskPriority } from '@/types/enums';

// Security constraints
const MAX_OUTPUT_LENGTH = 5000;
const MAX_RESULTS = 50;

/**
 * Registry of available tools in OpenAI format
 */
export const GROQ_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_project_status',
      description: 'Get current project status and sprint information from PROJECT-STATUS.json',
      parameters: {
        type: 'object',
        properties: {
          include_roadmap: {
            type: 'boolean',
            description: 'Include roadmap information'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'inventory_summary',
      description: 'Get summary of all items in inventory (counts, types, status)',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'task_summary',
      description: 'Get summary of all tasks (counts by status, priority breakdown)',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_docs',
      description: 'Search documentation files in z_md directory',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query'
          },
          doc_type: {
            type: 'string',
            enum: ['wiki', 'analysis', 'refs'],
            description: 'Documentation type'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_links_summary',
      description: 'Get summary of entity relationships and links',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  }
];

/**
 * Execute a tool by name with validated parameters
 */
export async function executeTool(toolName: string, args: any): Promise<any> {
  try {
    // Validate and sanitize parameters
    const sanitizedArgs = sanitizeArgs(args);
    
    switch (toolName) {
      case 'get_project_status':
        return await getProjectStatus(sanitizedArgs.include_roadmap || false);
      
      case 'inventory_summary':
        return await getInventorySummary();
      
      case 'task_summary':
        return await getTaskSummary();
      
      case 'search_docs':
        return await searchDocumentation(sanitizedArgs.query, sanitizedArgs.doc_type);
      
      case 'get_links_summary':
        return await getLinksSummary();
      
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  } catch (error) {
    console.error(`Tool execution error for ${toolName}:`, error);
    return { 
      error: `Failed to execute ${toolName}: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Sanitize tool arguments to prevent injection
 */
function sanitizeArgs(args: any): any {
  const sanitized: any = {};
  
  if (typeof args === 'object' && args !== null) {
    for (const [key, value] of Object.entries(args)) {
      if (typeof value === 'string') {
        // Limit string length and sanitize
        sanitized[key] = String(value).substring(0, 200);
      } else if (typeof value === 'boolean') {
        sanitized[key] = value;
      } else if (typeof value === 'number') {
        sanitized[key] = Math.max(0, Math.min(100, value));
      }
    }
  }
  
  return sanitized;
}

/**
 * Truncate output to prevent excessive responses
 */
function truncateOutput(result: any): any {
  const jsonStr = JSON.stringify(result);
  if (jsonStr.length <= MAX_OUTPUT_LENGTH) {
    return result;
  }
  
  // Return truncated summary
  return {
    _truncated: true,
    _original_length: jsonStr.length,
    data: result,
    message: 'Output truncated due to size limits'
  };
}

// Tool implementations

async function getProjectStatus(includeRoadmap: boolean): Promise<any> {
  try {
    const projectStatusPath = join(process.cwd(), 'PROJECT-STATUS.json');
    const projectStatus = JSON.parse(readFileSync(projectStatusPath, 'utf-8'));
    
    const result: any = {
      current_sprint: projectStatus.currentSprint,
      system_status: projectStatus.systemStatus,
      last_updated: projectStatus.lastUpdated,
      version: projectStatus.version
    };
    
    if (includeRoadmap && projectStatus.roadmap) {
      result.roadmap = projectStatus.roadmap;
    }
    
    return truncateOutput(result);
  } catch (error) {
    return { error: 'Failed to read PROJECT-STATUS.json' };
  }
}

async function getInventorySummary(): Promise<any> {
  try {
    const items = await getAllItems();
    const totalQuantity = items.reduce((sum, item) => 
      sum + item.stock.reduce((stockSum, stock) => stockSum + stock.quantity, 0), 0
    );
    const inStockItems = items.filter(item => 
      item.stock.some(stock => stock.quantity > 0)
    );
    const outOfStockItems = items.filter(item => 
      item.stock.every(stock => stock.quantity === 0)
    );
    const types = [...new Set(items.map(i => i.type))];
    
    return truncateOutput({
      total_items: items.length,
      in_stock: inStockItems.length,
      out_of_stock: outOfStockItems.length,
      total_quantity: totalQuantity,
      types: types.slice(0, 20)
    });
  } catch (error) {
    return { error: 'Failed to get inventory summary' };
  }
}

async function getTaskSummary(): Promise<any> {
  try {
    const tasks = await getAllTasks();
    
    return truncateOutput({
      total: tasks.length,
      by_status: {
        created: tasks.filter(t => t.status === TaskStatus.CREATED).length,
        in_progress: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
        done: tasks.filter(t => t.status === TaskStatus.DONE).length
      },
      by_priority: {
        urgent: tasks.filter(t => t.priority === TaskPriority.URGENT).length,
        important: tasks.filter(t => t.priority === TaskPriority.IMPORTANT).length,
        normal: tasks.filter(t => t.priority === TaskPriority.NORMAL).length,
        slow: tasks.filter(t => t.priority === TaskPriority.SLOW).length
      }
    });
  } catch (error) {
    return { error: 'Failed to get task summary' };
  }
}

async function searchDocumentation(query: string, docType?: string): Promise<any> {
  try {
    if (!query || query.length < 3) {
      return { error: 'Search query must be at least 3 characters' };
    }
    
    const allowedTypes = ['wiki', 'analysis', 'refs'];
    const searchTypes = docType && allowedTypes.includes(docType) 
      ? [docType] 
      : allowedTypes;
    
    const results: any[] = [];
    
    for (const type of searchTypes) {
      try {
        const docsDir = join(process.cwd(), 'z_md', type);
        const fs = require('fs');
        
        if (!fs.existsSync(docsDir)) continue;
        
        const files = fs.readdirSync(docsDir)
          .filter((file: string) => file.endsWith('.md'));
        
        for (const file of files.slice(0, 10)) {
          const content = readFileSync(join(docsDir, file), 'utf-8');
          if (content.toLowerCase().includes(query.toLowerCase())) {
            results.push({
              type,
              filename: file,
              preview: content.substring(0, 300)
            });
          }
        }
      } catch (error) {
        // Skip if directory doesn't exist
      }
    }
    
    return truncateOutput({
      query,
      count: results.length,
      results: results.slice(0, 10)
    });
  } catch (error) {
    return { error: 'Failed to search documentation' };
  }
}

async function getLinksSummary(): Promise<any> {
  try {
    const links = await getAllLinks();
    const linkTypes = [...new Set(links.map(l => l.linkType))];
    
    const typeCounts: Record<string, number> = {};
    for (const linkType of linkTypes) {
      typeCounts[linkType] = links.filter(l => l.linkType === linkType).length;
    }
    
    return truncateOutput({
      total_links: links.length,
      link_types: linkTypes,
      counts_by_type: typeCounts
    });
  } catch (error) {
    return { error: 'Failed to get links summary' };
  }
}

