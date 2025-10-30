import { NextRequest } from 'next/server';
import { ASI_ONE_TOOLS, executeTool } from './tools';
import { SessionManager, getSessionIdFromHeaders, createSessionHeaders } from '@/lib/utils/session-manager';

export async function POST(request: NextRequest, parsedData?: any) {
  try {
    const { message, model = 'asi1-mini', tools = true, sessionId } = parsedData || await request.json();
    
    // Get API key from environment
    const apiKey = process.env.ASI_ONE_API_KEY;
    
    if (!apiKey) {
      return Response.json(
        { error: 'ASI_ONE_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Handle session management for agentic models
    let currentSessionId = sessionId || getSessionIdFromHeaders(request.headers);
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
      }
      headers['x-session-id'] = currentSessionId;
    }

    // Use ASI:One API (OpenAI-compatible)
    const response = await fetch('https://api.asi1.ai/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

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
    const messageContent = data.choices[0].message;

    // Handle tool calls
    if (messageContent.tool_calls && messageContent.tool_calls.length > 0) {
      // Create or get session for tool calls
      if (!currentSessionId) {
        const session = await SessionManager.createSession('akiles', 'THEGAME');
        currentSessionId = session.id;
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
        try {
          const args = JSON.parse(toolCall.function.arguments);
          const result = await executeTool(toolCall.function.name, args);
          
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

      const finalResponse = await fetch('https://api.asi1.ai/v1/chat/completions', {
        method: 'POST',
        headers: finalHeaders,
        body: JSON.stringify(finalRequestBody),
      });

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
      const finalContent = finalData.choices[0].message.content;

      // Add final response to session
      await SessionManager.addMessage(currentSessionId, 'assistant', finalContent);

      return Response.json({ 
        response: finalContent,
        model: data.model,
        sessionId: currentSessionId,
        toolCalls: messageContent.tool_calls,
        toolResults: toolResults
      });
    }

    // Regular response without tool calls
    if (currentSessionId) {
      await SessionManager.addMessage(currentSessionId, 'assistant', messageContent.content || '');
    }

    return Response.json({ 
      response: messageContent.content,
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

