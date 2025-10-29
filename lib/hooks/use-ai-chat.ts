import { useState } from 'react';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface RateLimitInfo {
  remainingRequests: string | null;
  limitRequests: string | null;
  remainingTokens: string | null;
  limitTokens: string | null;
}

export function useAIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('openai/gpt-oss-120b');
  const [selectedProvider, setSelectedProvider] = useState<string>('groq');
  const [rateLimits, setRateLimits] = useState<RateLimitInfo | null>(null);

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

    try {
      // Determine provider based on model
      const modelToUse = model || selectedModel;
      const provider = modelToUse.startsWith('asi1-') ? 'asi-one' : 'groq';

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, model: modelToUse, provider }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      
      // Store rate limit info if available
      if (data.rateLimits) {
        setRateLimits(data.rateLimits);
      }
      
      // Add assistant message
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
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
  };

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    selectedModel,
    setSelectedModel,
    selectedProvider,
    setSelectedProvider,
    rateLimits,
  };
}

