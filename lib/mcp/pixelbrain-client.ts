/**
 * pixelbrain MCP Client
 *
 * Main client for communicating with the pixelbrain AI orchestrator.
 * Handles authentication, connection management, agent interaction,
 * LLM configuration, data sharing, and system monitoring.
 *
 * @module lib/mcp/pixelbrain-client
 */

import { logger } from '@/lib/utils/logger';

// ============================================================================
// INTERNAL HTTP CLIENT (using fetch instead of axios)
// ============================================================================

interface RequestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: unknown;
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
  _retryCount?: number;
}

interface HttpResponse<T = unknown> {
  data: T;
  status: number;
  headers: Headers;
}

// Minimal stub for Socket type (socket.io-client not installed yet)
interface SocketStub {
  connected: boolean;
  on(event: string, callback: (...args: unknown[]) => void): void;
  emit(event: string, data?: unknown): void;
  disconnect(): void;
}


// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Authentication token returned by pixelbrain
 */
export interface AuthToken {
  token: string;
  expiresAt: Date;
  refreshToken?: string;
}

/**
 * Client registration information
 */
export interface ClientInfo {
  clientId: string;
  systemName: string;
  version: string;
  capabilities: string[];
  environment: 'development' | 'staging' | 'production';
}

/**
 * Connection configuration
 */
export interface ConnectionConfig {
  endpoint: string;
  apiVersion?: string;
  timeout?: number;
  enableWebSockets?: boolean;
  enableRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  apiKey?: string;
}

/**
 * Connection result
 */
export interface ConnectionResult {
  success: boolean;
  connectionId: string;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  authToken: AuthToken;
  discoveredTools: number;
  serverVersion: string;
  message: string;
}

/**
 * Connection status
 */
export interface ConnectionStatus {
  connected: boolean;
  connectionId: string;
  lastActivity: Date;
  systemHealth: 'healthy' | 'degraded' | 'unhealthy';
  activeAgents: number;
  uptime: number;
  latency: number;
  totalRequests: number;
}

/**
 * Agent task definition
 */
export interface Task {
  id: string;
  type: TaskType;
  priority: TaskPriority;
  parameters: Record<string, any>;
  context: TaskContext;
  options?: TaskOptions;
}

/**
 * Task types supported by pixelbrain
 */
export type TaskType =
  | 'validation'
  | 'planning'
  | 'organization'
  | 'preparation'
  | 'marketing'
  | 'analysis'
  | 'design';

/**
 * Task priority levels
 */
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Task context information
 */
