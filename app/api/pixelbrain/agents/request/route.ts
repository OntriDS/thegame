/**
 * POST /api/pixelbrain/agents/request
 *
 * Request an agent to execute a task
 *
 * This endpoint allows thegame to request a specific pixelbrain agent
 * to execute a task with provided parameters and options.
 *
 * @route POST /api/pixelbrain/agents/request
 * @authentication Required (JWT token)
 * @rateLimit 20 requests per minute
 */

import { NextRequest, NextResponse } from 'next/server';
import PixelbrainClient from '@/lib/mcp/pixelbrain-client';
import { loadPixelbrainConfig } from '@/lib/config/pixelbrain-config';
import { logger } from '@/lib/utils/logger';

/**
 * Agent request body
 */
interface AgentRequest {
  agentName: string;
  task: {
    type: 'validation' | 'planning' | 'organization' | 'preparation' | 'marketing' | 'analysis' | 'design';
    priority: 'low' | 'medium' | 'high' | 'critical';
    parameters: Record<string, any>;
    context: {
      system: string;
      userId?: string;
      sessionId?: string;
      metadata?: Record<string, any>;
    };
  };
  options?: {
    timeout?: number;
    llmProvider?: string;
    enableCaching?: boolean;
    retryOnFailure?: boolean;
    maxRetries?: number;
  };
}

/**
 * Agent request response
 */
interface AgentRequestResponse {
  success: boolean;
  taskId: string;
  agentId: string;
  status: 'queued' | 'in-progress' | 'completed' | 'failed' | 'cancelled';
  estimatedCompletion?: string;
  estimatedCost: number;
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
 * POST handler for agent task request
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
    const body: AgentRequest = await request.json().catch(() => ({}));

    // Validate request body
    if (!body.agentName) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Invalid request',
        details: 'Agent name is required',
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    if (!body.task) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Invalid request',
        details: 'Task definition is required',
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    if (!body.task.type || !body.task.priority || !body.task.parameters || !body.task.context) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Invalid request',
        details: 'Task must include type, priority, parameters, and context',
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    logger.info('Requesting agent task', {
      agentName: body.agentName,
      taskType: body.task.type,
      priority: body.task.priority,
    });

    // Load configuration
    const config = await loadPixelbrainConfig();

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

    // Generate task ID
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Build task object
    const task = {
      id: taskId,
      type: body.task.type,
      priority: body.task.priority,
      parameters: body.task.parameters,
      context: body.task.context,
      options: body.options,
    };

    // Request agent
    const result = await client.requestAgent(body.agentName, task);

    const response: AgentRequestResponse = {
      success: true,
      taskId: result.taskId,
      agentId: result.agentId,
      status: result.status,
      estimatedCompletion: result.estimatedCompletion?.toISOString(),
      estimatedCost: result.metadata.cost || 0,
      message: 'Task submitted successfully',
      timestamp: new Date().toISOString(),
    };

    logger.info('Agent task requested successfully', {
      taskId: result.taskId,
      agentId: result.agentId,
      status: result.status,
      duration: Date.now() - startTime,
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    logger.error('Agent request failed', {
      error: error.message,
      stack: error.stack,
      duration: Date.now() - startTime,
    });

    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Agent request failed',
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
    } else if (error.message.includes('timeout')) {
      statusCode = 504;
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
