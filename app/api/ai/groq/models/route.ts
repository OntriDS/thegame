import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get API key from environment
    const apiKey = process.env.GROQ_API_KEY;
    
    if (!apiKey) {
      return Response.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    // Fetch available models from Groq
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return Response.json(
        { error: 'Failed to fetch models' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Filter to only show chat models (exclude special models like whisper, tts, guard)
    const chatModels = data.data?.filter((model: any) => {
      const id = model.id.toLowerCase();
      return !id.includes('whisper') && 
             !id.includes('tts') && 
             !id.includes('guard') &&
             !id.includes('prompt-guard');
    }) || [];

    return Response.json({ models: chatModels });
  } catch (error) {
    console.error('Error fetching models:', error);
    return Response.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    );
  }
}