export interface TaskContext {
  system: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

/**
 * Task execution options
 */
export interface TaskOptions {
  timeout?: number;
  llmProvider?: string;
  enableCaching?: boolean;
  retryOnFailure?: boolean;
  maxRetries?: number;
}

/**
 * Task result from agent execution
 */
export interface TaskResult {
  taskId: string;
  agentId: string;
  status: 'queued' | 'in-progress' | 'completed' | 'failed' | 'cancelled';
  data: any;
  errors?: Error[];
  metadata: {
    executionTime: number;
    llmProvider?: string;
    tokenUsage?: TokenUsage;
    cost?: number;
    timestamp: Date;
  };
  estimatedCompletion?: Date;
}

/**
 * Agent status information
 */
export interface AgentStatus {
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
  lastActivity: Date;
  capabilities: string[];
  llmProvider?: string;
}

/**
 * Agent event subscription
 */
export interface AgentEvent {
  agentId: string;
  eventType: string;
  callback: (event: AgentMessage) => void;
}

/**
 * Agent message/event
 */
export interface AgentMessage {
  agentId: string;
  eventType: string;
  timestamp: Date;
  data: any;
  metadata?: Record<string, any>;
}

/**
 * Event stream for agent events
 */
export interface EventStream {
  agentId: string;
  eventType: string;
  stream: AsyncGenerator<AgentMessage>;
  close: () => void;
}

/**
 * LLM configuration
 */
export interface LLMConfig {
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
 * LLM configuration result
 */
export interface ConfigResult {
  success: boolean;
  message: string;
  validated: boolean;
  provider?: {
    id: string;
    name: string;
  };
  timestamp: Date;
}

/**
 * LLM provider information
 */
export interface LLMProvider {
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
 * Switch LLM result
 */
export interface SwitchResult {
  success: boolean;
  agentId: string;
  previousProvider: string;
  newProvider: string;
  timestamp: Date;
  message: string;
}

/**
 * Data share request
 */
export interface DataShareRequest {
  entityType: string;
  entityIds: string[];
  shareType: 'read-only' | 'read-write';
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

/**
 * Data share result
 */
export interface ShareResult {
  success: boolean;
  shareToken: string;
  expiresAt: Date;
  entitiesShared: number;
  accessUrl: string;
  metadata?: Record<string, any>;
}

/**
 * Data request
 */
export interface DataRequest {
  shareToken: string;
  includeMetadata?: boolean;
  decryptData?: boolean;
}

/**
 * Data response
 */
export interface DataResponse {
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
    sharedAt: Date;
    expiresAt: Date;
  };
}

/**
 * System health information
 */
export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  services: {
    agents: ServiceStatus;
    llm: ServiceStatus;
    mcp: ServiceStatus;
    database: ServiceStatus;
  };
  systemLoad: number;
  activeConnections: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
}

/**
 * Individual service status
 */
export interface ServiceStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  uptime: number;
  errorRate: number;
}

/**
 * Usage statistics
 */
export interface UsageStats {
  period: {
    start: Date;
    end: Date;
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
}

/**
 * Agent preferences
 */
export interface AgentPreferences {
  [agentName: string]: {
    enabled: boolean;
    priority?: TaskPriority;
    llmProvider?: string;
    timeout?: number;
  };
}

/**
 * Token usage information
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// ============================================================================
// CLIENT IMPLEMENTATION
// ============================================================================

/**
 * pixelbrain MCP Client
 *
 * Main client for communicating with the pixelbrain AI orchestrator.
 * Provides comprehensive functionality for agent management, LLM configuration,
 * data sharing, and system monitoring.
 *
 * @example
 * ```typescript
 * const client = new PixelbrainClient({
 *   endpoint: 'https://pixelbrain.vercel.app',
 *   timeout: 30000,
 *   enableWebSockets: true
 * });
 *
 * await client.connect({
 *   endpoint: 'https://pixelbrain.vercel.app',
 *   apiKey: 'your-api-key'
 * });
 *
 * const result = await client.requestAgent('data-integrity', {
 *   type: 'validation',
 *   priority: 'high',
 *   parameters: { validationType: 'link-consistency' },
 *   context: { system: 'thegame' }
 * });
 * ```
 */
export class PixelbrainClient {
  private readonly baseURL: string;
  private readonly timeout: number;
  private defaultHeaders: Record<string, string>;
  private socket: SocketStub | null = null;
  private authToken: AuthToken | null = null;
  private connectionId: string | null = null;
  private isConnected: boolean = false;
  private connectionConfig: ConnectionConfig;
  private eventSubscriptions: Map<string, AgentEvent[]> = new Map();
  private circuitBreaker: CircuitBreaker;

  // Connection tracking
  private lastActivity: Date | null = null;
  private connectionStartTime: Date | null = null;
  private totalRequests: number = 0;

  /**
   * Create a new PixelbrainClient instance
   *
   * @param config - Connection configuration
   */
  constructor(config: ConnectionConfig) {
    this.connectionConfig = {
      apiVersion: 'v1',
      timeout: 30000,
      enableWebSockets: true,
      enableRetry: true,
      maxRetries: 3,
      retryDelay: 1000,
      ...config,
    };

    this.baseURL = `${config.endpoint}/api/${this.connectionConfig.apiVersion}`;
    this.timeout = this.connectionConfig.timeout || 30000;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'thegame-pixelbrain-client/1.0.0',
    };

    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 60000,
    });

