import { NextRequest } from 'next/server';

// Hardcoded ASI:One models for now
const ASI_ONE_MODELS = [
  { id: 'asi1-mini', created: 1735689600, owned_by: 'fetch.ai' },
  { id: 'asi1-fast', created: 1735689600, owned_by: 'fetch.ai' },
  { id: 'asi1-extended', created: 1735689600, owned_by: 'fetch.ai' },
  { id: 'asi1-agentic', created: 1735689600, owned_by: 'fetch.ai' },
  { id: 'asi1-fast-agentic', created: 1735689600, owned_by: 'fetch.ai' },
  { id: 'asi1-extended-agentic', created: 1735689600, owned_by: 'fetch.ai' },
  { id: 'asi1-graph', created: 1735689600, owned_by: 'fetch.ai' },
];

export async function GET(request: NextRequest) {
  try {
    return Response.json({ models: ASI_ONE_MODELS });
  } catch (error) {
    console.error('Error fetching models:', error);
    return Response.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    );
  }
}

