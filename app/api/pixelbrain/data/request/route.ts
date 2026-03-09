/**
 * GET /api/pixelbrain/data/request
 *
 * Request data from pixelbrain
 *
 * This endpoint allows thegame to request shared data from pixelbrain
 * using a share token. The data is returned in a secure manner.
 *
 * @route GET /api/pixelbrain/data/request
 * @authentication Required (JWT token)
 * @rateLimit 30 requests per minute
 */

import { NextRequest, NextResponse } from 'next/server';
import PixelbrainClient from '@/lib/mcp/pixelbrain-client';
import { logger } from '@/lib/utils/logger';

/**
 * Data request response
 */
interface DataRequestResponse {
  success: boolean;
  data: {
    entities: Array<{
      id: string;
      type: string;
      data: any;
    }>;
    metadata?: Record<string, any>;
  };
  metadata?: {
    sharedBy: string;
    sharedAt: string;
    expiresAt: string;
  };
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

// Cache for data requests (1 minute TTL)
let cachedData: Map<string, { response: DataRequestResponse; timestamp: number }> = new Map();
const CACHE_TTL = 60000; // 1 minute

/**
 * GET handler for data request
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const shareToken = searchParams.get('shareToken');
    const includeMetadata = searchParams.get('includeMetadata') === 'true';
    const decryptData = searchParams.get('decryptData') === 'true';

    // Validate share token
    if (!shareToken) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Invalid request',
        details: 'Share token is required',
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    logger.info('Requesting data from pixelbrain', {
      shareToken: shareToken.substring(0, 10) + '...',
      includeMetadata,
      decryptData,
    });

    // Check cache
    const now = Date.now();
    const cacheKey = `${shareToken}-${includeMetadata}-${decryptData}`;
    const cached = cachedData.get(cacheKey);

    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      logger.info('Using cached data', {
        shareToken: shareToken.substring(0, 10) + '...',
        cachedAt: cached.timestamp,
        age: now - cached.timestamp,
      });

      return NextResponse.json(cached.response, { status: 200 });
    }

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

    // Request data
    const result = await client.requestData({
      shareToken,
      includeMetadata,
      decryptData,
    });

    const response: DataRequestResponse = {
      success: result.success,
      data: result.data,
      metadata: result.metadata ? {
        sharedBy: result.metadata.sharedBy,
        sharedAt: result.metadata.sharedAt.toISOString(),
        expiresAt: result.metadata.expiresAt.toISOString(),
      } : undefined,
      timestamp: new Date().toISOString(),
    };

    // Update cache
    cachedData.set(cacheKey, { response, timestamp: now });

    // Clean up old cache entries
    cachedData.forEach((value, key) => {
      if (now - value.timestamp > CACHE_TTL) {
        cachedData.delete(key);
      }
    });

    logger.info('Data requested successfully', {
      shareToken: shareToken.substring(0, 10) + '...',
      entityCount: result.data.entities.length,
      hasMetadata: !!result.metadata,
      duration: Date.now() - startTime,
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    logger.error('Data request failed', {
      error: error.message,
      stack: error.stack,
      duration: Date.now() - startTime,
    });

    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Data request failed',
      details: error.message,
      timestamp: new Date().toISOString(),
    };

    // Determine appropriate status code
    let statusCode = 500;
    if (error.message.includes('Not connected')) {
      statusCode = 503;
    } else if (error.message.includes('Not found') || error.message.includes('Invalid token')) {
      statusCode = 404;
    } else if (error.message.includes('Unauthorized') || error.message.includes('Authentication')) {
      statusCode = 401;
    } else if (error.message.includes('Expired')) {
      statusCode = 410; // 410 Gone
    } else if (error.message.includes('Invalid') || error.message.includes('required')) {
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
