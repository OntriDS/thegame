/**
 * GET /api/pixelbrain/status
 *
 * Get current pixelbrain connection status and system health
 *
 * This endpoint returns the current connection status to pixelbrain,
 * including system health metrics, active agent count, and
 * performance statistics.
 *
 * @route GET /api/pixelbrain/status
 * @authentication Required (JWT token)
 * @rateLimit 60 requests per minute
 * @caching 30 seconds
 */

import { NextRequest, NextResponse } from 'next/server';
import PixelbrainClient from '@/lib/mcp/pixelbrain-client';
import { logger } from '@/lib/utils/logger';

/**
 * Connection status response
 */
interface ConnectionStatusResponse {
  connected: boolean;
  connectionId: string | null;
  lastActivity: string | null;
  systemHealth: 'healthy' | 'degraded' | 'unhealthy';
  activeAgents: number;
  uptime: number;
  latency: number;
  totalRequests: number;
  serverVersion?: string;
  timestamp: string;
}

/**
 * Error response
 */
interface ErrorResponse {
  connected: false;
  error: string;
  details?: string;
  timestamp: string;
}

/**
 * GET handler for pixelbrain status
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Authenticate request (placeholder for JWT middleware)
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      const errorResponse: ErrorResponse = {
        connected: false,
        error: 'Unauthorized',
        details: 'Missing or invalid authentication token',
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    // Get client instance from runtime
    const client = (global as any).pixelbrainClient as PixelbrainClient | undefined;

    if (!client || !client.isConnectedToServer()) {
      const response: ConnectionStatusResponse = {
        connected: false,
        connectionId: null,
        lastActivity: null,
        systemHealth: 'unhealthy',
        activeAgents: 0,
        uptime: 0,
        latency: 0,
        totalRequests: 0,
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(response, { status: 200 });
    }

    // Get connection status from pixelbrain
    const connectionStatus = await client.getConnectionStatus();

    // Get system health
    const systemHealth = await client.getSystemHealth();

    const response: ConnectionStatusResponse = {
      connected: true,
      connectionId: connectionStatus.connectionId,
      lastActivity: connectionStatus.lastActivity.toISOString(),
      systemHealth: connectionStatus.systemHealth,
      activeAgents: connectionStatus.activeAgents,
      uptime: connectionStatus.uptime,
      latency: connectionStatus.latency,
      totalRequests: connectionStatus.totalRequests,
      timestamp: new Date().toISOString(),
    };

    logger.debug('pixelbrain status retrieved', {
      connected: true,
      activeAgents: connectionStatus.activeAgents,
      systemHealth: connectionStatus.systemHealth,
      duration: Date.now() - startTime,
    });

    // Set cache headers
    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (error: any) {
    logger.error('Failed to get pixelbrain status', {
      error: error.message,
      stack: error.stack,
      duration: Date.now() - startTime,
    });

    const errorResponse: ErrorResponse = {
      connected: false,
      error: 'Failed to retrieve status',
      details: error.message,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(errorResponse, { status: 500 });
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
