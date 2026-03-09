/**
 * POST /api/pixelbrain/connect
 *
 * Establish connection to pixelbrain AI orchestrator
 *
 * This endpoint handles the initial connection to pixelbrain, including
 * authentication, client registration, and capability discovery.
 *
 * @route POST /api/pixelbrain/connect
 * @authentication Required (JWT token)
 * @rateLimit 10 requests per minute
 */

import { NextRequest, NextResponse } from 'next/server';
import PixelbrainClient from '@/lib/mcp/pixelbrain-client';
import { loadPixelbrainConfig, savePixelbrainConfig } from '@/lib/config/pixelbrain-config';
import { logger } from '@/lib/utils/logger';

/**
 * Connection request body
 */
interface ConnectRequest {
  endpoint?: string;
  apiKey?: string;
  timeout?: number;
  enableWebSockets?: boolean;
}

/**
 * Connection response
 */
interface ConnectResponse {
  success: boolean;
  connectionId: string;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  authToken?: {
    token: string;
    expiresAt: string;
  };
  discoveredTools: number;
  serverVersion: string;
  message: string;
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
 * POST handler for pixelbrain connection
 */
export async function POST(request: NextRequest) {
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

    // Parse request body
    const body: ConnectRequest = await request.json().catch(() => ({}));

    // Validate request body
    if (!body.endpoint) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Invalid request',
        details: 'Endpoint is required',
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    logger.info('Connecting to pixelbrain', {
      endpoint: body.endpoint,
      enableWebSockets: body.enableWebSockets,
      timeout: body.timeout,
    });

    // Load current configuration
    const config = await loadPixelbrainConfig();

    // Update configuration with request parameters
    const updatedConfig = {
      ...config,
      endpoint: body.endpoint,
      apiKey: body.apiKey || config.apiKey,
      timeout: body.timeout || config.timeout,
      enableWebSockets: body.enableWebSockets !== undefined ? body.enableWebSockets : config.enableWebSockets,
    };

    // Create pixelbrain client
    const client = new PixelbrainClient({
      endpoint: updatedConfig.endpoint,
      timeout: updatedConfig.timeout,
      enableWebSockets: updatedConfig.enableWebSockets,
    });

    // Attempt connection
    const connectionResult = await client.connect({
      endpoint: updatedConfig.endpoint,
      apiKey: updatedConfig.apiKey,
      timeout: updatedConfig.timeout,
      enableWebSockets: updatedConfig.enableWebSockets,
    });

    // Save updated configuration on successful connection
    await savePixelbrainConfig(updatedConfig);

    // Store client instance in runtime (in a real app, this would be in a singleton or cache)
    // For now, we'll store it in a global variable (not ideal for production)
    (global as any).pixelbrainClient = client;

    const response: ConnectResponse = {
      success: true,
      connectionId: connectionResult.connectionId,
      status: connectionResult.status,
      authToken: connectionResult.authToken ? {
        token: connectionResult.authToken.token,
        expiresAt: connectionResult.authToken.expiresAt.toISOString(),
      } : undefined,
      discoveredTools: connectionResult.discoveredTools,
      serverVersion: connectionResult.serverVersion,
      message: connectionResult.message,
      timestamp: new Date().toISOString(),
    };

    logger.info('pixelbrain connection successful', {
      connectionId: connectionResult.connectionId,
      discoveredTools: connectionResult.discoveredTools,
      serverVersion: connectionResult.serverVersion,
      duration: Date.now() - startTime,
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    logger.error('pixelbrain connection failed', {
      error: error.message,
      stack: error.stack,
      duration: Date.now() - startTime,
    });

    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Connection failed',
      details: error.message,
      timestamp: new Date().toISOString(),
    };

    // Determine appropriate status code
    let statusCode = 500;
    if (error.message.includes('Authentication failed')) {
      statusCode = 401;
    } else if (error.message.includes('Invalid')) {
      statusCode = 400;
    } else if (error.message.includes('timeout')) {
      statusCode = 504;
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
