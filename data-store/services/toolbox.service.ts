import { kvSet, kvGet } from '@/lib/utils/kv';
import fs from 'fs';
import path from 'path';

export interface ToolboxMetadata {
  systemId: string;
  tools: any[];
}

export class ToolboxService {
  private static CACHE_KEY = 'thegame:index:toolboxes';

  /**
   * Fetches the latest toolboxes from all ecosystem endpoints and caches them in Redis.
   */
  static async syncToolboxes(): Promise<ToolboxMetadata[]> {
    const toolboxes: ToolboxMetadata[] = [];

    // 1. TheGame (Local fallback since we are inside TheGame)
    try {
      const toolboxPath = path.resolve(process.cwd(), 'tools', 'toolbox.json');
      const content = fs.readFileSync(toolboxPath, 'utf8');
      const toolboxData = JSON.parse(content);
      toolboxes.push({
        systemId: 'thegame',
        tools: toolboxData.tools.map((t: any) => ({
          id: t.id,
          name: t.id,
          description: t.description,
          systemId: 'thegame',
          parameters: t.parameters || { type: 'object', properties: {} },
          tags: t.tags || [],
          roles: t.roles || [],
          implementation: t.implementation || '',
        })),
      });
    } catch (e) {
      console.error('Failed to sync TheGame toolbox', e);
    }

    // 2. Akiles Ecosystem (Remote)
    try {
      const res = await fetch('https://www.akilesecosystem.com/api/mcp/tools/discover', { next: { revalidate: 0 } });
      if (res.ok) {
        const data = await res.json();
        toolboxes.push(data);
      } else {
        console.warn('Akiles ecosystem discover endpoint failed:', res.statusText);
      }
    } catch (e) {
      console.error('Failed to fetch Akiles toolbox', e);
    }

    // 3. Pixelbrain (Remote)
    try {
      const res = await fetch('https://pixelbrain-ten.vercel.app/api/mcp/tools/discover', { next: { revalidate: 0 } });
      if (res.ok) {
        const data = await res.json();
        toolboxes.push(data);
      } else {
        console.warn('Pixelbrain discover endpoint failed:', res.statusText);
      }
    } catch (e) {
      console.error('Failed to fetch Pixelbrain toolbox', e);
    }

    // Update Redis cache
    await kvSet(this.CACHE_KEY, JSON.stringify(toolboxes));

    return toolboxes;
  }

  /**
   * Retrieves the cached toolboxes from Redis.
   */
  static async getToolboxes(): Promise<ToolboxMetadata[]> {
    try {
      const data = await kvGet<ToolboxMetadata[] | string>(this.CACHE_KEY);
      if (data) {
        return typeof data === 'string' ? JSON.parse(data) : data;
      }
    } catch (e) {
      console.error('Failed to get toolboxes from cache', e);
    }
    
    // Fallback to sync if cache is empty
    return await this.syncToolboxes();
  }
}
