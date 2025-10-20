# MCP Integration for Akiles Ecosystem

This directory contains the Model Context Protocol (MCP) integration for the Akiles Ecosystem, allowing AI models to interact with your game data through a structured interface.

## Architecture

```
AI Model ↔ MCP Client ↔ MCP API Routes ↔ MCP Server ↔ DataStore ↔ Adapters ↔ Storage
```

## Files

- `mcp-server.ts` - MCP server that exposes DataStore operations as tools
- `mcp-client.ts` - MCP client for AI model integration
- `app/api/mcp/` - HTTP API routes for MCP tools

## Available Tools

### Task Operations
- `get_tasks` - Get all tasks (with optional filtering)
- `create_task` - Create a new task
- `update_task` - Update an existing task
- `delete_task` - Delete a task

### Item Operations
- `get_items` - Get all items (with optional filtering)
- `create_item` - Create a new item

### Entity Operations
- `get_characters` - Get all characters
- `get_players` - Get all players
- `get_sites` - Get all sites (with optional filtering)
- `get_sales` - Get all sales

### Log Operations
- `get_logs` - Get log entries for specific entity types

### System Operations
- `get_system_status` - Get overall system status and entity counts
- `reset_system` - Reset the system to defaults (use with caution)

## Usage Examples

### Using MCP Client in AI Models

```typescript
import { mcpClient } from '@/lib/mcp/mcp-client';

// Get all pending tasks
const tasksResponse = await mcpClient.getTasks({ status: 'pending' });
if (tasksResponse.success) {
  console.log('Pending tasks:', tasksResponse.data);
}

// Create a new task
const createResponse = await mcpClient.createTask({
  title: 'AI Generated Task',
  description: 'Created by AI model',
  priority: 'high'
});

// Get system status
const statusResponse = await mcpClient.getSystemStatus();
if (statusResponse.success) {
  console.log('System status:', statusResponse.data);
}
```

### Direct API Usage

```bash
# Get available tools
curl -X GET http://localhost:3000/api/mcp/tools

# Call a tool
curl -X POST http://localhost:3000/api/mcp/tools \
  -H "Content-Type: application/json" \
  -d '{"tool": "get_tasks", "arguments": {"status": "pending"}}'

# Get tool schema
curl -X GET http://localhost:3000/api/mcp/tools/get_tasks/schema
```

## Integration with Existing Architecture

- **No changes to existing REST APIs** - they continue to work as before
- **No changes to DataStore** - MCP uses the same DataStore interface
- **No changes to Adapters** - MCP goes through the same adapter layer
- **Additive only** - MCP is an additional layer on top of existing functionality

## Benefits

1. **AI Model Integration** - AI models can interact with your game data
2. **Structured Interface** - MCP provides a clean, typed interface
3. **Same Data Source** - Uses the same DataStore as your web UI
4. **Backward Compatible** - Doesn't break existing functionality
5. **Extensible** - Easy to add new tools as needed

## Security Considerations

- MCP tools run with the same permissions as your DataStore
- Consider adding authentication/authorization for production use
- The `reset_system` tool should be used with extreme caution
- All tools go through the same validation as your existing APIs

## Adding New Tools

To add a new MCP tool:

1. Add the tool definition to `mcp-server.ts` in the `registerTools()` method
2. Add convenience methods to `mcp-client.ts` if needed
3. The tool will automatically be available through the API

Example:
```typescript
this.registerTool({
  name: 'my_new_tool',
  description: 'Description of what this tool does',
  inputSchema: {
    type: 'object',
    properties: {
      param1: { type: 'string', description: 'Parameter description' }
    },
    required: ['param1']
  },
  handler: async (args) => {
    // Tool implementation
    return await DataStore.someMethod(args.param1);
  }
});
```
