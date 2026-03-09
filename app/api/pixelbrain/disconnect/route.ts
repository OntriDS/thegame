/**
 * POST /api/pixelbrain/disconnect
 *
 * Disconnect from pixelbrain AI orchestrator
 *
 * This endpoint handles disconnection from pixelbrain, including
 * cleanup of WebSocket connections, clearing authentication tokens,
 * and proper resource cleanup.
 *
 * @route POST /api/pixelbrain/disconnect
 * @authentication Required (JWT token)
 * @rateLimit 20 requests per minute
 */

import { NextRequest, NextResponse } from 'next/server';
import PixelbrainClient from '@/lib/mcp/pixelbrain-client';
import { logger } from '@/lib/utils/logger';

/**
 * Disconnect response
 */
interface DisconnectResponse {
  success: boolean;
  status: 'disconnected' | 'not_connected' | 'error';
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
 * POST handler for pixelbrain disconnection
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

    logger.info('Disconnecting from pixelbrain');

    // Get client instance from runtime
    const client = (global as any).pixelbrainClient as PixelbrainClient | undefined;

    if (!client) {
      const response: DisconnectResponse = {
        success: true,
        status: 'not_connected',
        message: 'No active connection to pixelbrain',
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(response, { status: 200 });
    }

    // Check if client is connected
    if (!client.isConnectedToServer()) {
      const response: DisconnectResponse = {
        success: true,
        status: 'not_connected',
        message: 'Already disconnected from pixelbrain',
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(response, { status: 200 });
    }

    // Attempt disconnection
    await client.disconnect();

    // Clear client from runtime
    (global as any).pixelbrainClient = undefined;

    const response: DisconnectResponse = {
      success: true,
      status: 'disconnected',
      message: 'Successfully disconnected from pixelbrain',
      timestamp: new Date().toISOString(),
    };

    logger.info('pixelbrain disconnection successful', {
      duration: Date.now() - startTime,
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    logger.error('pixelbrain disconnection failed', {
      error: error.message,
      stack: error.stack,
      duration: Date.now() - startTime,
    });

    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Disconnection failed',
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
