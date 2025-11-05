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
    let modelToUse = model || 'openai/gpt-oss-120b';
    let currentSession: any = null;
    if (currentSessionId) {
      const session = await SessionManager.getSession(currentSessionId);
      if (session) {
        currentSession = session;
        sessionMessages = await SessionManager.getSessionMessages(currentSessionId);
        // Use the session's saved model if available
        if (session.model) {
          modelToUse = session.model;
        }
      } else {
        // Session expired or invalid, create new one
        currentSessionId = null;
      }
    }

    // Get system message from session (if any)
    const systemMessage = SessionManager.getSystemMessage(currentSession);

    // Prepare messages array for Groq API (last 20 messages to stay within token limits)
    const messagesToSend: any[] = [];
    
    // Add system message first if it exists
    if (systemMessage) {
      messagesToSend.push({ role: 'system', content: systemMessage });
    }
    
    // Add conversation history and current message
    messagesToSend.push(
      ...sessionMessages.slice(-20),
      { role: 'user', content: message }
    );

    // Prepare request body with optional tools
    const requestBody: any = {
      model: modelToUse,
      messages: messagesToSend,
      temperature: 0.7,
    };

    // Add tools if enabled (only for OpenAI models on Groq)
    if (enableTools && modelToUse.startsWith('openai/')) {
      requestBody.tools = GROQ_TOOLS;
      requestBody.tool_choice = 'auto';
    }

    // Use Groq API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
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

    let assistantResponse = data.choices[0].message.content;
    let toolCalls = data.choices[0].message.tool_calls;

    // Handle tool calls if present
    if (toolCalls && toolCalls.length > 0) {
      // Add the assistant's message with tool calls to conversation
      const assistantMessage = data.choices[0].message;
      messagesToSend.push(assistantMessage);

      // Execute tools and collect results
      const toolResults = [];
      for (const toolCall of toolCalls) {
        try {
          const result = await executeTool(toolCall.function.name, JSON.parse(toolCall.function.arguments || '{}'));
          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            content: JSON.stringify(result)
          });
        } catch (error) {
          console.error(`Tool execution error for ${toolCall.function.name}:`, error);
          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            content: JSON.stringify({ error: `Failed to execute ${toolCall.function.name}: ${error instanceof Error ? error.message : 'Unknown error'}` })
          });
        }
      }

      // Add tool results to conversation
      messagesToSend.push(...toolResults);

      // Make follow-up request to get final response
      // Ensure system message is included in follow-up request
      const followupMessages: any[] = [];
      if (systemMessage) {
        followupMessages.push({ role: 'system', content: systemMessage });
      }
      followupMessages.push(...messagesToSend.filter(m => m.role !== 'system'));
      
      const followupResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelToUse,
          messages: followupMessages,
          temperature: 0.7,
        }),
      });

      if (followupResponse.ok) {
        const followupData = await followupResponse.json();
        assistantResponse = followupData.choices[0].message.content;

        // Save the followup response to session
        if (currentSessionId) {
          await SessionManager.addMessage(currentSessionId, 'assistant', assistantResponse);
        }
      } else {
        assistantResponse = "I used some tools but encountered an error getting the final response. The tools were executed successfully though.";
      }
    }

    // Save session messages (skip if already saved during tool execution)
    if (currentSessionId) {
      // Only save if we didn't already save during tool execution
      const session = await SessionManager.getSession(currentSessionId);
      if (session) {
        const messageCount = await SessionManager.getSessionMessages(currentSessionId);
        if (messageCount.length === 0) {
          await SessionManager.addMessage(currentSessionId, 'user', message);
          await SessionManager.addMessage(currentSessionId, 'assistant', assistantResponse);
        }
        // If messages already exist, they were saved during tool execution
      }
    } else {
      // Create new session and save messages
      const session = await SessionManager.createSession('akiles', 'THEGAME', modelToUse);
      currentSessionId = session.id;
      await kvSet(activeSessionKey, currentSessionId);
      await SessionManager.addMessage(currentSessionId, 'user', message);
      await SessionManager.addMessage(currentSessionId, 'assistant', assistantResponse);
    }
    
    return Response.json({ 
      response: assistantResponse,
      model: modelToUse, // Return the model that was actually used (session's model)
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

