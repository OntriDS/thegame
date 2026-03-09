/**
 * pixelbrain Encryption Utilities
 *
 * Provides secure encryption and decryption utilities for sensitive data
 * such as API keys, tokens, and shared data. Uses AES-256-GCM encryption
 * for maximum security.
 *
 * @module lib/utils/pixelbrain-encryption
 */

import { logger } from '@/lib/utils/logger';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Encrypted API key structure
 */
export interface EncryptedApiKey {
  encryptedKey: string;
  iv: string;
  salt: string;
  version: string;
  timestamp: string;
  keyHash: string;
}

/**
 * Encrypted token structure
 */
export interface EncryptedToken {
  encryptedToken: string;
  iv: string;
  salt: string;
  version: string;
  timestamp: string;
  tokenHash: string;
}

/**
 * Encrypted data structure
 */
export interface EncryptedData {
  encryptedData: string;
  iv: string;
  salt: string;
  version: string;
  timestamp: string;
  dataHash: string;
  metadata?: Record<string, any>;
}

/**
 * Encryption result
 */
export interface EncryptionResult {
  success: boolean;
  encrypted: string;
  error?: string;
}

/**
 * Decryption result
 */
export interface DecryptionResult {
  success: boolean;
  decrypted: string;
  error?: string;
}

/**
 * API key validation result
 */
export interface ApiKeyValidationResult {
  valid: boolean;
  provider?: string;
  format?: string;
  errors?: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ENCRYPTION_VERSION = '1.0';
const ENCRYPTION_ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const PBKDF2_ITERATIONS = 100000;

const PROVIDER_PATTERNS: Record<string, RegExp> = {
  groq: /^gsk_[a-zA-Z0-9]{51}$/,
  zai: /^zai_[a-zA-Z0-9]{32,}$/,
  gemini: /^AIza[a-zA-Z0-9_-]{35}$/,
  openai: /^sk-[a-zA-Z0-9]{48}$/,
  anthropic: /^sk-ant-[a-zA-Z0-9_-]{95,}$/,
};

const PROVIDER_NAMES: Record<string, string> = {
  groq: 'Groq AI',
  zai: 'Z AI',
  gemini: 'Google Gemini',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
};

// ============================================================================
// ENCRYPTION CLASS
// ============================================================================

/**
 * Pixelbrain Encryption Service
 *
 * Provides secure encryption and decryption utilities using AES-256-GCM.
 * Supports API keys, tokens, and general data encryption.
 */
export class PixelbrainEncryption {
  private encryptionKey: string;

  /**
   * Create a new PixelbrainEncryption instance
   *
   * @param encryptionKey - Encryption key (must be at least 32 characters)
   * @throws Error if encryption key is invalid
   */
  constructor(encryptionKey: string) {
    if (!encryptionKey || encryptionKey.length < 32) {
      throw new Error('Encryption key must be at least 32 characters');
    }

    this.encryptionKey = encryptionKey;

    logger.info('PixelbrainEncryption initialized', {
      keyLength: encryptionKey.length,
      algorithm: ENCRYPTION_ALGORITHM,
    });
  }

  // ========================================================================
  // API KEY MANAGEMENT
  // ========================================================================

  /**
   * Encrypt an API key
   *
   * @param apiKey - API key to encrypt
   * @returns Encrypted API key
   * @throws Error if encryption fails
   */
  async encryptApiKey(apiKey: string): Promise<EncryptedApiKey> {
    try {
      if (!apiKey || apiKey.length < 16) {
        throw new Error('API key must be at least 16 characters');
      }

      // Validate API key format before encryption
      const validation = this.validateApiKey(apiKey);
      if (!validation.valid) {
        logger.warn('Encrypting potentially invalid API key', {
          errors: validation.errors,
        });
      }

      // Generate salt and IV
      const salt = this.generateSalt();
      const iv = this.generateIV();

      // Derive encryption key from password and salt
      const key = await this.deriveKey(this.encryptionKey, salt);

      // Encrypt API key
      const encryptedBuffer = await this.encrypt(apiKey, key, iv);

      // Create hash for verification
      const keyHash = await this.hash(apiKey);

      const encryptedApiKey: EncryptedApiKey = {
        encryptedKey: this.bufferToBase64(encryptedBuffer),
        iv: this.bufferToBase64(iv),
        salt: this.bufferToBase64(salt),
        version: ENCRYPTION_VERSION,
        timestamp: new Date().toISOString(),
        keyHash,
      };

      logger.debug('API key encrypted successfully');

      return encryptedApiKey;
    } catch (error) {
      logger.error('Failed to encrypt API key', { error });
      throw new Error(`Failed to encrypt API key: ${(error as Error).message}`);
    }
  }

