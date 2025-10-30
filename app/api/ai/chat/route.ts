import { NextRequest } from 'next/server';
import { POST as groqHandler } from '../groq/route';

export async function POST(request: NextRequest) {
  try {
    // Always route to Groq
    return await groqHandler(request);
  } catch (error) {
    console.error('AI chat routing error:', error);
    return Response.json(
      { error: 'Failed to process AI request' },
      { status: 500 }
    );
  }
}
