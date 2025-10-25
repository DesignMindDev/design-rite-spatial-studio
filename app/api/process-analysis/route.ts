import { NextRequest, NextResponse } from 'next/server';
import { processFloorplanAnalysis } from '@/lib/analysis-worker';

/**
 * Background worker endpoint for processing floor plan analysis
 * This can be called via HTTP if needed, but the upload route now uses direct invocation
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing projectId' },
        { status: 400 }
      );
    }

    console.log(`[Process Analysis API] Starting analysis for project ${projectId}`);

    // Use the shared worker function
    await processFloorplanAnalysis(projectId);

    const executionTime = Date.now() - startTime;
    console.log(`[Process Analysis API] Completed in ${executionTime}ms`);

    return NextResponse.json({
      success: true,
      projectId,
      executionTime,
      message: 'Analysis completed successfully'
    });

  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error(`[Process Analysis API] Failed after ${executionTime}ms:`, errorMessage);

    return NextResponse.json(
      {
        error: 'Analysis failed',
        details: errorMessage,
        executionTime,
      },
      { status: 500 }
    );
  }
}


// Health check
export async function GET() {
  return NextResponse.json({
    service: 'Spatial Studio - Analysis Worker',
    status: 'healthy',
    openai_configured: !!process.env.OPENAI_API_KEY,
    supabase_configured: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  });
}