  /**
   * Decrypt an encrypted API key
   *
   * @param encryptedApiKey - Encrypted API key structure
   * @returns Decrypted API key
   * @throws Error if decryption fails
   */
  async decryptApiKey(encryptedApiKey: EncryptedApiKey): Promise<string> {
    try {
      // Validate encrypted structure
      this.validateEncryptedStructure(encryptedApiKey);

      // Decode base64 strings to buffers
      const salt = this.base64ToBuffer(encryptedApiKey.salt);
      const iv = this.base64ToBuffer(encryptedApiKey.iv);
      const encryptedBuffer = this.base64ToBuffer(encryptedApiKey.encryptedKey);

      // Derive encryption key
      const key = await this.deriveKey(this.encryptionKey, salt);

      // Decrypt API key
      const decryptedApiKey = await this.decrypt(encryptedBuffer, key, iv);

      // Verify hash
      const keyHash = await this.hash(decryptedApiKey);
      if (keyHash !== encryptedApiKey.keyHash) {
        throw new Error('Decrypted key hash does not match stored hash');
      }

      logger.debug('API key decrypted successfully');

      return decryptedApiKey;
    } catch (error) {
      logger.error('Failed to decrypt API key', { error });
      throw new Error(`Failed to decrypt API key: ${(error as Error).message}`);
    }
  }

  /**
   * Validate an API key format
   *
   * @param apiKey - API key to validate
   * @returns Validation result
   */
  validateApiKey(apiKey: string): ApiKeyValidationResult {
    const errors: string[] = [];

    // Basic validation
    if (!apiKey || apiKey.length < 16) {
      errors.push('API key must be at least 16 characters');
    }

    // Check against known provider patterns
    for (const [provider, pattern] of Object.entries(PROVIDER_PATTERNS)) {
      if (pattern.test(apiKey)) {
        return {
          valid: true,
          provider,
          format: PROVIDER_NAMES[provider],
        };
      }
    }

    // If no pattern matched, but basic validation passed
    if (errors.length === 0) {
      return {
        valid: true,
        format: 'Custom/Unknown',
      };
    }

    return {
      valid: false,
      errors,
    };
  }

  // ========================================================================
  // TOKEN MANAGEMENT
  // ========================================================================

  /**
   * Encrypt a token (JWT, refresh token, etc.)
   *
   * @param token - Token to encrypt
   * @returns Encrypted token structure
   * @throws Error if encryption fails
   */
  async encryptToken(token: string): Promise<EncryptedToken> {
    try {
      if (!token || token.length < 32) {
        throw new Error('Token must be at least 32 characters');
      }

      // Generate salt and IV
      const salt = this.generateSalt();
      const iv = this.generateIV();

      // Derive encryption key
      const key = await this.deriveKey(this.encryptionKey, salt);

      // Encrypt token
      const encryptedBuffer = await this.encrypt(token, key, iv);

      // Create hash for verification
      const tokenHash = await this.hash(token);

      const encryptedToken: EncryptedToken = {
        encryptedToken: this.bufferToBase64(encryptedBuffer),
        iv: this.bufferToBase64(iv),
        salt: this.bufferToBase64(salt),
        version: ENCRYPTION_VERSION,
        timestamp: new Date().toISOString(),
        tokenHash,
      };

      logger.debug('Token encrypted successfully');

      return encryptedToken;
    } catch (error) {
      logger.error('Failed to encrypt token', { error });
      throw new Error(`Failed to encrypt token: ${(error as Error).message}`);
    }
  }

