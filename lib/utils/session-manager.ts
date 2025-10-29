// lib/utils/session-manager.ts
import { v4 as uuidv4 } from 'uuid';
import { kvGet, kvSet, kvDel } from '@/data-store/kv';

export interface SessionData {
  id: string;
  userId: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'tool';
    content: string;
    timestamp: Date;
    toolCalls?: any[];
    toolResults?: any[];
  }>;
  context: {
    user: string;
    project: string;
    preferences: any;
  };
  createdAt: Date;
  lastAccessedAt: Date;
  expiresAt: Date;
}

const SESSION_PREFIX = 'asi_session:';
const SESSION_TTL = 24 * 60 * 60; // 24 hours in seconds

export class SessionManager {
  /**
   * Generate a new session ID
   */
  static generateSessionId(): string {
    return uuidv4();
  }

  /**
   * Create a new session
   */
  static async createSession(userId: string = 'akiles', project: string = 'THEGAME'): Promise<SessionData> {
    const sessionId = this.generateSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL * 1000);

    const session: SessionData = {
      id: sessionId,
      userId,
      messages: [],
      context: {
        user: userId,
        project,
        preferences: {
          ai_assistant: 'Pixel (ASI:One)',
          communication_style: 'Direct and technical'
        }
      },
      createdAt: now,
      lastAccessedAt: now,
      expiresAt
    };

    await this.saveSession(session);
    return session;
  }

  /**
   * Get an existing session by ID
   */
  static async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      const key = `${SESSION_PREFIX}${sessionId}`;
      const session = await kvGet<SessionData>(key);
      
      if (!session) {
        return null;
      }

      // Check if session has expired
      if (new Date() > session.expiresAt) {
        await this.deleteSession(sessionId);
        return null;
      }

      // Update last accessed time
      session.lastAccessedAt = new Date();
      await this.saveSession(session);

      return session;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  /**
   * Save session data to KV store
   */
  static async saveSession(session: SessionData): Promise<void> {
    try {
      const key = `${SESSION_PREFIX}${session.id}`;
      await kvSet(key, session);
    } catch (error) {
      console.error('Error saving session:', error);
      throw error;
    }
  }

  /**
   * Add a message to the session
   */
  static async addMessage(
    sessionId: string, 
    role: 'user' | 'assistant' | 'tool', 
    content: string,
    toolCalls?: any[],
    toolResults?: any[]
  ): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.messages.push({
      role,
      content,
      timestamp: new Date(),
      toolCalls,
      toolResults
    });

    // Keep only last 50 messages to prevent session bloat
    if (session.messages.length > 50) {
      session.messages = session.messages.slice(-50);
    }

    await this.saveSession(session);
  }

  /**
   * Get session messages formatted for ASI:One API
   */
  static async getSessionMessages(sessionId: string): Promise<any[]> {
    const session = await this.getSession(sessionId);
    if (!session) {
      return [];
    }

    return session.messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      tool_calls: msg.toolCalls,
      tool_call_id: msg.toolResults ? msg.toolResults[0]?.id : undefined
    }));
  }

  /**
   * Update session context
   */
  static async updateSessionContext(sessionId: string, context: Partial<SessionData['context']>): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.context = { ...session.context, ...context };
    await this.saveSession(session);
  }

  /**
   * Delete a session
   */
  static async deleteSession(sessionId: string): Promise<void> {
    try {
      const key = `${SESSION_PREFIX}${sessionId}`;
      await kvDel(key);
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  }

  /**
   * Clean up expired sessions (utility method)
   */
  static async cleanupExpiredSessions(): Promise<void> {
    // This would require scanning all session keys
    // For now, sessions auto-expire when accessed
    // In production, you might want to implement a background job
  }

  /**
   * Get or create session for user
   */
  static async getOrCreateSession(sessionId?: string, userId: string = 'akiles'): Promise<SessionData> {
    if (sessionId) {
      const existingSession = await this.getSession(sessionId);
      if (existingSession) {
        return existingSession;
      }
    }

    // Create new session if none exists or provided ID is invalid
    return await this.createSession(userId);
  }

  /**
   * Check if session is valid
   */
  static async isValidSession(sessionId: string): Promise<boolean> {
    const session = await this.getSession(sessionId);
    return session !== null;
  }

  /**
   * Get session statistics
   */
  static async getSessionStats(sessionId: string): Promise<any> {
    const session = await this.getSession(sessionId);
    if (!session) {
      return null;
    }

    return {
      id: session.id,
      userId: session.userId,
      messageCount: session.messages.length,
      createdAt: session.createdAt,
      lastAccessedAt: session.lastAccessedAt,
      expiresAt: session.expiresAt,
      isExpired: new Date() > session.expiresAt
    };
  }
}

// Helper function to get session ID from request headers
export function getSessionIdFromHeaders(headers: Headers): string | null {
  return headers.get('x-session-id');
}

// Helper function to create session-aware headers
export function createSessionHeaders(sessionId: string): Record<string, string> {
  return {
    'x-session-id': sessionId
  };
}