    logger.info('PixelbrainClient initialized', {
      endpoint: config.endpoint,
      timeout: this.connectionConfig.timeout,
      enableWebSockets: this.connectionConfig.enableWebSockets,
    });
  }

  /**
   * Internal HTTP GET request
   */
  private async httpGet<T = unknown>(path: string, params?: Record<string, unknown>): Promise<HttpResponse<T>> {
    const url = new URL(`${this.baseURL}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      });
    }

    const headers = { ...this.defaultHeaders };
    if (this.authToken) headers['Authorization'] = `Bearer ${this.authToken.token}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(url.toString(), {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json() as T;
      return { data, status: res.status, headers: res.headers };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Internal HTTP POST request
   */
  private async httpPost<T = unknown>(path: string, body?: unknown): Promise<HttpResponse<T>> {
    const headers = { ...this.defaultHeaders };
    if (this.authToken) headers['Authorization'] = `Bearer ${this.authToken.token}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(`${this.baseURL}${path}`, {
        method: 'POST',
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json() as T;
      return { data, status: res.status, headers: res.headers };
    } finally {
      clearTimeout(timeoutId);
    }
  }


  // ==========================================================================
  // AUTHENTICATION METHODS
  // ==========================================================================

  /**
   * Authenticate with pixelbrain using API key
   *
   * @param apiKey - API key for authentication
   * @returns Authentication token
   * @throws Error if authentication fails
   */
  async authenticate(apiKey: string): Promise<AuthToken> {
    try {
      logger.debug('Authenticating with pixelbrain');

      const response = await this.httpPost('/auth/token', {
        apiKey,
        clientId: 'thegame',
        systemName: 'thegame',
        capabilities: [
          'tasks',
          'items',
          'sales',
          'archive',
          'analytics',
          'financials',
        ],
      });

      const { token, expiresAt, refreshToken } = (response.data as any);

      this.authToken = {
        token,
        expiresAt: new Date(expiresAt),
        refreshToken,
      };

      logger.info('Authentication successful', {
        expiresAt: this.authToken.expiresAt,
      });

      return this.authToken;
    } catch (error) {
      logger.error('Authentication failed', { error });
      throw new Error(`Authentication failed: ${(error as Error).message}`);
    }
  }

  /**
   * Register client with pixelbrain
   *
   * @param clientInfo - Client registration information
   * @returns Client ID
   * @throws Error if registration fails
   */
  async registerClient(clientInfo: ClientInfo): Promise<string> {
    try {
      logger.debug('Registering client', { clientInfo });

      const response = await this.httpPost('/clients/register', clientInfo);

      const { clientId } = (response.data as any);

      logger.info('Client registered successfully', { clientId });

      return clientId;
    } catch (error) {
      logger.error('Client registration failed', { error });
      throw new Error(`Client registration failed: ${(error as Error).message}`);
    }
  }

  // ==========================================================================
  // CONNECTION MANAGEMENT METHODS
  // ==========================================================================

  /**
   * Connect to pixelbrain
   *
   * @param config - Connection configuration (optional, uses constructor config if not provided)
   * @returns Connection result
   * @throws Error if connection fails
   */
  async connect(config?: Partial<ConnectionConfig>): Promise<ConnectionResult> {
    try {
      logger.info('Connecting to pixelbrain', { config });

      // Update config if provided
      if (config) {
        this.connectionConfig = { ...this.connectionConfig, ...config };
      }

      // Check if API key is provided
      if (!this.connectionConfig.apiKey) {
        throw new Error('API key is required for connection');
      }

      // Authenticate
      await this.authenticate(this.connectionConfig.apiKey);

      // Register client
      const clientId = await this.registerClient({
        clientId: 'thegame',
        systemName: 'thegame',
        version: '1.0.0',
        capabilities: [
          'tasks',
          'items',
          'sales',
          'archive',
          'analytics',
          'financials',
        ],
        environment: (process.env.NODE_ENV as any) || 'development',
      });

      // Establish connection
      const response = await this.httpPost('/systems/connect', {
        systemId: clientId,
        systemName: 'thegame',
        version: '1.0.0',
        capabilities: [
          'tasks',
          'items',
          'sales',
          'archive',
          'analytics',
          'financials',
        ],
        authentication: {
          type: 'apiKey',
          apiKey: this.connectionConfig.apiKey,
        },
      });

      const data = (response.data as any);

      // Update connection state
      this.connectionId = data.connectionId;
      this.isConnected = true;
      this.lastActivity = new Date();
      this.connectionStartTime = new Date();

      // Initialize WebSocket if enabled
      if (this.connectionConfig.enableWebSockets) {
        await this.initializeWebSocket();
      }

      // Reset circuit breaker on successful connection
      this.circuitBreaker.reset();

      logger.info('Connected to pixelbrain', {
        connectionId: this.connectionId,
        serverVersion: data.serverVersion,
        discoveredTools: data.discoveredTools,
      });

      return {
        success: true,
        connectionId: this.connectionId ?? '',
        status: 'connected',
        authToken: this.authToken!,
        discoveredTools: data.discoveredTools,
        serverVersion: data.serverVersion,
        message: 'Connected to pixelbrain successfully',
      };
    } catch (error) {
      logger.error('Connection failed', { error });
      this.isConnected = false;
      throw new Error(`Connection failed: ${(error as Error).message}`);
    }
  }

  /**
   * Disconnect from pixelbrain
   *
   * @throws Error if disconnection fails
   */
  async disconnect(): Promise<void> {
    try {
      logger.info('Disconnecting from pixelbrain');

      // Close WebSocket connection
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }

      // Unsubscribe from all events
      this.eventSubscriptions.clear();

      // Disconnect from server
      if (this.connectionId) {
        await this.httpPost('/systems/disconnect', {
          systemId: 'thegame',
          connectionId: this.connectionId,
        });
      }

      // Clear connection state
      this.isConnected = false;
      this.connectionId = null;
      this.authToken = null;
      this.lastActivity = null;
      this.connectionStartTime = null;

      logger.info('Disconnected from pixelbrain');
    } catch (error) {
      logger.error('Disconnection failed', { error });
      throw new Error(`Disconnection failed: ${(error as Error).message}`);
    }
  }

  /**
   * Check if client is connected to pixelbrain
   *
   * @returns Connection status
   */
  isConnectedToServer(): boolean {
    return this.isConnected && this.authToken !== null;
  }

  /**
   * Get current connection status
   *
   * @returns Connection status
   * @throws Error if request fails
   */
  async getConnectionStatus(): Promise<ConnectionStatus> {
    try {
      if (!this.isConnectedToServer()) {
        throw new Error('Not connected to pixelbrain');
      }

      const response = await this.httpGet('/systems/thegame/status');
      const data = (response.data as any);

      // Update local tracking
      this.lastActivity = new Date();
      this.totalRequests++;

      return {
        connected: true,
        connectionId: this.connectionId!,
        lastActivity: new Date(data.lastActivity),
        systemHealth: data.health,
        activeAgents: data.activeAgents,
        uptime: data.uptime,
        latency: data.averageLatency,
        totalRequests: data.totalRequests,
      };
    } catch (error) {
      logger.error('Failed to get connection status', { error });
      throw new Error(`Failed to get connection status: ${(error as Error).message}`);
    }
  }

  // ==========================================================================
  // AGENT INTERACTION METHODS
  // ==========================================================================

  /**
   * Request agent to execute a task
   *
   * @param agentName - Name of the agent to request
   * @param task - Task definition
   * @returns Task result with task ID and status
   * @throws Error if request fails
   */
  async requestAgent(agentName: string, task: Task): Promise<TaskResult> {
    try {
      if (!this.isConnectedToServer()) {
        throw new Error('Not connected to pixelbrain');
      }

      logger.debug('Requesting agent', { agentName, task });

      const response = await this.httpPost(`/agents/${agentName}/execute`, {
        task: {
          id: task.id,
          type: task.type,
          priority: task.priority,
          parameters: task.parameters,
          context: task.context,
        },
        options: task.options,
      });

      const data = (response.data as any);

      // Update local tracking
      this.lastActivity = new Date();
      this.totalRequests++;

      logger.info('Agent task requested', {
        agentName,
        taskId: data.taskId,
        status: data.status,
      });

      return {
        taskId: data.taskId,
        agentId: data.agentId,
        status: data.status,
        data: data.data,
        errors: data.errors,
        metadata: {
          executionTime: data.metadata?.executionTime || 0,
          llmProvider: data.metadata?.llmProvider,
          tokenUsage: data.metadata?.tokenUsage,
          cost: data.metadata?.cost,
          timestamp: new Date(),
        },
        estimatedCompletion: data.estimatedCompletion
          ? new Date(data.estimatedCompletion)
          : undefined,
      };
    } catch (error) {
      logger.error('Agent request failed', { error, agentName, task });
      throw new Error(`Agent request failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get status of a specific agent
   *
   * @param agentName - Name of the agent
   * @returns Agent status
   * @throws Error if request fails
   */
  async getAgentStatus(agentName: string): Promise<AgentStatus> {
    try {
      if (!this.isConnectedToServer()) {
        throw new Error('Not connected to pixelbrain');
      }

      const response = await this.httpGet(`/agents/${agentName}/status`);
      const data = (response.data as any);

      // Update local tracking
      this.lastActivity = new Date();
      this.totalRequests++;

      return {
        agentId: data.agentId,
        name: data.name,
        type: data.type,
        status: data.status,
        health: data.health,
        activeTasks: data.activeTasks,
        completedTasks: data.completedTasks,
        failedTasks: data.failedTasks,
        errorRate: data.errorRate,
        uptime: data.uptime,
        lastActivity: new Date(data.lastActivity),
        capabilities: data.capabilities,
        llmProvider: data.llmProvider,
      };
    } catch (error) {
      logger.error('Failed to get agent status', { error, agentName });
      throw new Error(`Failed to get agent status: ${(error as Error).message}`);
    }
  }

  /**
   * Get list of available agents
   *
   * @returns Array of agent names
   * @throws Error if request fails
   */
  async getAvailableAgents(): Promise<string[]> {
    try {
      if (!this.isConnectedToServer()) {
        throw new Error('Not connected to pixelbrain');
      }

      const response = await this.httpGet('/agents');
      const agents = (response.data as any).agents || [];

      // Update local tracking
      this.lastActivity = new Date();
      this.totalRequests++;

      logger.info('Available agents retrieved', {
        count: agents.length,
        agents: agents,
      });

      return agents;
    } catch (error) {
      logger.error('Failed to get available agents', { error });
      throw new Error(`Failed to get available agents: ${(error as Error).message}`);
    }
  }

  /**
   * Subscribe to events from a specific agent
   *
   * @param agentName - Name of the agent
   * @param eventType - Type of events to subscribe to
   * @param callback - Callback function for events
   * @returns Event stream
   * @throws Error if subscription fails
   */
  async subscribeToAgentEvents(
    agentName: string,
    eventType: string,
    callback: (event: AgentMessage) => void
  ): Promise<EventStream> {
    try {
      if (!this.isConnectedToServer()) {
        throw new Error('Not connected to pixelbrain');
      }

      logger.debug('Subscribing to agent events', { agentName, eventType });

      const subscriptionKey = `${agentName}:${eventType}`;
      const event: AgentEvent = {
        agentId: agentName,
        eventType,
        callback,
      };

      // Add to subscriptions
      if (!this.eventSubscriptions.has(subscriptionKey)) {
        this.eventSubscriptions.set(subscriptionKey, []);
      }
      this.eventSubscriptions.get(subscriptionKey)!.push(event);

      // Subscribe via WebSocket if available
      if (this.socket && this.socket.connected) {
        this.socket.emit('subscribe', {
          agentId: agentName,
          eventType,
        });
      }

      logger.info('Subscribed to agent events', { agentName, eventType });

      // Create event stream
      const stream = this.createEventStream(agentName, eventType, subscriptionKey);

      return stream;
    } catch (error) {
      logger.error('Failed to subscribe to agent events', { error, agentName, eventType });
      throw new Error(`Failed to subscribe to agent events: ${(error as Error).message}`);
    }
  }

  /**
   * Unsubscribe from agent events
   *
   * @param agentName - Name of the agent
   * @param eventType - Type of events to unsubscribe from
   * @throws Error if unsubscription fails
   */
  async unsubscribeFromAgentEvents(agentName: string, eventType: string): Promise<void> {
    try {
      logger.debug('Unsubscribing from agent events', { agentName, eventType });

      const subscriptionKey = `${agentName}:${eventType}`;
      this.eventSubscriptions.delete(subscriptionKey);

      // Unsubscribe via WebSocket if available
      if (this.socket && this.socket.connected) {
        this.socket.emit('unsubscribe', {
          agentId: agentName,
          eventType,
        });
      }

      logger.info('Unsubscribed from agent events', { agentName, eventType });
    } catch (error) {
      logger.error('Failed to unsubscribe from agent events', { error });
      throw new Error(`Failed to unsubscribe from agent events: ${(error as Error).message}`);
    }
  }

  // ==========================================================================
  // LLM CONFIGURATION METHODS
  // ==========================================================================

  /**
   * Configure LLM settings
   *
   * @param config - LLM configuration
   * @returns Configuration result
   * @throws Error if configuration fails
   */
  async configureLLM(config: LLMConfig): Promise<ConfigResult> {
    try {
      if (!this.isConnectedToServer()) {
        throw new Error('Not connected to pixelbrain');
      }

      logger.debug('Configuring LLM', { providerId: config.providerId });

      const response = await this.httpPost('/llm/configure', {
        providerId: config.providerId,
        apiKey: config.apiKey,
        defaultSettings: config.defaultSettings,
      });

      const data = (response.data as any);

      // Update local tracking
      this.lastActivity = new Date();
      this.totalRequests++;

      logger.info('LLM configured successfully', {
        providerId: config.providerId,
        validated: data.validated,
      });

      return {
        success: data.success,
        message: data.message,
        validated: data.validated,
        provider: data.provider,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('LLM configuration failed', { error, config });
      throw new Error(`LLM configuration failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get available LLM providers
   *
   * @returns List of available LLM providers
   * @throws Error if request fails
   */
  async getAvailableLLMs(): Promise<LLMProvider[]> {
    try {
      if (!this.isConnectedToServer()) {
        throw new Error('Not connected to pixelbrain');
      }

      const response = await this.httpGet('/llm/providers');
      const providers = (response.data as any).providers;

      // Update local tracking
      this.lastActivity = new Date();
      this.totalRequests++;

      return providers;
    } catch (error) {
      logger.error('Failed to get available LLMs', { error });
      throw new Error(`Failed to get available LLMs: ${(error as Error).message}`);
    }
  }

  /**
   * Switch LLM provider for an agent
   *
   * @param agentName - Name of the agent
   * @param llmProvider - LLM provider to switch to
   * @returns Switch result
   * @throws Error if switch fails
   */
  async switchLLM(agentName: string, llmProvider: string): Promise<SwitchResult> {
    try {
      if (!this.isConnectedToServer()) {
        throw new Error('Not connected to pixelbrain');
      }

      logger.debug('Switching LLM', { agentName, llmProvider });

      const response = await this.httpPost(`/agents/${agentName}/llm/switch`, {
        llmProvider,
      });

      const data = (response.data as any);

      // Update local tracking
      this.lastActivity = new Date();
      this.totalRequests++;

      logger.info('LLM switched successfully', {
        agentName,
        previousProvider: data.previousProvider,
        newProvider: data.newProvider,
      });

      return {
        success: data.success,
        agentId: data.agentId,
        previousProvider: data.previousProvider,
        newProvider: data.newProvider,
        timestamp: new Date(),
        message: data.message,
      };
    } catch (error) {
      logger.error('LLM switch failed', { error, agentName, llmProvider });
      throw new Error(`LLM switch failed: ${(error as Error).message}`);
    }
  }

  // ==========================================================================
  // DATA INTEGRATION METHODS
  // ==========================================================================

  /**
   * Share data with pixelbrain
   *
   * @param data - Data share request
   * @returns Share result with access token
   * @throws Error if sharing fails
   */
  async shareData(data: DataShareRequest): Promise<ShareResult> {
    try {
      if (!this.isConnectedToServer()) {
        throw new Error('Not connected to pixelbrain');
      }

      logger.debug('Sharing data', { entityType: data.entityType, entityCount: data.entityIds.length });

      const response = await this.httpPost('/data/share', {
        entityType: data.entityType,
        entityIds: data.entityIds,
        shareType: data.shareType,
        expiresAt: data.expiresAt?.toISOString(),
        metadata: data.metadata,
      });

      const result = (response.data as any);

      // Update local tracking
      this.lastActivity = new Date();
      this.totalRequests++;

      logger.info('Data shared successfully', {
        shareToken: result.shareToken,
        entitiesShared: result.entitiesShared,
      });

      return {
        success: result.success,
        shareToken: result.shareToken,
        expiresAt: new Date(result.expiresAt),
        entitiesShared: result.entitiesShared,
        accessUrl: result.accessUrl,
        metadata: result.metadata,
      };
    } catch (error) {
      logger.error('Data sharing failed', { error, data });
      throw new Error(`Data sharing failed: ${(error as Error).message}`);
    }
  }

  /**
   * Request data from pixelbrain
   *
   * @param data - Data request
   * @returns Data response
   * @throws Error if request fails
   */
  async requestData(data: DataRequest): Promise<DataResponse> {
    try {
      if (!this.isConnectedToServer()) {
        throw new Error('Not connected to pixelbrain');
      }

      logger.debug('Requesting data', { shareToken: data.shareToken });

      const response = await this.httpGet(`/data/request?shareToken=${data.shareToken}`, {
        params: {
          includeMetadata: data.includeMetadata,
          decryptData: data.decryptData,
        },
      });

      const result = (response.data as any);

      // Update local tracking
      this.lastActivity = new Date();
      this.totalRequests++;

      logger.info('Data requested successfully', {
        entityCount: result.data.entities.length,
      });

      return result;
    } catch (error) {
      logger.error('Data request failed', { error, data });
      throw new Error(`Data request failed: ${(error as Error).message}`);
    }
  }

  // ==========================================================================
  // SYSTEM MANAGEMENT METHODS
  // ==========================================================================

  /**
   * Get system health status
   *
   * @returns System health information
   * @throws Error if request fails
   */
  async getSystemHealth(): Promise<SystemHealth> {
    try {
      if (!this.isConnectedToServer()) {
        throw new Error('Not connected to pixelbrain');
      }

      const response = await this.httpGet('/health');
      const data = (response.data as any);

      // Update local tracking
      this.lastActivity = new Date();
      this.totalRequests++;

      return {
        status: data.status,
        timestamp: new Date(data.timestamp),
        services: data.services,
        systemLoad: data.systemLoad,
        activeConnections: data.activeConnections,
        memoryUsage: data.memoryUsage,
      };
    } catch (error) {
      logger.error('Failed to get system health', { error });
      throw new Error(`Failed to get system health: ${(error as Error).message}`);
    }
  }

  /**
   * Get usage statistics
   *
   * @param period - Period for statistics (default: current month)
   * @returns Usage statistics
   * @throws Error if request fails
   */
  async getUsageStats(period?: { start?: Date; end?: Date }): Promise<UsageStats> {
    try {
      if (!this.isConnectedToServer()) {
        throw new Error('Not connected to pixelbrain');
      }

      const params: any = {};
      if (period?.start) {
        params.start = period.start.toISOString();
      }
      if (period?.end) {
        params.end = period.end.toISOString();
      }

      const response = await this.httpGet('/llm/usage', { params });
      const data = (response.data as any);

      // Update local tracking
      this.lastActivity = new Date();
      this.totalRequests++;

      return {
        period: {
          start: new Date(data.period.start),
          end: new Date(data.period.end),
        },
        totalRequests: data.totalRequests,
        totalTokens: data.totalTokens,
        totalCost: data.totalCost,
        averageLatency: data.averageLatency,
        successRate: data.successRate,
        byProvider: data.byProvider,
        byAgent: data.byAgent,
      };
    } catch (error) {
      logger.error('Failed to get usage stats', { error });
      throw new Error(`Failed to get usage stats: ${(error as Error).message}`);
    }
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  /**
   * Initialize WebSocket connection
   *
   * @private
   */
  private async initializeWebSocket(): Promise<void> {
    // WebSocket (socket.io-client) is not yet installed.
    // This is a stub that will be implemented when the pixelbrain app is ready.
    logger.warn('WebSocket support not yet implemented - socket.io-client not installed');
    // Stub socket object
    this.socket = {
      connected: false,
      on: () => { /* noop */ },
      emit: () => { /* noop */ },
      disconnect: () => { /* noop */ },
    };
  }

  /**
   * Handle agent events from WebSocket
   *
   * @param event - Agent event
   * @private
   */
  private handleAgentEvent(event: AgentMessage): void {
    const subscriptionKey = `${event.agentId}:${event.eventType}`;
    const subscriptions = this.eventSubscriptions.get(subscriptionKey);

    if (subscriptions) {
      subscriptions.forEach((subscription) => {
        try {
          subscription.callback(event);
        } catch (error) {
          logger.error('Error in event callback', { error, event });
        }
      });
    }
  }

  /**
   * Create event stream for agent events
   *
   * @param agentName - Name of the agent
   * @param eventType - Type of events
   * @param subscriptionKey - Subscription key
   * @returns Event stream
   * @private
   */
  private createEventStream(
    agentName: string,
    eventType: string,
    subscriptionKey: string
  ): EventStream {
    const events: AgentMessage[] = [];
    let isClosed = false;

    const stream = {
      agentId: agentName,
      eventType,
      stream: (async function* () {
        while (!isClosed) {
          const event = events.shift();
          if (event) {
            yield event;
          } else {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }
      })(),
      close: () => {
        isClosed = true;
        this.eventSubscriptions.delete(subscriptionKey);
      },
    };

    return stream;
  }

  /**
   * Handle request errors with retry logic (simplified, no axios)
   *
   * @param error - Error object
   * @returns Always throws
   * @private
   */
  private async handleRequestError(error: Error): Promise<never> {
    // Check circuit breaker
    if (this.circuitBreaker.shouldTrip()) {
      logger.error('Circuit breaker tripped');
      throw new Error('Circuit breaker is open');
    }

    throw error;
  }

} // end class PixelbrainClient

// ============================================================================
// CIRCUIT BREAKER IMPLEMENTATION
// ============================================================================

/**
 * Circuit Breaker for resilience
 *
 * Prevents cascading failures by stopping requests to a failing service
 * after a threshold of failures is reached.
 */
class CircuitBreaker {
  private failureCount: number = 0;
  private lastFailureTime: Date | null = null;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private readonly failureThreshold: number;
  private readonly resetTimeout: number;

  constructor(config: { failureThreshold: number; resetTimeout: number }) {
    this.failureThreshold = config.failureThreshold;
    this.resetTimeout = config.resetTimeout;
  }

  /**
   * Check if circuit breaker should trip
   *
   * @returns True if circuit should be tripped
   */
  shouldTrip(): boolean {
    if (this.state === 'open') {
      // Check if we can attempt reset
      if (
        this.lastFailureTime &&
        new Date().getTime() - this.lastFailureTime.getTime() > this.resetTimeout
      ) {
        this.state = 'half-open';
        return false;
      }
      return true;
    }

    if (this.state === 'half-open') {
      return this.failureCount >= this.failureThreshold;
    }

    return false;
  }

  /**
   * Record a failure
   */
  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'open';
      logger.warn('Circuit breaker opened', {
        failureCount: this.failureCount,
      });
    }
  }

  /**
   * Record a success
   */
  recordSuccess(): void {
    this.failureCount = Math.max(0, this.failureCount - 1);

    if (this.state === 'half-open' && this.failureCount === 0) {
      this.state = 'closed';
      logger.info('Circuit breaker closed');
    }
  }

  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'closed';
    logger.info('Circuit breaker reset');
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default PixelbrainClient;
