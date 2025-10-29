import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { message, model = 'asi1-mini' } = await request.json();
    
    // Get API key from environment
    const apiKey = process.env.ASI_ONE_API_KEY;
    
    if (!apiKey) {
      return Response.json(
        { error: 'ASI_ONE_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Use ASI:One API (OpenAI-compatible)
    const response = await fetch('https://api.asi1.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'asi1-mini',
        messages: [{ role: 'user', content: message }],
        temperature: 0.7,
      }),
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
    
    return Response.json({ 
      response: data.choices[0].message.content,
      model: data.model
    });
  } catch (error) {
    console.error('ASI:One API error:', error);
    return Response.json(
      { error: 'Failed to process AI request' },
      { status: 500 }
    );
  }
}

