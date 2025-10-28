'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot, Send, Trash2, Loader2, Settings } from 'lucide-react';
import { useAIChat, ChatMessage } from '@/lib/hooks/use-ai-chat';

interface GroqModel {
  id: string;
  created: number;
  owned_by: string;
}

export function AIAssistantTab() {
  const { messages, isLoading, error, sendMessage, clearMessages, selectedModel, setSelectedModel, rateLimits } = useAIChat();
  const [availableModels, setAvailableModels] = useState<GroqModel[]>([]);
  const [showModelSelect, setShowModelSelect] = useState(false);
  const [input, setInput] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Fetch available models
  useEffect(() => {
    fetch('/api/ai/models')
      .then(res => res.json())
      .then(data => setAvailableModels(data.models || []))
      .catch(err => console.error('Failed to fetch models:', err));
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    sendMessage(input);
    setInput('');
  };

  const quickPrompts = [
    'What is the current project status?',
    'What are the main challenges?',
    'Summarize recent development',
    'What features are coming next?',
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI Assistant
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              Get intelligent insights about your project
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowModelSelect(!showModelSelect)}
                className="gap-1 h-6 text-xs"
                title="Select AI Model"
                >
                <Settings className="h-3 w-3" />
                {selectedModel.replace('llama-', 'Llama ').replace('openai/', '').replace('-', '.')}
              </Button>
            </CardDescription>
          </div>
          {messages.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearMessages}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Rate Limit Display */}
        {rateLimits && (
          <div className="flex gap-4 text-xs text-muted-foreground px-2">
            {rateLimits.remainingRequests && rateLimits.limitRequests && (
              <span>Requests: {rateLimits.remainingRequests}/{rateLimits.limitRequests}</span>
            )}
            {rateLimits.remainingTokens && rateLimits.limitTokens && (
              <span>Tokens: {rateLimits.remainingTokens}/{rateLimits.limitTokens}</span>
            )}
          </div>
        )}

        {/* Model Selector */}
        {showModelSelect && availableModels.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Select AI Model:</label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.id} {model.owned_by && `(${model.owned_by})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Chat Messages */}
        <ScrollArea className="h-[400px] w-full border rounded-lg p-4" ref={scrollAreaRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <Bot className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Welcome to AI Assistant</p>
              <p className="text-sm max-w-md">
                Ask me anything about your project: sprints, features, challenges, or general questions.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, idx) => (
                <div
                  key={idx}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-4 py-2 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Thinking...</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Error Message */}
        {error && (
          <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded p-2">
            {error}
          </div>
        )}

        {/* Quick Prompts */}
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Quick Prompts:</p>
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((prompt, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  onClick={() => sendMessage(prompt)}
                  disabled={isLoading}
                  className="text-xs"
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything about your project..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

