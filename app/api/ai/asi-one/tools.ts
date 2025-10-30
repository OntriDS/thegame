// app/api/ai/asi-one/tools.ts
import { readFileSync } from 'fs';
import { join } from 'path';
import { 
  getAllTasks, getAllItems, getAllSales, getAllFinancials, 
  getAllSites, getAllCharacters, getAllPlayers, getAllAccounts
} from '@/data-store/datastore';
import { getAllLinks } from '@/links/link-registry';
import { EntityType, TaskStatus, TaskPriority } from '@/types/enums';
import type { Task, Item, Sale, FinancialRecord, Site, Character, Player, Account, Link } from '@/types/entities';

// Tool definitions for ASI:One
export const ASI_ONE_TOOLS = [
  {
    type: "function",
    function: {
      name: "fetch_entity_data",
      description: "Query any entity type from the THEGAME project (tasks, items, sales, characters, etc.)",
      parameters: {
        type: "object",
        properties: {
          entity_type: {
            type: "string",
            enum: ["task", "item", "sale", "financial", "site", "character", "player", "account"],
            description: "Type of entity to query"
          },
          limit: {
            type: "number",
            description: "Maximum number of entities to return (default: 50)"
          },
          filters: {
            type: "object",
            description: "Optional filters to apply to the query",
            properties: {
              status: { type: "string" },
              station: { type: "string" },
              priority: { type: "string" },
              category: { type: "string" }
            }
          }
        },
        required: ["entity_type"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_site_names",
      description: "Return a list of all site names in the project.",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "check_account_connection_status",
      description: "Check whether the current chat is connected to the user's ASI agent account.",
      parameters: {
        type: "object",
        properties: {
          handle: { type: "string", description: "Expected user handle, e.g. pixelbrain" }
        },
        required: ["handle"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "agent_verification",
      description: "Verify agent connectivity details (no-op helper when using non-agentic models).",
      parameters: {
        type: "object",
        properties: {
          expected_address: { type: "string", description: "Expected agent address (if known)" },
          action: { type: "string", description: "Verification action requested" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_project_status",
      description: "Get current project status, sprint information, and system state from PROJECT-STATUS.json",
      parameters: {
        type: "object",
        properties: {
          include_roadmap: {
            type: "boolean",
            description: "Include roadmap information (default: false)"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_dev_logs",
      description: "Search development logs and research notes for specific information",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query for logs"
          },
          log_type: {
            type: "string",
            enum: ["dev", "research", "notes"],
            description: "Type of log to search (default: all)"
          },
          limit: {
            type: "number",
            description: "Maximum number of log entries to return (default: 20)"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_entity_relationships",
      description: "Get relationships and links between entities in the system",
      parameters: {
        type: "object",
        properties: {
          entity_id: {
            type: "string",
            description: "ID of entity to get relationships for"
          },
          relationship_type: {
            type: "string",
            description: "Type of relationship to filter by (optional)"
          },
          include_metadata: {
            type: "boolean",
            description: "Include relationship metadata (default: true)"
          }
        },
        required: ["entity_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "fetch_documentation",
      description: "Fetch documentation files from z_md directory (wiki, analysis, refs, etc.)",
      parameters: {
        type: "object",
        properties: {
          doc_type: {
            type: "string",
            enum: ["wiki", "analysis", "refs", "improvements", "tests-clean"],
            description: "Type of documentation to fetch"
          },
          filename: {
            type: "string",
            description: "Specific filename to fetch (optional)"
          },
          search_query: {
            type: "string",
            description: "Search query within documentation (optional)"
          }
        },
        required: ["doc_type"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_system_state",
      description: "Get comprehensive system state including all entities, links, and current operations",
      parameters: {
        type: "object",
        properties: {
          include_entities: {
            type: "boolean",
            description: "Include entity counts and summaries (default: true)"
          },
          include_links: {
            type: "boolean",
            description: "Include relationship data (default: true)"
          },
          include_logs: {
            type: "boolean",
            description: "Include recent log data (default: false)"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_project_data",
      description: "Search across all project data including entities, logs, documentation, and status",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query"
          },
          search_scope: {
            type: "array",
            items: { type: "string" },
            enum: ["entities", "logs", "docs", "status"],
            description: "Scope of search (default: all)"
          },
          entity_types: {
            type: "array",
            items: { type: "string" },
            description: "Specific entity types to search (optional)"
          },
          limit: {
            type: "number",
            description: "Maximum results to return (default: 50)"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_user_context",
      description: "Get user context and identity information for Akiles (aquiles.segovia.villamizar@gmail.com)",
      parameters: {
        type: "object",
        properties: {
          include_preferences: {
            type: "boolean",
            description: "Include user preferences and settings (default: true)"
          },
          include_project_info: {
            type: "boolean",
            description: "Include project and business information (default: true)"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generate_structured_data",
      description: "Generate structured JSON outputs for specific data formats (tasks, items, reports, etc.)",
      parameters: {
        type: "object",
        properties: {
          output_type: {
            type: "string",
            enum: ["task_summary", "financial_report", "inventory_analysis", "project_status", "entity_report"],
            description: "Type of structured output to generate"
          },
          data_source: {
            type: "string",
            description: "Which entities/data to include in the output"
          },
          format_schema: {
            type: "object",
            description: "Optional custom schema for output format"
          }
        },
        required: ["output_type"]
      }
    }
  }
];

// Tool execution functions
export async function executeTool(toolName: string, args: any): Promise<any> {
  try {
    switch (toolName) {
      case "fetch_entity_data":
        return await fetchEntityData(args.entity_type, args.limit || 50, args.filters);
      
      case "get_project_status":
        return await getProjectStatus(args.include_roadmap || false);
      
      case "search_dev_logs":
        return await searchDevLogs(args.query, args.log_type, args.limit || 20);
      
      case "get_entity_relationships":
        return await getEntityRelationships(args.entity_id, args.relationship_type, args.include_metadata !== false);
      
      case "fetch_documentation":
        return await fetchDocumentation(args.doc_type, args.filename, args.search_query);
      
      case "get_system_state":
        return await getSystemState(args.include_entities !== false, args.include_links !== false, args.include_logs || false);
      
      case "search_project_data":
        return await searchProjectData(args.query, args.search_scope, args.entity_types, args.limit || 50);
      
      case "get_user_context":
        return await getUserContext(args.include_preferences !== false, args.include_project_info !== false);
      
      case "generate_structured_data":
        return await generateStructuredData(args.output_type, args.data_source, args.format_schema);
      
      case "get_site_names":
        return await getSiteNames();
      
      case "check_account_connection_status":
        return await checkAccountConnectionStatus(args.handle);
      
      case "agent_verification":
        return await agentVerification(args.expected_address, args.action);
      
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  } catch (error) {
    console.error(`Tool execution error for ${toolName}:`, error);
    return { error: `Failed to execute ${toolName}: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

// Tool implementation functions
async function fetchEntityData(entityType: string, limit: number, filters?: any): Promise<any> {
  let entities: any[] = [];
  
  switch (entityType) {
    case "task":
      entities = await getAllTasks();
      break;
    case "item":
      entities = await getAllItems();
      break;
    case "sale":
      entities = await getAllSales();
      break;
    case "financial":
      entities = await getAllFinancials();
      break;
    case "site":
      entities = await getAllSites();
      break;
    case "character":
      entities = await getAllCharacters();
      break;
    case "player":
      entities = await getAllPlayers();
      break;
    case "account":
      entities = await getAllAccounts();
      break;
    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }
  
  // Apply filters if provided
  if (filters) {
    entities = entities.filter(entity => {
      return Object.entries(filters).every(([key, value]) => 
        entity[key] === value
      );
    });
  }
  
  return {
    entity_type: entityType,
    count: entities.length,
    entities: entities.slice(0, limit),
    total_available: entities.length
  };
}

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
    
    return result;
  } catch (error) {
    return { error: "Failed to read PROJECT-STATUS.json" };
  }
}

async function searchDevLogs(query: string, logType?: string, limit: number = 20): Promise<any> {
  try {
    const logsDir = join(process.cwd(), 'logs-research');
    const results: any[] = [];
    
    // Search dev-log.json
    if (!logType || logType === 'dev') {
      const devLogPath = join(logsDir, 'dev-log.json');
      const devLog = JSON.parse(readFileSync(devLogPath, 'utf-8'));
      
      const matchingEntries = devLog.filter((entry: any) => 
        entry.content?.toLowerCase().includes(query.toLowerCase()) ||
        entry.title?.toLowerCase().includes(query.toLowerCase())
      );
      
      results.push(...matchingEntries.map((entry: any) => ({
        type: 'dev',
        ...entry
      })));
    }
    
    // Search notes-log.json
    if (!logType || logType === 'notes') {
      const notesLogPath = join(logsDir, 'notes-log.json');
      const notesLog = JSON.parse(readFileSync(notesLogPath, 'utf-8'));
      
      const matchingEntries = notesLog.filter((entry: any) => 
        entry.content?.toLowerCase().includes(query.toLowerCase()) ||
        entry.title?.toLowerCase().includes(query.toLowerCase())
      );
      
      results.push(...matchingEntries.map((entry: any) => ({
        type: 'notes',
        ...entry
      })));
    }
    
    return {
      query,
      log_type: logType || 'all',
      count: results.length,
      results: results.slice(0, limit)
    };
  } catch (error) {
    return { error: "Failed to search logs" };
  }
}

async function getEntityRelationships(entityId: string, relationshipType?: string, includeMetadata: boolean = true): Promise<any> {
  try {
    const links = await getAllLinks();
    
    const relationships = links.filter((link: Link) => 
      link.source.id === entityId || link.target.id === entityId
    );
    
    if (relationshipType) {
      const filtered = relationships.filter((link: Link) => 
        link.linkType === relationshipType
      );
      return {
        entity_id: entityId,
        relationship_type: relationshipType,
        count: filtered.length,
        relationships: filtered.map((link: Link) => ({
          id: link.id,
          type: link.linkType,
          source: link.source,
          target: link.target,
          metadata: includeMetadata ? link.metadata : undefined
        }))
      };
    }
    
    return {
      entity_id: entityId,
      count: relationships.length,
      relationships: relationships.map((link: Link) => ({
        id: link.id,
        type: link.linkType,
        source: link.source,
        target: link.target,
        metadata: includeMetadata ? link.metadata : undefined
      }))
    };
  } catch (error) {
    return { error: "Failed to get entity relationships" };
  }
}

async function fetchDocumentation(docType: string, filename?: string, searchQuery?: string): Promise<any> {
  try {
    const docsDir = join(process.cwd(), 'z_md', docType);
    
    if (filename) {
      // Return specific file
      const filePath = join(docsDir, filename);
      const content = readFileSync(filePath, 'utf-8');
      return {
        doc_type: docType,
        filename,
        content: content.substring(0, 5000) // Limit content length
      };
    }
    
    // Return directory listing or search
    const fs = require('fs');
    const files = fs.readdirSync(docsDir).filter((file: string) => file.endsWith('.md'));
    
    if (searchQuery) {
      // Search within files
      const results: any[] = [];
      for (const file of files) {
        const content = readFileSync(join(docsDir, file), 'utf-8');
        if (content.toLowerCase().includes(searchQuery.toLowerCase())) {
          results.push({
            filename: file,
            content: content.substring(0, 1000) // Preview
          });
        }
      }
      return {
        doc_type: docType,
        search_query: searchQuery,
        count: results.length,
        results
      };
    }
    
    return {
      doc_type: docType,
      files: files,
      count: files.length
    };
  } catch (error) {
    return { error: `Failed to fetch documentation: ${error}` };
  }
}

async function getSystemState(includeEntities: boolean, includeLinks: boolean, includeLogs: boolean): Promise<any> {
  const state: any = {
    timestamp: new Date().toISOString(),
    system_status: "operational"
  };
  
  if (includeEntities) {
    const [tasks, items, sales, financials, sites, characters, players, accounts] = await Promise.all([
      getAllTasks(),
      getAllItems(),
      getAllSales(),
      getAllFinancials(),
      getAllSites(),
      getAllCharacters(),
      getAllPlayers(),
      getAllAccounts()
    ]);
    
    state.entities = {
      tasks: { count: tasks.length },
      items: { count: items.length },
      sales: { count: sales.length },
      financials: { count: financials.length },
      sites: { count: sites.length },
      characters: { count: characters.length },
      players: { count: players.length },
      accounts: { count: accounts.length }
    };
  }
  
  if (includeLinks) {
    const links = await getAllLinks();
    state.relationships = {
      total_links: links.length,
      link_types: [...new Set(links.map((link: Link) => link.linkType))]
    };
  }
  
  if (includeLogs) {
    // Add recent log summary
    state.recent_activity = "Log data available via search_dev_logs tool";
  }
  
  return state;
}

async function getSiteNames(): Promise<any> {
  const sites = await getAllSites();
  return {
    count: sites.length,
    names: sites.map((s: any) => s.name).filter((n: any) => !!n)
  };
}

async function searchProjectData(query: string, searchScope?: string[], entityTypes?: string[], limit: number = 50): Promise<any> {
  const results: any[] = [];
  const scopes = searchScope || ["entities", "logs", "docs", "status"];
  
  // Search entities
  if (scopes.includes("entities")) {
    const types = entityTypes || ["task", "item", "sale", "character"];
    
    for (const type of types) {
      try {
        const entityData = await fetchEntityData(type, 20);
        const matching = entityData.entities.filter((entity: any) => 
          JSON.stringify(entity).toLowerCase().includes(query.toLowerCase())
        );
        
        results.push(...matching.map((entity: any) => ({
          type: 'entity',
          entity_type: type,
          id: entity.id,
          name: entity.name,
          match: query
        })));
      } catch (error) {
        // Skip if entity type not available
      }
    }
  }
  
  // Search logs
  if (scopes.includes("logs")) {
    try {
      const logResults = await searchDevLogs(query, undefined, 10);
      results.push(...logResults.results.map((log: any) => ({
        type: 'log',
        log_type: log.type,
        id: log.id,
        title: log.title,
        match: query
      })));
    } catch (error) {
      // Skip if logs not available
    }
  }
  
  // Search docs
  if (scopes.includes("docs")) {
    try {
      const docResults = await fetchDocumentation("wiki", undefined, query);
      if (docResults.results) {
        results.push(...docResults.results.map((doc: any) => ({
          type: 'documentation',
          filename: doc.filename,
          match: query
        })));
      }
    } catch (error) {
      // Skip if docs not available
    }
  }
  
  // Search status
  if (scopes.includes("status")) {
    try {
      const status = await getProjectStatus(false);
      if (JSON.stringify(status).toLowerCase().includes(query.toLowerCase())) {
        results.push({
          type: 'status',
          match: query,
          data: status
        });
      }
    } catch (error) {
      // Skip if status not available
    }
  }
  
  return {
    query,
    search_scope: scopes,
    count: results.length,
    results: results.slice(0, limit)
  };
}

async function getUserContext(includePreferences: boolean, includeProjectInfo: boolean): Promise<any> {
  const context: any = {
    user: {
      name: "Akiles",
      email: "aquiles.segovia.villamizar@gmail.com",
      handle: "pixelbrain",
      role: "Founder/Player"
    },
    project: {
      name: "THEGAME",
      description: "Art business management system",
      type: "Gamified admin application",
      location: "Colombia"
    }
  };
  
  if (includePreferences) {
    context.preferences = {
      ai_assistant: "Pixel (ASI:One)",
      communication_style: "Direct and technical",
      focus_areas: ["Business management", "Art production", "System development"]
    };
  }
  
  if (includeProjectInfo) {
    try {
      const systemState = await getSystemState(true, true, false);
      context.project_info = {
        system_status: systemState.system_status,
        entity_counts: systemState.entities,
        relationships: systemState.relationships
      };
    } catch (error) {
      context.project_info = { error: "Unable to load project info" };
    }
  }
  
  return context;
}

async function generateStructuredData(outputType: string, dataSource?: string, formatSchema?: any): Promise<any> {
  try {
    switch (outputType) {
      case "task_summary":
        const tasks = await getAllTasks();
        return {
          task_summary: {
            total_tasks: tasks.length,
            pending: tasks.filter(t => t.status === TaskStatus.CREATED).length,
            in_progress: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
            completed: tasks.filter(t => t.status === TaskStatus.DONE).length,
            overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== TaskStatus.DONE).length,
            priority_breakdown: {
              urgent: tasks.filter(t => t.priority === TaskPriority.URGENT).length,
              important: tasks.filter(t => t.priority === TaskPriority.IMPORTANT).length,
              normal: tasks.filter(t => t.priority === TaskPriority.NORMAL).length,
              slow: tasks.filter(t => t.priority === TaskPriority.SLOW).length,
              not_now: tasks.filter(t => t.priority === TaskPriority.NOT_NOW).length
            }
          }
        };
      
      case "financial_report":
        const financials = await getAllFinancials();
        const totalRevenue = financials.reduce((sum, f) => sum + f.revenue, 0);
        const totalCost = financials.reduce((sum, f) => sum + f.cost, 0);
        return {
          financial_report: {
            period: new Date().toISOString().split('T')[0],
            total_revenue: totalRevenue,
            total_cost: totalCost,
            net_profit: totalRevenue - totalCost,
            transaction_count: financials.length,
            types: [...new Set(financials.map(f => f.type))]
          }
        };
      
      case "inventory_analysis":
        const items = await getAllItems();
        const totalQuantity = items.reduce((sum, item) => sum + item.stock.reduce((stockSum, stock) => stockSum + stock.quantity, 0), 0);
        const inStockItems = items.filter(item => item.stock.some(stock => stock.quantity > 0));
        const outOfStockItems = items.filter(item => item.stock.every(stock => stock.quantity === 0));
        const lowStockItems = items.filter(item => item.stock.some(stock => stock.quantity > 0 && stock.quantity < 10));
        
        return {
          inventory_analysis: {
            total_items: items.length,
            in_stock: inStockItems.length,
            out_of_stock: outOfStockItems.length,
            low_stock: lowStockItems.length,
            types: [...new Set(items.map(i => i.type))],
            total_quantity: totalQuantity,
            total_value: items.reduce((sum, i) => sum + (i.price * i.stock.reduce((stockSum, stock) => stockSum + stock.quantity, 0)), 0)
          }
        };
      
      case "project_status":
        const projectStatus = await getProjectStatus(true);
        return {
          project_status: {
            ...projectStatus,
            generated_at: new Date().toISOString()
          }
        };
      
      default:
        return { error: `Unknown output type: ${outputType}` };
    }
  } catch (error) {
    return { error: `Failed to generate ${outputType}: ${error}` };
  }
}

// Helper tools to make non-agentic models respond clearly when user expects agent behavior
async function checkAccountConnectionStatus(handle: string): Promise<any> {
  const recommendation = "Use an agentic model like 'asi1-extended-agentic' for account-linked actions.";
  return {
    handle,
    connected: false,
    model_type: "non-agentic-or-unknown",
    message: "This chat is not connected to an ASI agent session.",
    recommendation
  };
}

async function agentVerification(expectedAddress?: string, action?: string): Promise<any> {
  return {
    verified: false,
    expected_address: expectedAddress || null,
    action: action || null,
    message: "Agent verification requires an agentic model session. Switch to 'asi1-extended-agentic' and retry.",
  };
}
