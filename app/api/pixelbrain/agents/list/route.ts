/**
 * GET /api/pixelbrain/agents/list
 *
 * List all available pixelbrain agents
 *
 * This endpoint returns a list of all available pixelbrain agents
 * with their status, capabilities, and configuration details.
 *
 * @route GET /api/pixelbrain/agents/list
 * @authentication Required (JWT token)
 * @rateLimit 30 requests per minute
 */

import { NextRequest, NextResponse } from 'next/server';
import PixelbrainClient from '@/lib/mcp/pixelbrain-client';
import { logger } from '@/lib/utils/logger';

/**
 * Agent information
 */
interface AgentInfo {
  id: string;
  name: string;
  type: string;
  status: 'running' | 'stopped' | 'error' | 'degraded';
  health: 'healthy' | 'degraded' | 'unhealthy';
  capabilities: string[];
  llmProvider?: string;
}

/**
 * Agent list response
 */
interface AgentListResponse {
  success: boolean;
  agents: AgentInfo[];
  total: number;
  timestamp: string;
}

/**
 * Error response
 */
interface ErrorResponse {
  success: false;
  error: string;
  details?: string;
  timestamp: string;
}

// Cache for agent list (30 seconds TTL)
let cachedAgentList: AgentInfo[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 30000; // 30 seconds

/**
 * GET handler for agent list
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Authenticate request (placeholder for JWT middleware)
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Unauthorized',
        details: 'Missing or invalid authentication token',
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    logger.info('Getting agent list');

    // Get or create pixelbrain client
    let client = (global as any).pixelbrainClient as PixelbrainClient;
    if (!client) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Not connected',
        details: 'Not connected to pixelbrain. Please connect first.',
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(errorResponse, { status: 503 });
    }

    // Check connection
    if (!client.isConnectedToServer()) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Not connected',
        details: 'Not connected to pixelbrain. Please connect first.',
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(errorResponse, { status: 503 });
    }

    // Check cache
    const now = Date.now();
    if (cachedAgentList && (now - cacheTimestamp) < CACHE_TTL) {
      logger.info('Using cached agent list', {
        cachedAt: cacheTimestamp,
        age: now - cacheTimestamp,
      });

      const response: AgentListResponse = {
        success: true,
        agents: cachedAgentList,
        total: cachedAgentList.length,
        timestamp: new Date().toISOString(),
      };

      return NextResponse.json(response, { status: 200 });
    }

    // Fetch agents from pixelbrain
    const agents = await client.getAvailableAgents();

    // Map agent statuses
    const agentInfoList: AgentInfo[] = await Promise.all(
      agents.map(async (agentName) => {
        try {
          const status = await client.getAgentStatus(agentName);
          return {
            id: status.agentId,
            name: status.name,
            type: status.type,
            status: status.status,
            health: status.health,
            capabilities: status.capabilities,
            llmProvider: status.llmProvider,
          };
        } catch (error) {
          logger.warn('Failed to get status for agent', { agentName, error });
          return {
            id: agentName,
            name: agentName,
            type: 'unknown',
            status: 'error',
            health: 'unhealthy',
            capabilities: [],
          };
        }
      })
    );

    // Update cache
    cachedAgentList = agentInfoList;
    cacheTimestamp = now;

    const response: AgentListResponse = {
      success: true,
      agents: agentInfoList,
      total: agentInfoList.length,
      timestamp: new Date().toISOString(),
    };

    logger.info('Agent list retrieved successfully', {
      total: agentInfoList.length,
      duration: Date.now() - startTime,
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    logger.error('Failed to get agent list', {
      error: error.message,
      stack: error.stack,
      duration: Date.now() - startTime,
    });

    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Failed to get agent list',
      details: error.message,
      timestamp: new Date().toISOString(),
    };

    // Determine appropriate status code
    let statusCode = 500;
    if (error.message.includes('Not connected')) {
      statusCode = 503;
    } else if (error.message.includes('Unauthorized') || error.message.includes('Authentication')) {
      statusCode = 401;
    }

    return NextResponse.json(errorResponse, { status: statusCode });
  }
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
