/**
 * POST /api/pixelbrain/llm/configure
 *
 * Configure LLM settings
 *
 * This endpoint allows configuration of LLM provider settings,
 * including API key validation and default parameters.
 *
 * @route POST /api/pixelbrain/llm/configure
 * @authentication Required (JWT token)
 * @rateLimit 10 requests per minute
 */

import { NextRequest, NextResponse } from 'next/server';
import PixelbrainClient from '@/lib/mcp/pixelbrain-client';
import { loadPixelbrainConfig, savePixelbrainConfig } from '@/lib/config/pixelbrain-config';
import { logger } from '@/lib/utils/logger';

/**
 * LLM configuration request
 */
interface LLMConfigureRequest {
  providerId: string;
  apiKey?: string;
  defaultSettings?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  };
}

/**
 * LLM configuration response
 */
interface LLMConfigureResponse {
  success: boolean;
  message: string;
  validated: boolean;
  provider: {
    id: string;
    name: string;
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

/**
 * POST handler for LLM configuration
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
    const body: LLMConfigureRequest = await request.json().catch(() => ({}));

    // Validate request body
    if (!body.providerId) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Invalid request',
        details: 'Provider ID is required',
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Validate provider ID
    const validProviders = ['groq', 'zai', 'gemini'];
    if (!validProviders.includes(body.providerId)) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Invalid request',
        details: `Invalid provider ID. Must be one of: ${validProviders.join(', ')}`,
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    logger.info('Configuring LLM', {
      providerId: body.providerId,
      hasApiKey: !!body.apiKey,
      hasDefaultSettings: !!body.defaultSettings,
    });

    // Load configuration
    const config = await loadPixelbrainConfig();

    // Update LLM provider configuration
    const updatedConfig = {
      ...config,
      llmProviders: {
        ...config.llmProviders,
        [body.providerId]: {
          apiKey: body.apiKey,
          defaultSettings: body.defaultSettings,
        },
      },
    };

    // Save updated configuration
    await savePixelbrainConfig(updatedConfig);

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

    // Configure LLM on pixelbrain
    const result = await client.configureLLM({
      providerId: body.providerId,
      apiKey: body.apiKey,
      defaultSettings: body.defaultSettings,
    });

    const response: LLMConfigureResponse = {
      success: true,
      message: result.message,
      validated: result.validated,
      provider: result.provider || {
        id: body.providerId,
        name: body.providerId.charAt(0).toUpperCase() + body.providerId.slice(1),
      },
      timestamp: new Date().toISOString(),
    };

    logger.info('LLM configured successfully', {
      providerId: body.providerId,
      validated: result.validated,
      duration: Date.now() - startTime,
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    logger.error('LLM configuration failed', {
      error: error.message,
      stack: error.stack,
      duration: Date.now() - startTime,
    });

    const errorResponse: ErrorResponse = {
      success: false,
      error: 'LLM configuration failed',
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
