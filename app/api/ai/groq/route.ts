import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { message, model = 'openai/gpt-oss-120b' } = await request.json();
    
    // Get API key from environment
    const apiKey = process.env.GROQ_API_KEY;
    
    if (!apiKey) {
      return Response.json(
        { error: 'GROQ_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Use Groq API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'openai/gpt-oss-120b',
        messages: [{ role: 'user', content: message }],
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
    
    return Response.json({ 
      response: data.choices[0].message.content,
      model: data.model,
      rateLimits: rateLimitInfo
    });
  } catch (error) {
    console.error('Groq API error:', error);
    return Response.json(
      { error: 'Failed to process AI request' },
      { status: 500 }
    );
  }
}

