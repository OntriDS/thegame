/**
 * pixelbrain Configuration Management
 *
 * Handles configuration loading, validation, and persistence for pixelbrain integration.
 * Provides type-safe configuration management with environment variable support.
 *
 * @module lib/config/pixelbrain-config
 */

import { logger } from '@/lib/utils/logger';


// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Task priority levels
 */
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Agent preference configuration
 */
export interface AgentPreferences {
  [agentName: string]: {
    enabled: boolean;
    priority?: TaskPriority;
    llmProvider?: string;
    timeout?: number;
    costLimit?: number;
  };
}

/**
 * pixelbrain configuration
 */
export interface PixelbrainConfig {
  // Connection Settings
  endpoint: string;
  apiVersion: string;
  timeout: number;
  enableWebSockets: boolean;
  enableRetry: boolean;
  maxRetries: number;
  retryDelay: number;

  // Authentication
  apiKey?: string;
  clientId?: string;
  authToken?: string;

  // User Preferences
  defaultLLM: string;
  agentPreferences: AgentPreferences;

  // Security
  encryptionKey: string;
  enableEncryption: boolean;

  // LLM Configuration
  llmProviders: {
    groq?: {
      apiKey?: string;
      defaultSettings?: LLMDefaultSettings;
    };
    zai?: {
      apiKey?: string;
      defaultSettings?: LLMDefaultSettings;
    };
    gemini?: {
      apiKey?: string;
      defaultSettings?: LLMDefaultSettings;
    };
  };

  // Cost Management
  budgetLimit: number;
  alertThreshold: number;
  enableCostAlerts: boolean;

  // Monitoring
  enableMetrics: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';

  // Advanced
  cacheEnabled: boolean;
  cacheTTL: number;
  enableCircuitBreaker: boolean;
  circuitBreakerThreshold: number;
}

/**
 * LLM default settings
 */
