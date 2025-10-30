import { useState } from 'react';

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
      const provider = 'groq'; // Always use Groq now

      const requestBody: any = { 
        message, 
        model: modelToUse, 
        provider 
      };

      // Add session ID for Groq models
      if (sessionId) {
        requestBody.sessionId = sessionId;
      }

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      
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

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    clearSession,
    selectedModel,
    setSelectedModel,
    selectedProvider,
    setSelectedProvider,
    rateLimits,
    sessionId,
    toolExecution,
  };
}

