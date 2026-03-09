/**
 * GET /api/pixelbrain/agents/status/[agentId]
 *
 * Get status of a specific agent
 *
 * This endpoint returns detailed status information for a specific
 * pixelbrain agent, including health, task counts, and performance metrics.
 *
 * @route GET /api/pixelbrain/agents/status/[agentId]
 * @authentication Required (JWT token)
 * @rateLimit 30 requests per minute
 */

import { NextRequest, NextResponse } from 'next/server';
import PixelbrainClient from '@/lib/mcp/pixelbrain-client';
import { logger } from '@/lib/utils/logger';

/**
 * Agent status response
 */
interface AgentStatusResponse {
  success: boolean;
  agentId: string;
  name: string;
  type: string;
  status: 'running' | 'stopped' | 'error' | 'degraded';
  health: 'healthy' | 'degraded' | 'unhealthy';
  activeTasks: number;
  completedTasks: number;
  failedTasks: number;
  errorRate: number;
  uptime: number;
  lastActivity: string;
  capabilities: string[];
  llmProvider?: string;
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

/**
 * GET handler for agent status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
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

    const agentId = params.agentId;

    if (!agentId) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Invalid request',
        details: 'Agent ID is required',
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    logger.info('Getting agent status', { agentId });

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

    // Get agent status
    const status = await client.getAgentStatus(agentId);

    const response: AgentStatusResponse = {
      success: true,
      agentId: status.agentId,
      name: status.name,
      type: status.type,
      status: status.status,
      health: status.health,
      activeTasks: status.activeTasks,
      completedTasks: status.completedTasks,
      failedTasks: status.failedTasks,
      errorRate: status.errorRate,
      uptime: status.uptime,
      lastActivity: status.lastActivity.toISOString(),
      capabilities: status.capabilities,
      llmProvider: status.llmProvider,
      timestamp: new Date().toISOString(),
    };

    logger.info('Agent status retrieved successfully', {
      agentId: status.agentId,
      status: status.status,
      health: status.health,
      duration: Date.now() - startTime,
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    logger.error('Failed to get agent status', {
      error: error.message,
      stack: error.stack,
      agentId: params.agentId,
      duration: Date.now() - startTime,
    });

    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Failed to get agent status',
      details: error.message,
      timestamp: new Date().toISOString(),
    };

    // Determine appropriate status code
    let statusCode = 500;
    if (error.message.includes('Not connected')) {
      statusCode = 503;
    } else if (error.message.includes('not found') || error.message.includes('invalid agent')) {
      statusCode = 404;
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