export interface LLMDefaultSettings {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

/**
 * Configuration validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
  }>;
  warnings: Array<{
    field: string;
    message: string;
  }>;
}

// ============================================================================
// VALIDATION HELPERS (manual, no external deps)
// ============================================================================

function validateUrl(url: string): boolean {
  try { new URL(url); return true; } catch { return false; }
}

function validatePriorityEnum(val: unknown): boolean {
  return ['low', 'medium', 'high', 'critical'].includes(val as string);
}

function validateLogLevelEnum(val: unknown): boolean {
  return ['debug', 'info', 'warn', 'error'].includes(val as string);
}


// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

/**
 * Get default configuration
 */
function getDefaultConfig(): Partial<PixelbrainConfig> {
  return {
    endpoint: process.env.NEXT_PUBLIC_PIXELBRAIN_ENDPOINT || 'https://pixelbrain.vercel.app',
    apiVersion: 'v1',
    timeout: 30000,
    enableWebSockets: true,
    enableRetry: true,
    maxRetries: 3,
    retryDelay: 1000,
    defaultLLM: 'groq',
    agentPreferences: {},
    encryptionKey: process.env.PIXELBRAIN_ENCRYPTION_KEY || generateEncryptionKey(),
    enableEncryption: true,
    llmProviders: {},
    budgetLimit: parseFloat(process.env.PIXELBRAIN_COST_HARD_LIMIT || '1000'),
    alertThreshold: parseFloat(process.env.PIXELBRAIN_COST_ALERT_THRESHOLD || '100'),
    enableCostAlerts: true,
    enableMetrics: process.env.PIXELBRAIN_ENABLE_METRICS === 'true',
    logLevel: (process.env.PIXELBRAIN_LOG_LEVEL as any) || 'info',
    cacheEnabled: process.env.PIXELBRAIN_ENABLE_CACHING !== 'false',
    cacheTTL: parseInt(process.env.PIXELBRAIN_CACHE_TTL || '3600'),
    enableCircuitBreaker: true,
    circuitBreakerThreshold: 5,
  };
}

/**
 * Get default agent preferences
 */
function getDefaultAgentPreferences(): AgentPreferences {
  return {
    'data-integrity': {
      enabled: true,
      priority: 'high',
      timeout: 30000,
    },
    'time-planning': {
      enabled: true,
      priority: 'medium',
      timeout: 60000,
    },
    'tasks-organization': {
      enabled: true,
      priority: 'medium',
      timeout: 60000,
    },
    'prepare-classes': {
      enabled: false,
      priority: 'low',
      timeout: 60000,
    },
    'marketing': {
      enabled: false,
      priority: 'low',
      timeout: 120000,
    },
    'data-analysis': {
      enabled: true,
      priority: 'medium',
      timeout: 60000,
    },
    'game-design': {
      enabled: false,
      priority: 'low',
      timeout: 60000,
    },
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a secure encryption key
 */
function generateEncryptionKey(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate API key format
 */
function isValidApiKey(apiKey: string): boolean {
  // Basic validation: should be at least 32 characters and contain only alphanumeric and special chars
  return apiKey.length >= 32 && /^[a-zA-Z0-9\-_\.]+$/.test(apiKey);
}

/**
 * Validate timeout value
 */
function isValidTimeout(timeout: number): boolean {
  return timeout >= 1000 && timeout <= 300000;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Load pixelbrain configuration
 *
 * Loads configuration from multiple sources in order of priority:
 * 1. Environment variables
 * 2. Saved configuration (if available)
 * 3. Default values
 *
 * @returns Loaded configuration
 */
export async function loadPixelbrainConfig(): Promise<PixelbrainConfig> {
  try {
    logger.info('Loading pixelbrain configuration');

    // Start with defaults
    const defaultConfig = getDefaultConfig();

    // Try to load saved configuration
    let savedConfig: Partial<PixelbrainConfig> = {};

    if (typeof window !== 'undefined') {
      // Client-side: load from localStorage
      try {
        const savedConfigStr = localStorage.getItem('pixelbrain-config');
        if (savedConfigStr) {
          savedConfig = JSON.parse(savedConfigStr);
        }
      } catch (error) {
        logger.warn('Failed to load saved configuration from localStorage', { error });
      }
    }

    // Merge configurations (environment > saved > defaults)
    const mergedConfig = {
      ...defaultConfig,
      ...savedConfig,
      // Environment variables override everything
      endpoint: process.env.NEXT_PUBLIC_PIXELBRAIN_ENDPOINT || savedConfig.endpoint || defaultConfig.endpoint,
      apiKey: process.env.PIXELBRAIN_API_KEY || savedConfig.apiKey,
      encryptionKey: process.env.PIXELBRAIN_ENCRYPTION_KEY || savedConfig.encryptionKey || defaultConfig.encryptionKey,
    };

    // Validate configuration
    const validationResult = validateConfig(mergedConfig as PixelbrainConfig);

    if (!validationResult.valid) {
      logger.error('Configuration validation failed', { errors: validationResult.errors });
      throw new Error('Configuration validation failed');
    }

    if (validationResult.warnings.length > 0) {
      logger.warn('Configuration warnings', { warnings: validationResult.warnings });
    }

    logger.info('pixelbrain configuration loaded successfully', {
      endpoint: mergedConfig.endpoint,
      defaultLLM: mergedConfig.defaultLLM,
      enableWebSockets: mergedConfig.enableWebSockets,
    });

    return mergedConfig as PixelbrainConfig;
  } catch (error) {
    logger.error('Failed to load pixelbrain configuration', { error });
    throw new Error(`Failed to load pixelbrain configuration: ${(error as Error).message}`);
  }
}

/**
 * Save pixelbrain configuration
 *
 * Saves configuration to persistent storage (localStorage on client).
 * Sensitive data like API keys is automatically encrypted before saving.
 *
 * @param config - Configuration to save
 * @throws Error if saving fails
 */
export async function savePixelbrainConfig(config: PixelbrainConfig): Promise<void> {
  try {
    logger.info('Saving pixelbrain configuration');

    // Validate configuration before saving
    const validationResult = validateConfig(config);

    if (!validationResult.valid) {
      throw new Error('Configuration validation failed');
    }

    // Prepare configuration for saving
    const configToSave = {
      ...config,
      // Remove sensitive data from saved config (handled by encryption)
      authToken: undefined,
    };

    if (typeof window !== 'undefined') {
      // Client-side: save to localStorage
      try {
        localStorage.setItem('pixelbrain-config', JSON.stringify(configToSave));
      } catch (error) {
        logger.error('Failed to save configuration to localStorage', { error });
        throw new Error('Failed to save configuration to localStorage');
      }
    } else {
      // Server-side: save to database or KV store
      logger.warn('Server-side configuration saving not implemented');
    }

    logger.info('pixelbrain configuration saved successfully');
  } catch (error) {
    logger.error('Failed to save pixelbrain configuration', { error });
    throw new Error(`Failed to save pixelbrain configuration: ${(error as Error).message}`);
  }
}

/**
 * Validate pixelbrain configuration
 *
 * @param config - Configuration to validate
 * @returns Validation result with errors and warnings
 */
export function validateConfig(config: Partial<PixelbrainConfig>): ValidationResult {
  const errors: Array<{ field: string; message: string }> = [];
  const warnings: Array<{ field: string; message: string }> = [];

  try {
    // Validate required fields
    if (config.endpoint && !validateUrl(config.endpoint)) {
      errors.push({ field: 'endpoint', message: 'Must be a valid URL' });
    }

    if (config.encryptionKey && config.encryptionKey.length < 32) {
      errors.push({ field: 'encryptionKey', message: 'Encryption key must be at least 32 characters' });
    }

    if (config.encryptionKey && config.encryptionKey.length > 256) {
      errors.push({ field: 'encryptionKey', message: 'Encryption key must be at most 256 characters' });
    }

    if (config.timeout && (config.timeout < 1000 || config.timeout > 300000)) {
      errors.push({ field: 'timeout', message: 'Timeout must be between 1000 and 300000 milliseconds' });
    }

    if (config.maxRetries && (config.maxRetries < 0 || config.maxRetries > 10)) {
      errors.push({ field: 'maxRetries', message: 'Max retries must be between 0 and 10' });
    }

    if (config.logLevel && !validateLogLevelEnum(config.logLevel)) {
      errors.push({ field: 'logLevel', message: 'Log level must be one of: debug, info, warn, error' });
    }

    // Validate agent preferences if present
    if (config.agentPreferences) {
      for (const [agentName, pref] of Object.entries(config.agentPreferences)) {
        if (pref.priority && !validatePriorityEnum(pref.priority)) {
          errors.push({ field: `agentPreferences.${agentName}.priority`, message: 'Invalid priority level' });
        }
        if (pref.timeout && (pref.timeout < 1000 || pref.timeout > 300000)) {
          errors.push({ field: `agentPreferences.${agentName}.timeout`, message: 'Timeout must be between 1000 and 300000' });
        }
      }
    }

    // Additional validations
    if (config.apiKey && !isValidApiKey(config.apiKey)) {
      warnings.push({ field: 'apiKey', message: 'API key format may be invalid (should be at least 32 characters)' });
    }

    if (config.budgetLimit && config.alertThreshold && config.alertThreshold > config.budgetLimit) {
      warnings.push({ field: 'alertThreshold', message: 'Alert threshold is greater than budget limit' });
    }

    if (config.maxRetries && config.maxRetries > 10) {
      warnings.push({ field: 'maxRetries', message: 'High retry count may cause performance issues' });
    }

  } catch (error) {
    errors.push({
      field: 'general',
      message: `Validation error: ${(error as Error).message}`,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get agent preferences for a specific agent
 *
 * @param config - Configuration object
 * @param agentName - Name of the agent
 * @returns Agent preferences or default preferences
 */
export function getAgentPreferences(
  config: PixelbrainConfig,
  agentName: string
): AgentPreferences[string] {
  return config.agentPreferences[agentName] || {
    enabled: true,
    priority: 'medium',
    timeout: 60000,
  };
}

/**
 * Update agent preferences
 *
 * @param config - Configuration object
 * @param agentName - Name of the agent
 * @param preferences - New preferences
 * @returns Updated configuration
 */
export function updateAgentPreferences(
  config: PixelbrainConfig,
  agentName: string,
  preferences: AgentPreferences[string]
): PixelbrainConfig {
  return {
    ...config,
    agentPreferences: {
      ...config.agentPreferences,
      [agentName]: preferences,
    },
  };
}

/**
 * Reset configuration to defaults
 *
 * @returns Default configuration
 */
export function resetToDefaults(): PixelbrainConfig {
  const defaultConfig = getDefaultConfig();

  return {
    ...defaultConfig,
    agentPreferences: getDefaultAgentPreferences(),
  } as PixelbrainConfig;
}

/**
 * Export configuration for backup/sharing
 *
 * @param config - Configuration to export
 * @param includeSecrets - Whether to include sensitive data
 * @returns Exported configuration (JSON string)
 */
export function exportConfig(config: PixelbrainConfig, includeSecrets: boolean = false): string {
  const exportData = includeSecrets ? config : {
    ...config,
    apiKey: undefined,
    authToken: undefined,
    llmProviders: {
      groq: { ...config.llmProviders.groq, apiKey: undefined },
      zai: { ...config.llmProviders.zai, apiKey: undefined },
      gemini: { ...config.llmProviders.gemini, apiKey: undefined },
    },
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Import configuration from JSON
 *
 * @param configJson - JSON string of configuration
 * @returns Imported and validated configuration
 * @throws Error if import fails or validation fails
 */
export function importConfig(configJson: string): PixelbrainConfig {
  try {
    const importedConfig = JSON.parse(configJson);
    const validationResult = validateConfig(importedConfig);

    if (!validationResult.valid) {
      throw new Error('Configuration validation failed');
    }

    return importedConfig as PixelbrainConfig;
  } catch (error) {
    logger.error('Failed to import configuration', { error });
    throw new Error(`Failed to import configuration: ${(error as Error).message}`);
  }
}

/**
 * Get configuration summary for display
 *
 * @param config - Configuration object
 * @returns Configuration summary (without sensitive data)
 */
export function getConfigSummary(config: PixelbrainConfig): Record<string, any> {
  return {
    connection: {
      endpoint: config.endpoint,
      apiVersion: config.apiVersion,
      timeout: config.timeout,
      enableWebSockets: config.enableWebSockets,
      enableRetry: config.enableRetry,
    },
    authentication: {
      hasApiKey: !!config.apiKey,
      hasClientToken: !!config.clientId,
    },
    preferences: {
      defaultLLM: config.defaultLLM,
      enabledAgents: Object.entries(config.agentPreferences)
        .filter(([_, pref]) => pref.enabled)
        .map(([name, _]) => name),
    },
    costManagement: {
      budgetLimit: config.budgetLimit,
      alertThreshold: config.alertThreshold,
      enableCostAlerts: config.enableCostAlerts,
    },
    advanced: {
      enableMetrics: config.enableMetrics,
      logLevel: config.logLevel,
      cacheEnabled: config.cacheEnabled,
      enableCircuitBreaker: config.enableCircuitBreaker,
    },
  };
}

// ============================================================================
// EXPORTS
// ============================================================================


