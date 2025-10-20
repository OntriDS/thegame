// lib/mcp/mcp-client.ts
// MCP Client for AI model integration

export interface MCPToolCall {
  name: string;
  arguments: any;
}

export interface MCPResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export class MCPClient {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * Call an MCP tool
   */
  async callTool(toolName: string, args: any = {}): Promise<MCPResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/mcp/tools`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: toolName,
          arguments: args
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get available tools
   */
  async getAvailableTools(): Promise<MCPResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/mcp/tools`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get tool schema
   */
  async getToolSchema(toolName: string): Promise<MCPResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/mcp/tools/${toolName}/schema`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Convenience methods for common operations
   */
  async getTasks(filters?: { status?: string; limit?: number }) {
    return this.callTool('get_tasks', filters || {});
  }

  async createTask(taskData: { title: string; description?: string; status?: string; priority?: string }) {
    return this.callTool('create_task', taskData);
  }

  async updateTask(id: string, updates: any) {
    return this.callTool('update_task', { id, updates });
  }

  async deleteTask(id: string) {
    return this.callTool('delete_task', { id });
  }

  async getItems(filters?: { category?: string; limit?: number }) {
    return this.callTool('get_items', filters || {});
  }

  async createItem(itemData: { name: string; description?: string; category: string; value?: number }) {
    return this.callTool('create_item', itemData);
  }

  async getCharacters(limit?: number) {
    return this.callTool('get_characters', { limit });
  }

  async getPlayers(limit?: number) {
    return this.callTool('get_players', { limit });
  }

  async getSites(filters?: { type?: string; limit?: number }) {
    return this.callTool('get_sites', filters || {});
  }

  async getSales(limit?: number) {
    return this.callTool('get_sales', { limit });
  }

  async getLogs(logType: string, limit?: number) {
    return this.callTool('get_logs', { logType, limit });
  }

  async getSystemStatus() {
    return this.callTool('get_system_status', {});
  }

  async resetSystem(mode: 'clear' | 'defaults' | 'backfill' = 'defaults') {
    return this.callTool('reset_system', { mode });
  }
}

// Export default client instance
export const mcpClient = new MCPClient();
