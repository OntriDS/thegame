import { NextRequest } from 'next/server';
import { POST as groqHandler } from '../groq/route';
import { POST as asiOneHandler } from '../asi-one/route';

export async function POST(request: NextRequest) {
  try {
    const { message, model = 'openai/gpt-oss-120b', provider } = await request.json();
    
    // Determine which provider to use based on model or explicit provider
    const isAsiOne = provider === 'asi-one' || model.startsWith('asi1-');
    
    if (isAsiOne) {
      // Direct function call to ASI:One handler
      return await asiOneHandler(request);
    } else {
      // Direct function call to Groq handler
      return await groqHandler(request);
    }
  } catch (error) {
    console.error('AI chat routing error:', error);
    return Response.json(
      { error: 'Failed to process AI request' },
      { status: 500 }
    );
  }
}
