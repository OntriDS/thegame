import { NextResponse } from 'next/server';
import { executeWorkflow } from '@/workflows/coordinator';
import { getWorkflowExecution } from '@/data-store/workflow-store';

/**
 * Workflow Coordinator Async Endpoint
 * 
 * Invoked by background triggers or HTTP fetches to process a workflow 
 * execution asynchronously.
 */
export async function POST(request: Request) {
  try {
    const { workflowId } = await request.json();
    if (!workflowId) {
      return NextResponse.json({ error: 'workflowId is required' }, { status: 400 });
    }

    const execution = await getWorkflowExecution(workflowId);
    if (!execution) {
      return NextResponse.json({ error: 'Workflow execution not found' }, { status: 404 });
    }

    // Fire and forget (in a real production Vercel environment, you might use 
    // waitUntil() or a true background function queue)
    executeWorkflow(execution).catch(err => {
      console.error('[COORDINATOR-ROUTE] Background execution failed:', err);
    });

    return NextResponse.json({ 
      status: 'accepted',
      workflowId,
      message: 'Workflow execution accepted for processing'
    }, { status: 202 });

  } catch (error: any) {
    console.error('[COORDINATOR-ROUTE] Error processing request:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
