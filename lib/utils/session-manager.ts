// lib/utils/session-manager.ts
import { v4 as uuidv4 } from 'uuid';
import type { AISession } from '@/types/entities';
import { getSessionById, getAllSessions, upsertSession, deleteSession as repoDeleteSession } from '@/data-store/repositories/session.repo';

const MAX_SESSIONS = 20; // Maximum number of sessions allowed

// Legacy SessionData interface for backward compatibility
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
  static async createSession(userId: string = 'akiles', project: string = 'THEGAME', model: string = 'openai/gpt-oss-120b'): Promise<AISession> {
    // Check if we've reached the maximum number of sessions
    const existingSessions = await getAllSessions();
    if (existingSessions.length >= MAX_SESSIONS) {
      throw new Error(`Maximum of ${MAX_SESSIONS} sessions reached. Please delete some sessions before creating new ones.`);
    }

    const sessionId = this.generateSessionId();
    const now = new Date();

    // Generate default name based on timestamp
    const defaultName = `Session ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;

    const session: AISession = {
      id: sessionId,
      name: defaultName,
      description: '',
      links: [],
      userId,
      model,
      messageCount: 0,
      messages: [],
      context: {
        user: userId,
        project,
        preferences: {
          ai_assistant: 'Groq',
          communication_style: 'Direct and technical'
        }
      },
      createdAt: now,
      updatedAt: now,
      lastAccessedAt: now,
      expiresAt: new Date('2099-12-31') // Far future date to effectively disable TTL
    };

    await upsertSession(session);
    return session;
  }

  /**
   * Get an existing session by ID
   */
  static async getSession(sessionId: string): Promise<AISession | null> {
    try {
      const session = await getSessionById(sessionId);

      if (!session) {
        return null;
      }

      // Update last accessed time
      session.lastAccessedAt = new Date();
      session.updatedAt = new Date();
      await upsertSession(session);

      return session;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  /**
   * Save session data to KV store
   */
  static async saveSession(session: AISession): Promise<void> {
    try {
      session.updatedAt = new Date();
      await upsertSession(session);
    } catch (error) {
      console.error('Error saving session:', error);
      throw error;
    }
  }

  /**
   * Update session model
   */
  static async updateSessionModel(sessionId: string, model: string): Promise<AISession> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    session.model = model;
    session.updatedAt = new Date();
    await upsertSession(session);
    return session;
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

    // Update message count
    session.messageCount = session.messages.length;

    await this.saveSession(session);
  }

  /**
   * Get session messages formatted for Groq API
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
  static async updateSessionContext(sessionId: string, context: Partial<AISession['context']>): Promise<void> {
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
      await repoDeleteSession(sessionId);
    } catch (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  }

  /**
   * Export a session to JSON
   */
  static async exportSession(sessionId: string): Promise<string> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      session: {
        ...session,
        // Convert dates to ISO strings for JSON serialization
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
        lastAccessedAt: session.lastAccessedAt.toISOString(),
        expiresAt: session.expiresAt.toISOString()
      }
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import a session from JSON
   */
  static async importSession(jsonData: string): Promise<AISession> {
    try {
      const importData = JSON.parse(jsonData);

      if (!importData.session || importData.version !== '1.0') {
        throw new Error('Invalid session export format');
      }

      const sessionData = importData.session;

      // Check session limit before importing
      const existingSessions = await getAllSessions();
      if (existingSessions.length >= MAX_SESSIONS) {
        throw new Error(`Maximum of ${MAX_SESSIONS} sessions reached. Please delete some sessions before importing.`);
      }

      // Create session object with proper date conversion and new ID
      const session: AISession = {
        id: this.generateSessionId(),
        name: sessionData.name,
        description: sessionData.description,
        links: sessionData.links,
        userId: sessionData.userId,
        model: sessionData.model,
        messageCount: sessionData.messageCount,
        messages: sessionData.messages,
        context: sessionData.context,
        createdAt: new Date(sessionData.createdAt),
        updatedAt: new Date(), // Fresh timestamp for import
        lastAccessedAt: new Date(), // Fresh timestamp for import
        expiresAt: new Date(sessionData.expiresAt)
      };

      await upsertSession(session);
      return session;
    } catch (error) {
      console.error('Error importing session:', error);
      throw new Error('Failed to import session: ' + (error instanceof Error ? error.message : 'Unknown error'));
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
  static async getOrCreateSession(sessionId?: string, userId: string = 'akiles', model: string = 'openai/gpt-oss-120b'): Promise<AISession> {
    if (sessionId) {
      const existingSession = await this.getSession(sessionId);
      if (existingSession) {
        return existingSession;
      }
    }

    // Create new session if none exists or provided ID is invalid
    return await this.createSession(userId, 'THEGAME', model);
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
      name: session.name,
      userId: session.userId,
      model: session.model,
      messageCount: session.messageCount,
      createdAt: session.createdAt,
      lastAccessedAt: session.lastAccessedAt,
      expiresAt: session.expiresAt,
      isExpired: new Date() > session.expiresAt
    };
  }

  /**
   * Get all sessions
   */
  static async getAllSessions(): Promise<AISession[]> {
    return await getAllSessions();
  }

  /**
   * Get recent sessions sorted by lastAccessedAt
   */
  static async getRecentSessions(limit?: number): Promise<AISession[]> {
    const sessions = await this.getAllSessions();
    const sorted = sessions.sort((a, b) => b.lastAccessedAt.getTime() - a.lastAccessedAt.getTime());
    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Update session messages
   */
  static async updateSessionMessages(sessionId: string, messages: any[]): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.messages = messages;
    session.messageCount = messages.length;
    await this.saveSession(session);
  }

  /**
   * Update session name
   */
  static async updateSessionName(sessionId: string, name: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.name = name;
    await this.saveSession(session);
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
