// app/api/migrations/remap-production-stations/route.ts
// API route to run production station remap migration in Vercel KV environment

import { NextRequest, NextResponse } from 'next/server';
import { remapProductionStations, previewRemapProductionStations } from '@/scripts/migrations/remap-production-stations';

export async function POST(request: NextRequest) {
  try {
    const { preview } = await request.json().catch(() => ({}));
    
    if (preview) {
      console.log('[API] Previewing production station remap...');
      const previewData = await previewRemapProductionStations();
      
      return NextResponse.json({
        success: true,
        message: 'Preview completed',
        preview: previewData
      });
    }
    
    console.log('[API] Starting production station remap migration...');
    const stats = await remapProductionStations();
    
    return NextResponse.json({
      success: true,
      message: 'Production station remap completed',
      stats
    });
    
  } catch (error) {
    console.error('[API] Production station remap failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Production Station Remap Migration',
    description: 'POST to this endpoint to run the migration',
    usage: {
      run: 'POST /api/migrations/remap-production-stations',
      preview: 'POST /api/migrations/remap-production-stations with { "preview": true }'
    }
  });
}

