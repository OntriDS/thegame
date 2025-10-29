import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { message, model = 'openai/gpt-oss-120b', provider } = await request.json();
    
    // Determine which provider to use based on model or explicit provider
    const isAsiOne = provider === 'asi-one' || model.startsWith('asi1-');
    
    if (isAsiOne) {
      // Route to ASI:One
      const asiOneResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/ai/asi-one`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, model })
      });
      return Response.json(await asiOneResponse.json());
    } else {
      // Route to Groq
      const groqResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/ai/groq`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, model })
      });
      return Response.json(await groqResponse.json());
    }
  } catch (error) {
    console.error('AI chat routing error:', error);
    return Response.json(
      { error: 'Failed to process AI request' },
      { status: 500 }
    );
  }
}
