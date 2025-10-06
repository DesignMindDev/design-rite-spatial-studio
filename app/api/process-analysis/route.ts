import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Background worker endpoint for processing floor plan analysis
 * Called asynchronously after upload completes
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let projectId: string | null = null;

  try {
    const { projectId: reqProjectId } = await request.json();
    projectId = reqProjectId;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing projectId' },
        { status: 400 }
      );
    }

    console.log(`[Analysis Worker] Starting analysis for project ${projectId}`);

    // Update status to processing
    await supabase
      .from('spatial_projects')
      .update({
        analysis_status: 'processing',
        analysis_started_at: new Date().toISOString(),
      })
      .eq('id', projectId);

    // Fetch project data
    const { data: project, error: fetchError } = await supabase
      .from('spatial_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (fetchError || !project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    // Get the floor plan file URL
    const floorplanPath = project.floorplan_url;
    if (!floorplanPath) {
      throw new Error('No floor plan file found');
    }

    // Download the file from Supabase storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('spatial-floorplans')
      .download(floorplanPath);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download floor plan: ${downloadError?.message}`);
    }

    console.log(`[Analysis Worker] Downloaded file, size: ${fileData.size} bytes`);

    // Convert to base64 for GPT-4 Vision
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');
    const mimeType = fileData.type || 'image/png';

    // Log debug info
    await logDebug(projectId, 'vision_analysis', {
      file_size: fileData.size,
      mime_type: mimeType,
      floorplan_path: floorplanPath,
    });

    console.log(`[Analysis Worker] Calling GPT-4 Vision API...`);

    // Call GPT-4 Vision with retry logic
    const analysisResult = await analyzeWithRetry(base64Image, mimeType, projectId);

    // Generate 3D model data
    const threejsModel = {
      walls: analysisResult.walls || [],
      doors: analysisResult.doors || [],
      windows: analysisResult.windows || [],
      rooms: analysisResult.rooms || [],
      height: 10, // Default ceiling height in feet
    };

    console.log(`[Analysis Worker] Generated 3D model with ${threejsModel.walls.length} walls`);

    // Update project with analysis results
    const { error: updateError } = await supabase
      .from('spatial_projects')
      .update({
        threejs_model: threejsModel,
        dimensions: analysisResult.dimensions || {},
        analysis_status: 'completed',
        analysis_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);

    if (updateError) {
      throw updateError;
    }

    const executionTime = Date.now() - startTime;
    console.log(`[Analysis Worker] Completed in ${executionTime}ms`);

    return NextResponse.json({
      success: true,
      projectId,
      executionTime,
      model: threejsModel,
    });

  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error(`[Analysis Worker] Failed after ${executionTime}ms:`, errorMessage);

    // Update project status to failed
    if (projectId) {
      await supabase
        .from('spatial_projects')
        .update({
          analysis_status: 'failed',
          analysis_error: errorMessage,
          analysis_completed_at: new Date().toISOString(),
        })
        .eq('id', projectId);

      // Log error to debug table
      await logDebug(projectId, 'vision_analysis_error', {}, errorMessage);
    }

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

/**
 * Analyze floor plan with GPT-4 Vision with exponential backoff retry
 */
async function analyzeWithRetry(
  base64Image: string,
  mimeType: string,
  projectId: string,
  maxRetries = 3
): Promise<any> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const visionResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this floor plan and identify:
1. All walls (return as line segments with coordinates in pixels from top-left)
2. All doors (return as points with type: entry/interior)
3. All windows (return as points)
4. Room dimensions (if scale is visible)
5. Estimated square footage

Return as JSON with this structure:
{
  "walls": [{"start": [x1, y1], "end": [x2, y2]}],
  "doors": [{"position": [x, y], "type": "entry"}],
  "windows": [{"position": [x, y]}],
  "dimensions": {"width": 50, "height": 40, "unit": "feet"},
  "sqft": 2000,
  "rooms": [{"name": "Living Room", "center": [x, y]}]
}

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 2000,
      });

      const responseText = visionResponse.choices?.[0]?.message?.content || '{}';
      const cleanJson = String(responseText).replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      // Log successful analysis
      await logDebug(projectId, 'vision_analysis_success', {
        attempt,
        response_length: responseText.length,
      }, null, responseText, parsed);

      return parsed;

    } catch (error) {
      lastError = error as Error;
      console.error(`[Analysis Worker] Attempt ${attempt}/${maxRetries} failed:`, lastError.message);

      // Log failed attempt
      await logDebug(projectId, 'vision_analysis_retry', {
        attempt,
        max_retries: maxRetries,
      }, lastError.message);

      // Don't retry on parse errors
      if (error instanceof SyntaxError) {
        console.error('[Analysis Worker] JSON parse error, using fallback');
        return {
          walls: [],
          doors: [],
          windows: [],
          dimensions: {},
          sqft: 0,
          rooms: []
        };
      }

      // Exponential backoff: 1s, 2s, 4s
      if (attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt - 1) * 1000;
        console.log(`[Analysis Worker] Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  // All retries failed, return fallback
  console.error('[Analysis Worker] All retries exhausted, using fallback');
  return {
    walls: [],
    doors: [],
    windows: [],
    dimensions: {},
    sqft: 0,
    rooms: []
  };
}

/**
 * Log debug information to ai_analysis_debug table
 */
async function logDebug(
  projectId: string,
  operation: string,
  inputData: any,
  errorMessage: string | null = null,
  rawResponse: string | null = null,
  parsedResult: any = null,
  executionTimeMs: number | null = null
) {
  try {
    await supabase.from('ai_analysis_debug').insert({
      project_id: projectId,
      operation,
      input_data: inputData,
      raw_response: rawResponse,
      parsed_result: parsedResult,
      error_message: errorMessage,
      execution_time_ms: executionTimeMs,
    });
  } catch (err) {
    console.error('[Analysis Worker] Failed to log debug info:', err);
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
