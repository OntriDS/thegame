import { useState } from 'react';
import { ClientAPI } from '@/lib/client-api';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolCalls?: any[];
  toolResults?: any[];
}

export interface RateLimitInfo {
  remainingRequests: string | null;
  limitRequests: string | null;
  remainingTokens: string | null;
  limitTokens: string | null;
}

export interface ToolExecutionState {
  isExecuting: boolean;
  currentTool: string | null;
  toolCalls: any[];
  toolResults: any[];
}

export function useAIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('openai/gpt-oss-120b');
  const [selectedProvider, setSelectedProvider] = useState<string>('groq');
  const [rateLimits, setRateLimits] = useState<RateLimitInfo | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [toolExecution, setToolExecution] = useState<ToolExecutionState>({
    isExecuting: false,
    currentTool: null,
    toolCalls: [],
    toolResults: []
  });

  const sendMessage = async (message: string, model?: string) => {
    if (!message.trim()) return;

    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    // Reset tool execution state
    setToolExecution({
      isExecuting: false,
      currentTool: null,
      toolCalls: [],
      toolResults: []
    });

    try {
      // Determine provider based on model
      const modelToUse = model || selectedModel;

      const data = await ClientAPI.sendChatMessage(message, modelToUse, sessionId || undefined);
      
      // Store rate limit info if available
      if (data.rateLimits) {
        setRateLimits(data.rateLimits);
      }

      // Store session ID if provided
      if (data.sessionId) {
        setSessionId(data.sessionId);
      }

      // Handle tool calls if present
      if (data.toolCalls && data.toolCalls.length > 0) {
        setToolExecution({
          isExecuting: true,
          currentTool: data.toolCalls[0]?.function?.name || null,
          toolCalls: data.toolCalls,
          toolResults: data.toolResults || []
        });
      }

      // Add assistant message
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        toolCalls: data.toolCalls,
        toolResults: data.toolResults
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Clear tool execution state after response
      setTimeout(() => {
        setToolExecution({
          isExecuting: false,
          currentTool: null,
          toolCalls: [],
          toolResults: []
        });
      }, 1000);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('AI chat error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const clearMessages = () => {
    setMessages([]);
    setError(null);
    setSessionId(null);
    setToolExecution({
      isExecuting: false,
      currentTool: null,
      toolCalls: [],
      toolResults: []
    });
  };

  const clearSession = () => {
    setSessionId(null);
    setMessages([]);
    setError(null);
    setToolExecution({
      isExecuting: false,
      currentTool: null,
      toolCalls: [],
      toolResults: []
    });
  };

  const loadSession = async (id: string) => {
    setSessionId(id);
    setError(null);
    
    // Load session messages from the session
    try {
      const { ClientAPI } = await import('@/lib/client-api');
      const sessionData = await ClientAPI.getSessionById(id);
      if (sessionData) {
        // Set the model from the session
        if (sessionData.model) {
          setSelectedModel(sessionData.model);
        }
        
        // Convert session messages to ChatMessage format
        const loadedMessages: ChatMessage[] = sessionData.messages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          toolCalls: msg.toolCalls,
          toolResults: msg.toolResults
        }));
        setMessages(loadedMessages);
      }
    } catch (error) {
      console.error('Error loading session:', error);
      setMessages([]);
    }
  };

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    clearSession,
    loadSession,
    selectedModel,
    setSelectedModel,
    selectedProvider,
    setSelectedProvider,
    rateLimits,
    sessionId,
    toolExecution,
  };
}

