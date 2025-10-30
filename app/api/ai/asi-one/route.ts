import { NextRequest } from 'next/server';
import { ASI_ONE_TOOLS, executeTool } from './tools';
import { SessionManager, getSessionIdFromHeaders, createSessionHeaders } from '@/lib/utils/session-manager';
import { kvGet, kvSet } from '@/data-store/kv';

// Remove hidden chain-of-thought from responses
function stripThink(content: string | undefined): string {
  if (!content) return '';
  return content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

export async function POST(request: NextRequest, parsedData?: any) {
  try {
    const requestData = parsedData || await request.json();
    const { message, model = 'asi1-mini', tools = true, sessionId } = requestData;
    
    // Log request for debugging
    console.log('[ASI:One] Request received:', {
      model,
      hasMessage: !!message,
      messageLength: message?.length,
      toolsEnabled: tools,
      hasSessionId: !!sessionId
    });
    
    // Get API key from environment
    const apiKey = process.env.ASI_ONE_API_KEY;
    
    if (!apiKey) {
      return Response.json(
        { error: 'ASI_ONE_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Handle session management for agentic models (persist across requests even if client forgets to send)
    let currentSessionId = sessionId || getSessionIdFromHeaders(request.headers);
    const activeSessionKey = 'asi_active_session:akiles';
    if (!currentSessionId) {
      const savedSessionId = await kvGet<string>(activeSessionKey);
      if (savedSessionId) {
        currentSessionId = savedSessionId;
      }
    }
    let sessionMessages: any[] = [];
    
    if (currentSessionId) {
      const session = await SessionManager.getSession(currentSessionId);
      if (session) {
        sessionMessages = await SessionManager.getSessionMessages(currentSessionId);
      }
    }

    // Attach identity metadata (email + agent address + handle) for binding on ASI side
    const userEmail = process.env.ASI_USER_EMAIL || '';
    const agentAddress = process.env.ASI_AGENT_ADDRESS || '';
    const handle = process.env.ASI_HANDLE || 'pixelbrain'; // Default to pixelbrain if not set
    
    // Check if this is an agentic model
    const isAgenticModel = model.includes('agentic') || model.includes('extended');
    
    // Prepare messages array
    // For agentic models: add system message identifying Pixel and agent address
    // This forces ASI:One to load the specific agent context
    // For regular models: no system message needed - tools are available if needed
    const messages = isAgenticModel && agentAddress
      ? [
          {
            role: 'system',
            content: `You are Pixel, Akiles' agent. Active agent: ${agentAddress}`
          },
          ...sessionMessages,
          { role: 'user', content: message }
        ]
      : [
          ...sessionMessages,
          { role: 'user', content: message }
        ];

    // Prepare request body
    const requestBody: any = {
      model: model || 'asi1-mini',
      messages,
      temperature: 0.7,
    };
    requestBody.metadata = {
      user_email: userEmail,
      agent_address: agentAddress,
      handle: handle
    };

    // Always attach tools when requested; provider should ignore if unsupported
    if (tools) {
      requestBody.tools = ASI_ONE_TOOLS;
    }

    // Prepare headers
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'x-user-email': userEmail,
      'x-agent-address': agentAddress,
      'x-handle': handle,
    };

    // Ensure session ID for agentic models on first request
    if (model.includes('agentic') || model.includes('extended')) {
      if (!currentSessionId) {
        const session = await SessionManager.createSession('akiles', 'THEGAME');
        currentSessionId = session.id;
        // Persist the active session so subsequent requests can reuse it
        await kvSet(activeSessionKey, currentSessionId);
      }
      headers['x-session-id'] = currentSessionId;
    }

    // Log request details for debugging
    console.log('[ASI:One] Sending request:', {
      model: requestBody.model,
      messageCount: requestBody.messages.length,
      hasMetadata: !!requestBody.metadata,
      metadata: requestBody.metadata,
      hasTools: !!requestBody.tools,
      sessionId: currentSessionId,
      headers: Object.keys(headers)
    });

    // Use ASI:One API (OpenAI-compatible)
    const response = await fetch('https://api.asi1.ai/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });
    
    console.log('[ASI:One] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ASI:One API error:', errorText);
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
    
    // Log response for debugging
    console.log('[ASI:One] Response received:', {
      model: data.model,
      hasChoices: !!data.choices,
      choicesLength: data.choices?.length,
      firstChoice: data.choices?.[0]
    });
    
    if (!data.choices || data.choices.length === 0) {
      console.error('[ASI:One] No choices in response:', data);
      return Response.json(
        { error: 'No response from AI model. Please try again.' },
        { status: 500 }
      );
    }
    
    const messageContent = data.choices[0].message;
    
    console.log('[ASI:One] Message content:', {
      hasContent: !!messageContent.content,
      contentLength: messageContent.content?.length || 0,
      hasToolCalls: !!messageContent.tool_calls,
      toolCallsCount: messageContent.tool_calls?.length || 0,
      finishReason: data.choices[0].finish_reason
    });

    // Handle tool calls
    if (messageContent.tool_calls && messageContent.tool_calls.length > 0) {
      console.log('[ASI:One] Processing tool calls:', messageContent.tool_calls.length);
      
      // Create or get session for tool calls
      if (!currentSessionId) {
        const session = await SessionManager.createSession('akiles', 'THEGAME');
        currentSessionId = session.id;
        await kvSet(activeSessionKey, currentSessionId);
      }

      // Add assistant message with tool calls to session
      await SessionManager.addMessage(
        currentSessionId,
        'assistant',
        messageContent.content || '',
        messageContent.tool_calls
      );

      // Execute tool calls
      const toolResults: any[] = [];
      for (const toolCall of messageContent.tool_calls) {
        console.log('[ASI:One] Executing tool:', toolCall.function.name);
        try {
          const args = JSON.parse(toolCall.function.arguments);
          const result = await executeTool(toolCall.function.name, args);
          console.log('[ASI:One] Tool result:', toolCall.function.name, 'success');
          
          toolResults.push({
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
            content: JSON.stringify(result)
          });

          // Add tool result to session
          await SessionManager.addMessage(
            currentSessionId,
            'tool',
            JSON.stringify(result),
            undefined,
            [{ id: toolCall.id, result }]
          );
        } catch (error) {
          console.error(`Tool execution error for ${toolCall.function.name}:`, error);
          toolResults.push({
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
            content: JSON.stringify({ error: `Tool execution failed: ${error}` })
          });
        }
      }

      console.log('[ASI:One] Tool execution complete. Results:', toolResults.length);
      
      // Send tool results back to ASI:One
      const toolMessages = [
        ...messages,
        messageContent,
        ...toolResults.map(result => ({
          role: 'tool',
          content: result.content,
          tool_call_id: result.tool_call_id
        }))
      ];
      
      console.log('[ASI:One] Sending tool results back to ASI:One. Total messages:', toolMessages.length);

      // Prepare headers for final response (include identity headers and session)
      const finalHeaders: Record<string, string> = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'x-user-email': userEmail,
        'x-agent-address': agentAddress,
        'x-handle': handle,
        ...createSessionHeaders(currentSessionId)
      };

      // Ensure session ID for agentic models
      if (isAgenticModel && currentSessionId) {
        finalHeaders['x-session-id'] = currentSessionId;
      }

      // Prepare final request body with metadata
      const finalRequestBody: any = {
        model: model || 'asi1-mini',
        messages: toolMessages,
        temperature: 0.7,
        metadata: {
          user_email: userEmail,
          agent_address: agentAddress,
          handle: handle
        }
      };

      // Add tools to final request if enabled
      if (tools) {
        finalRequestBody.tools = ASI_ONE_TOOLS;
      }

      console.log('[ASI:One] Final request body:', {
        model: finalRequestBody.model,
        messageCount: finalRequestBody.messages.length,
        hasMetadata: !!finalRequestBody.metadata
      });
      
      const finalResponse = await fetch('https://api.asi1.ai/v1/chat/completions', {
        method: 'POST',
        headers: finalHeaders,
        body: JSON.stringify(finalRequestBody),
      });
      
      console.log('[ASI:One] Final response status:', finalResponse.status, finalResponse.statusText);

      if (!finalResponse.ok) {
        const errorText = await finalResponse.text();
        console.error('ASI:One API error (final response):', errorText);
        let errorMessage = 'Failed to get final response from ASI:One';
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error?.message || errorText;
        } catch {
          errorMessage = errorText || 'Failed to get final response from ASI:One';
        }
        
        throw new Error(errorMessage);
      }

      const finalData = await finalResponse.json();
      // Log final data for diagnostics
      console.log('[ASI:One] Final data received:', {
        model: finalData.model,
        hasChoices: !!finalData.choices,
        choicesLength: finalData.choices?.length,
        firstChoice: finalData.choices?.[0]
      });

      const finalMessage = finalData.choices?.[0]?.message || {};
      let finalContent: string = finalMessage.content || '';

      // Fallback: if model returned empty content, synthesize a short reply from tool results
      if (!finalContent || (typeof finalContent === 'string' && finalContent.trim() === '')) {
        try {
          const summarized = (toolResults || [])
            .map(r => {
              const body = (() => { try { return JSON.parse(r.content); } catch { return r.content; } })();
              const text = typeof body === 'string' ? body : JSON.stringify(body);
              return `${r.name}: ${text}`;
            })
            .join(' | ');
          finalContent = summarized || 'Completed tool execution with no additional content.';
          console.warn('[ASI:One] Final assistant content was empty. Using synthesized summary.');
        } catch (e) {
          finalContent = 'Completed tool execution.';
        }
      }

      // Add final response to session
      await SessionManager.addMessage(currentSessionId, 'assistant', stripThink(finalContent));

      return Response.json({ 
        response: stripThink(finalContent),
        model: data.model,
        sessionId: currentSessionId,
        toolCalls: messageContent.tool_calls,
        toolResults: toolResults
      });
    }

    // Regular response without tool calls
    const responseContent = stripThink(messageContent.content);
    
    if (!responseContent || (typeof responseContent === 'string' && responseContent.trim() === '')) {
      console.error('[ASI:One] Empty response content:', messageContent);
      return Response.json(
        { error: 'AI model returned empty response. Please try again.' },
        { status: 500 }
      );
    }
    
    if (currentSessionId) {
      await SessionManager.addMessage(currentSessionId, 'assistant', responseContent || '');
    }

    return Response.json({ 
      response: responseContent,
      model: data.model,
      sessionId: currentSessionId
    });
  } catch (error) {
    console.error('ASI:One API error:', error);
    return Response.json(
      { error: 'Failed to process AI request' },
      { status: 500 }
    );
  }
}

