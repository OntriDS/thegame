/**
 * GET /api/pixelbrain/llm/providers
 *
 * Get available LLM providers
 *
 * This endpoint returns a list of all available LLM providers
 * with their capabilities, costs, and configuration details.
 *
 * @route GET /api/pixelbrain/llm/providers
 * @authentication Required (JWT token)
 * @rateLimit 30 requests per minute
 */

import { NextRequest, NextResponse } from 'next/server';
import PixelbrainClient from '@/lib/mcp/pixelbrain-client';
import { logger } from '@/lib/utils/logger';

/**
 * LLM provider information
 */
interface LLMProviderInfo {
  id: string;
  name: string;
  capabilities: string[];
  costPerToken: number;
  maxTokens: number;
  supportsStreaming: boolean;
  userApiKey: boolean;
  available: boolean;
  averageLatency?: number;
}

/**
 * LLM providers response
 */
interface LLMProvidersResponse {
  success: boolean;
  providers: LLMProviderInfo[];
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

// Cache for LLM providers (5 minutes TTL)
let cachedProviders: LLMProviderInfo[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 300000; // 5 minutes

/**
 * GET handler for LLM providers
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

    logger.info('Getting LLM providers');

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
    if (cachedProviders && (now - cacheTimestamp) < CACHE_TTL) {
      logger.info('Using cached LLM providers', {
        cachedAt: cacheTimestamp,
        age: now - cacheTimestamp,
      });

      const response: LLMProvidersResponse = {
        success: true,
        providers: cachedProviders,
        timestamp: new Date().toISOString(),
      };

      return NextResponse.json(response, { status: 200 });
    }

    // Get available LLM providers
    const providers = await client.getAvailableLLMs();

    // Map to response format
    const providerList: LLMProviderInfo[] = providers.map((provider) => ({
      id: provider.id,
      name: provider.name,
      capabilities: provider.capabilities,
      costPerToken: provider.costPerToken,
      maxTokens: provider.maxTokens,
      supportsStreaming: provider.supportsStreaming,
      userApiKey: provider.userApiKey,
      available: provider.available,
      averageLatency: provider.averageLatency,
    }));

    // Update cache
    cachedProviders = providerList;
    cacheTimestamp = now;

    const response: LLMProvidersResponse = {
      success: true,
      providers: providerList,
      timestamp: new Date().toISOString(),
    };

    logger.info('LLM providers retrieved successfully', {
      count: providerList.length,
      duration: Date.now() - startTime,
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    logger.error('Failed to get LLM providers', {
      error: error.message,
      stack: error.stack,
      duration: Date.now() - startTime,
    });

    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Failed to get LLM providers',
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
