/**
 * GET /api/pixelbrain/llm/usage
 *
 * Get LLM usage statistics
 *
 * This endpoint returns detailed usage statistics for LLM providers,
 * including request counts, token usage, costs, and breakdowns.
 *
 * @route GET /api/pixelbrain/llm/usage
 * @authentication Required (JWT token)
 * @rateLimit 30 requests per minute
 */

import { NextRequest, NextResponse } from 'next/server';
import PixelbrainClient from '@/lib/mcp/pixelbrain-client';
import { logger } from '@/lib/utils/logger';

/**
 * Usage statistics response
 */
interface UsageStatsResponse {
  success: boolean;
  period: {
    start: string;
    end: string;
  };
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  averageLatency: number;
  successRate: number;
  byProvider: Record<
    string,
    {
      requests: number;
      tokens: number;
      cost: number;
      averageLatency: number;
      successRate: number;
    }
  >;
  byAgent: Record<
    string,
    {
      requests: number;
      cost: number;
      averageDuration: number;
      successRate: number;
    }
  >;
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

// Cache for usage stats (5 minutes TTL)
let cachedUsage: UsageStatsResponse | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 300000; // 5 minutes

/**
 * GET handler for LLM usage
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
    const period = searchParams.get('period'); // 'day', 'week', 'month', 'custom'
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');

    logger.info('Getting LLM usage stats', {
      period,
      startDate,
      endDate,
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

    // Check cache
    const now = Date.now();
    if (cachedUsage && (now - cacheTimestamp) < CACHE_TTL && !startDate && !endDate) {
      logger.info('Using cached usage stats', {
        cachedAt: cacheTimestamp,
        age: now - cacheTimestamp,
      });

      return NextResponse.json(cachedUsage, { status: 200 });
    }

    // Calculate date range
    let start: Date;
    let end: Date = new Date();

    switch (period) {
      case 'day':
        start = new Date();
        start.setDate(start.getDate() - 1);
        break;
      case 'week':
        start = new Date();
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start = new Date();
        start.setMonth(start.getMonth() - 1);
        break;
      case 'custom':
        if (!startDate || !endDate) {
          const errorResponse: ErrorResponse = {
            success: false,
            error: 'Invalid request',
            details: 'Both start and end dates are required for custom period',
            timestamp: new Date().toISOString(),
          };
          return NextResponse.json(errorResponse, { status: 400 });
        }
        start = new Date(startDate);
        end = new Date(endDate);
        break;
      default:
        // Default to current month
        start = new Date();
        start.setDate(1); // First day of current month
    }

    // Get usage stats
    const stats = await client.getUsageStats({ start, end });

    const response: UsageStatsResponse = {
      success: true,
      period: {
        start: stats.period.start.toISOString(),
        end: stats.period.end.toISOString(),
      },
      totalRequests: stats.totalRequests,
      totalTokens: stats.totalTokens,
      totalCost: stats.totalCost,
      averageLatency: stats.averageLatency,
      successRate: stats.successRate,
      byProvider: stats.byProvider,
      byAgent: stats.byAgent,
      timestamp: new Date().toISOString(),
    };

    // Update cache
    cachedUsage = response;
    cacheTimestamp = now;

    logger.info('Usage stats retrieved successfully', {
      period: {
        start: stats.period.start,
        end: stats.period.end,
      },
      totalRequests: stats.totalRequests,
      totalCost: stats.totalCost,
      duration: Date.now() - startTime,
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    logger.error('Failed to get usage stats', {
      error: error.message,
      stack: error.stack,
      duration: Date.now() - startTime,
    });

    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Failed to get usage stats',
      details: error.message,
      timestamp: new Date().toISOString(),
    };

    // Determine appropriate status code
    let statusCode = 500;
    if (error.message.includes('Not connected')) {
      statusCode = 503;
    } else if (error.message.includes('Unauthorized') || error.message.includes('Authentication')) {
      statusCode = 401;
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