  /**
   * Decrypt an encrypted token
   *
   * @param encryptedToken - Encrypted token structure
   * @returns Decrypted token
   * @throws Error if decryption fails
   */
  async decryptToken(encryptedToken: EncryptedToken): Promise<string> {
    try {
      // Validate encrypted structure
      this.validateEncryptedStructure(encryptedToken);

      // Decode base64 strings to buffers
      const salt = this.base64ToBuffer(encryptedToken.salt);
      const iv = this.base64ToBuffer(encryptedToken.iv);
      const encryptedBuffer = this.base64ToBuffer(encryptedToken.encryptedToken);

      // Derive encryption key
      const key = await this.deriveKey(this.encryptionKey, salt);

      // Decrypt token
      const decryptedToken = await this.decrypt(encryptedBuffer, key, iv);

      // Verify hash
      const tokenHash = await this.hash(decryptedToken);
      if (tokenHash !== encryptedToken.tokenHash) {
        throw new Error('Decrypted token hash does not match stored hash');
      }

      logger.debug('Token decrypted successfully');

      return decryptedToken;
    } catch (error) {
      logger.error('Failed to decrypt token', { error });
      throw new Error(`Failed to decrypt token: ${(error as Error).message}`);
    }
  }

  // ========================================================================
  // DATA ENCRYPTION
  // ========================================================================

  /**
   * Encrypt generic data (JSON, string, etc.)
   *
   * @param data - Data to encrypt (will be JSON stringified if object)
   * @returns Encrypted data structure
   * @throws Error if encryption fails
   */
  async encryptData(data: any, metadata?: Record<string, any>): Promise<EncryptedData> {
    try {
      // Convert data to string if it's an object
      const dataString = typeof data === 'string' ? data : JSON.stringify(data);

      if (!dataString || dataString.length === 0) {
        throw new Error('Data cannot be empty');
      }

      // Generate salt and IV
      const salt = this.generateSalt();
      const iv = this.generateIV();

      // Derive encryption key
      const key = await this.deriveKey(this.encryptionKey, salt);

      // Encrypt data
      const encryptedBuffer = await this.encrypt(dataString, key, iv);

      // Create hash for verification
      const dataHash = await this.hash(dataString);

      const encryptedData: EncryptedData = {
        encryptedData: this.bufferToBase64(encryptedBuffer),
        iv: this.bufferToBase64(iv),
        salt: this.bufferToBase64(salt),
        version: ENCRYPTION_VERSION,
        timestamp: new Date().toISOString(),
        dataHash,
        metadata,
      };

      logger.debug('Data encrypted successfully', {
        dataSize: dataString.length,
        hasMetadata: !!metadata,
      });

      return encryptedData;
    } catch (error) {
      logger.error('Failed to encrypt data', { error });
      throw new Error(`Failed to encrypt data: ${(error as Error).message}`);
    }
  }

  /**
   * Decrypt encrypted data
   *
   * @param encryptedData - Encrypted data structure
   * @param parseJson - Whether to parse result as JSON (default: true)
   * @returns Decrypted data
   * @throws Error if decryption fails
   */
  async decryptData(
    encryptedData: EncryptedData,
    parseJson: boolean = true
  ): Promise<any> {
    try {
      // Validate encrypted structure
      this.validateEncryptedStructure(encryptedData);

      // Decode base64 strings to buffers
      const salt = this.base64ToBuffer(encryptedData.salt);
      const iv = this.base64ToBuffer(encryptedData.iv);
      const encryptedBuffer = this.base64ToBuffer(encryptedData.encryptedData);

      // Derive encryption key
      const key = await this.deriveKey(this.encryptionKey, salt);

      // Decrypt data
      const decryptedString = await this.decrypt(encryptedBuffer, key, iv);

      // Verify hash
      const dataHash = await this.hash(decryptedString);
      if (dataHash !== encryptedData.dataHash) {
        throw new Error('Decrypted data hash does not match stored hash');
      }

      // Parse JSON if requested
      let decryptedData: any;
      if (parseJson) {
        try {
          decryptedData = JSON.parse(decryptedString);
        } catch {
          decryptedData = decryptedString;
        }
      } else {
        decryptedData = decryptedString;
      }

      logger.debug('Data decrypted successfully', {
        dataSize: decryptedString.length,
        metadata: encryptedData.metadata,
      });

      return decryptedData;
    } catch (error) {
      logger.error('Failed to decrypt data', { error });
      throw new Error(`Failed to decrypt data: ${(error as Error).message}`);
    }
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  /**
   * Generate a random salt
   *
   * @returns Random salt buffer
   * @private
   */
  private generateSalt(): Uint8Array<ArrayBuffer> {
    return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  }

  /**
   * Generate a random IV
   *
   * @returns Random IV buffer
   * @private
   */
  private generateIV(): Uint8Array<ArrayBuffer> {
    return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  }

  /**
   * Derive encryption key from password and salt
   *
   * @param password - Password string
   * @param salt - Salt buffer
   * @returns Derived key
   * @private
   */
  private async deriveKey(password: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt data using AES-GCM
   *
   * @param data - Data to encrypt
   * @param key - Encryption key
   * @param iv - Initialization vector
   * @returns Encrypted buffer
   * @private
   */
  private async encrypt(
    data: string,
    key: CryptoKey,
    iv: Uint8Array<ArrayBuffer>
  ): Promise<Uint8Array<ArrayBuffer>> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: ENCRYPTION_ALGORITHM,
        iv: iv,
      },
      key,
      dataBuffer
    );

