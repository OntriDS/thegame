/**
 * POST /api/pixelbrain/data/share
 *
 * Share data with pixelbrain
 *
 * This endpoint allows thegame to share data entities with pixelbrain
 * for processing and analysis. The data is secured with share tokens.
 *
 * @route POST /api/pixelbrain/data/share
 * @authentication Required (JWT token)
 * @rateLimit 20 requests per minute
 */

import { NextRequest, NextResponse } from 'next/server';
import PixelbrainClient from '@/lib/mcp/pixelbrain-client';
import { logger } from '@/lib/utils/logger';

/**
 * Data share request
 */
interface DataShareRequest {
  entityType: string;
  entityIds: string[];
  shareType: 'read-only' | 'read-write';
  expiresAt?: string;
  metadata?: Record<string, any>;
}

/**
 * Data share response
 */
interface DataShareResponse {
  success: boolean;
  shareToken: string;
  expiresAt: string;
  entitiesShared: number;
  accessUrl: string;
  metadata?: Record<string, any>;
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
 * POST handler for data sharing
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
    const body: DataShareRequest = await request.json().catch(() => ({}));

    // Validate request body
    if (!body.entityType) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Invalid request',
        details: 'Entity type is required',
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    if (!body.entityIds || !Array.isArray(body.entityIds) || body.entityIds.length === 0) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Invalid request',
        details: 'Entity IDs must be a non-empty array',
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    if (!body.shareType) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Invalid request',
        details: 'Share type is required',
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Validate share type
    const validShareTypes = ['read-only', 'read-write'];
    if (!validShareTypes.includes(body.shareType)) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Invalid request',
        details: `Invalid share type. Must be one of: ${validShareTypes.join(', ')}`,
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Validate expiration date if provided
    let expiresAt: Date | undefined;
    if (body.expiresAt) {
      expiresAt = new Date(body.expiresAt);
      if (isNaN(expiresAt.getTime())) {
        const errorResponse: ErrorResponse = {
          success: false,
          error: 'Invalid request',
          details: 'Invalid expiration date format',
          timestamp: new Date().toISOString(),
        };
        return NextResponse.json(errorResponse, { status: 400 });
      }

      // Ensure expiration is in the future
      if (expiresAt <= new Date()) {
        const errorResponse: ErrorResponse = {
          success: false,
          error: 'Invalid request',
          details: 'Expiration date must be in the future',
          timestamp: new Date().toISOString(),
        };
        return NextResponse.json(errorResponse, { status: 400 });
      }
    }

    logger.info('Sharing data with pixelbrain', {
      entityType: body.entityType,
      entityCount: body.entityIds.length,
      shareType: body.shareType,
      expiresAt: expiresAt?.toISOString(),
    });

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

    // Share data
    const result = await client.shareData({
      entityType: body.entityType,
      entityIds: body.entityIds,
      shareType: body.shareType,
      expiresAt: expiresAt,
      metadata: body.metadata,
    });

    const response: DataShareResponse = {
      success: result.success,
      shareToken: result.shareToken,
      expiresAt: result.expiresAt.toISOString(),
      entitiesShared: result.entitiesShared,
      accessUrl: result.accessUrl,
      metadata: result.metadata,
      timestamp: new Date().toISOString(),
    };

    logger.info('Data shared successfully', {
      shareToken: result.shareToken,
      entitiesShared: result.entitiesShared,
      expiresAt: result.expiresAt,
      duration: Date.now() - startTime,
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    logger.error('Data sharing failed', {
      error: error.message,
      stack: error.stack,
      duration: Date.now() - startTime,
    });

    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Data sharing failed',
      details: error.message,
      timestamp: new Date().toISOString(),
    };

    // Determine appropriate status code
    let statusCode = 500;
    if (error.message.includes('Not connected')) {
      statusCode = 503;
    } else if (error.message.includes('Unauthorized') || error.message.includes('Authentication')) {
      statusCode = 401;
    } else if (error.message.includes('Invalid') || error.message.includes('validation')) {
      statusCode = 400;
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
