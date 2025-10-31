import { NextRequest } from 'next/server';
import { SessionManager } from '@/lib/utils/session-manager';
import { kvGet, kvSet } from '@/data-store/kv';
import { GROQ_TOOLS, executeTool } from './tools-registry';

export async function POST(request: NextRequest) {
  try {
    const { message, model = 'openai/gpt-oss-120b', sessionId, enableTools = false } = await request.json();
    
    // Get API key from environment
    const apiKey = process.env.GROQ_API_KEY;
    
    if (!apiKey) {
      return Response.json(
        { error: 'GROQ_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Handle session management
    let currentSessionId = sessionId;
    const activeSessionKey = 'active:session:akiles';
    
    // If no session ID provided, try to get active session
    if (!currentSessionId) {
      const savedSessionId = await kvGet<string>(activeSessionKey);
      if (savedSessionId) {
        currentSessionId = savedSessionId;
      }
    }

    // Load session messages if session exists
    let sessionMessages: any[] = [];
    if (currentSessionId) {
      const session = await SessionManager.getSession(currentSessionId);
      if (session) {
        sessionMessages = await SessionManager.getSessionMessages(currentSessionId);
      } else {
        // Session expired or invalid, create new one
        currentSessionId = null;
      }
    }

    // Prepare messages array for Groq API (last 20 messages to stay within token limits)
    const messagesToSend = [
      ...sessionMessages.slice(-20),
      { role: 'user', content: message }
    ];

    // Use Groq API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'openai/gpt-oss-120b',
        messages: messagesToSend,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error:', errorText);
      let errorMessage = 'AI service temporarily unavailable';
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error?.message || errorText;
      } catch {
        errorMessage = errorText || 'Failed to connect to AI service';
      }
      
      return Response.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Extract rate limit info from headers
    const rateLimitInfo = {
      remainingRequests: response.headers.get('x-ratelimit-remaining-requests'),
      limitRequests: response.headers.get('x-ratelimit-limit-requests'),
      remainingTokens: response.headers.get('x-ratelimit-remaining-tokens'),
      limitTokens: response.headers.get('x-ratelimit-limit-tokens'),
    };

    const assistantResponse = data.choices[0].message.content;

    // Save session messages
    if (currentSessionId) {
      await SessionManager.addMessage(currentSessionId, 'user', message);
      await SessionManager.addMessage(currentSessionId, 'assistant', assistantResponse);
    } else {
      // Create new session and save messages
      const session = await SessionManager.createSession('akiles', 'THEGAME', model);
      currentSessionId = session.id;
      await kvSet(activeSessionKey, currentSessionId);
      await SessionManager.addMessage(currentSessionId, 'user', message);
      await SessionManager.addMessage(currentSessionId, 'assistant', assistantResponse);
    }
    
    return Response.json({ 
      response: assistantResponse,
      model: data.model,
      rateLimits: rateLimitInfo,
      sessionId: currentSessionId
    });
  } catch (error) {
    console.error('Groq API error:', error);
    return Response.json(
      { error: 'Failed to process AI request' },
      { status: 500 }
    );
  }
}