    return new Uint8Array(encryptedBuffer);
  }

  /**
   * Decrypt data using AES-GCM
   *
   * @param encryptedBuffer - Encrypted data buffer
   * @param key - Decryption key
   * @param iv - Initialization vector
   * @returns Decrypted string
   * @private
   */
  private async decrypt(
    encryptedBuffer: Uint8Array<ArrayBuffer>,
    key: CryptoKey,
    iv: Uint8Array<ArrayBuffer>
  ): Promise<string> {
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: ENCRYPTION_ALGORITHM,
        iv: iv,
      },
      key,
      encryptedBuffer
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  }

  /**
   * Convert buffer to base64 string
   *
   * @param buffer - Buffer to convert
   * @returns Base64 string
   * @private
   */
  private bufferToBase64(buffer: Uint8Array<ArrayBuffer>): string {
    const binaryString = Array.from(buffer, (byte) => String.fromCharCode(byte)).join('');
    return btoa(binaryString);
  }

  /**
   * Convert base64 string to buffer
   *
   * @param base64 - Base64 string
   * @returns Buffer
   * @private
   */
  private base64ToBuffer(base64: string): Uint8Array<ArrayBuffer> {
    const binaryString = atob(base64);
    return new Uint8Array(Array.from(binaryString, (char) => char.charCodeAt(0))) as Uint8Array<ArrayBuffer>;
  }

  /**
   * Hash data using SHA-256
   *
   * @param data - Data to hash
   * @returns Hash as hex string
   * @private
   */
  private async hash(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);

    return Array.from(new Uint8Array(hashBuffer))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Validate encrypted structure
   *
   * @param encrypted - Encrypted structure to validate
   * @throws Error if structure is invalid
   * @private
   */
  private validateEncryptedStructure(
    encrypted: EncryptedApiKey | EncryptedToken | EncryptedData
  ): void {
    if (!encrypted.version) {
      throw new Error('Missing version in encrypted structure');
    }

    if (!encrypted.timestamp) {
      throw new Error('Missing timestamp in encrypted structure');
    }

    if (!encrypted.iv || encrypted.iv.length === 0) {
      throw new Error('Missing or invalid IV in encrypted structure');
    }

    if (!encrypted.salt || encrypted.salt.length === 0) {
      throw new Error('Missing or invalid salt in encrypted structure');
    }

    // Check version compatibility
    const [major, minor] = encrypted.version.split('.').map(Number);
    const [currentMajor, currentMinor] = ENCRYPTION_VERSION.split('.').map(Number);

    if (major > currentMajor || (major === currentMajor && minor > currentMinor)) {
      throw new Error(
        `Encrypted data version ${encrypted.version} is not supported (current: ${ENCRYPTION_VERSION})`
      );
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

// ============================================================================
// EXPORTS
// ============================================================================

export {
  ENCRYPTION_VERSION,
  ENCRYPTION_ALGORITHM,
  PROVIDER_PATTERNS,
  PROVIDER_NAMES,
};

