import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/api-auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

/**
 * Upload floor plan and create project (async analysis happens in background)
 * Returns immediately with projectId and status='pending'
 */
export async function POST(request: NextRequest) {
  // Require authentication
  const auth = await requireAuth();
  if (auth.error) {
    return auth.error;
  }

  try {
    // Verify environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('NEXT_PUBLIC_SUPABASE_URL is not set');
      return NextResponse.json(
        { error: 'Configuration error', details: 'Supabase URL not configured' },
        { status: 503 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_KEY && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('No Supabase key configured');
      return NextResponse.json(
        { error: 'Configuration error', details: 'Supabase authentication not configured' },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('floorplan') as File;
    const projectName = formData.get('projectName') as string;
    const customerId = formData.get('customerId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No floor plan file provided' },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large', details: 'Maximum file size is 10MB' },
        { status: 400 }
      );
    }

    // Validate file type (Vision API only supports images)
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type', details: 'Only PNG and JPG image files are supported. Please convert PDFs to images first.' },
        { status: 400 }
      );
    }

    console.log(`Processing floor plan: ${file.name}, size: ${file.size} bytes`);

    // Upload file to Supabase Storage with retry
    const fileArrayBuffer = await file.arrayBuffer();
    const nodeBuffer = Buffer.from(fileArrayBuffer);
    const fileName = `${Date.now()}_${file.name}`;

    const uploadData = await uploadWithRetry(fileName, nodeBuffer, file.type);

    console.log('File uploaded to Supabase:', uploadData.path);

    // Create project record with status='pending'
    const { data: projectData, error: dbError } = await supabase
      .from('spatial_projects')
      .insert({
        customer_id: customerId || 'demo',
        project_name: projectName || 'Untitled Project',
        floorplan_url: uploadData.path,
        analysis_status: 'pending',
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }

    console.log('Project created:', projectData.id);

    // Trigger async analysis (fire and forget)
    triggerAsyncAnalysis(projectData.id);

    // Return immediately
    return NextResponse.json({
      success: true,
      projectId: projectData.id,
      status: 'pending',
      message: 'Upload successful. AI analysis in progress.',
    }, { status: 201 });

  } catch (error) {
    console.error('Floor plan upload error:', error);
    console.error('Error type:', typeof error);
    console.error('Error details:', JSON.stringify(error, null, 2));

    return NextResponse.json(
      {
        error: 'Failed to process floor plan',
        details: error instanceof Error ? error.message : (typeof error === 'object' && error !== null ? JSON.stringify(error) : String(error))
      },
      { status: 500 }
    );
  }
}

/**
 * Upload file with exponential backoff retry
 */
async function uploadWithRetry(
  fileName: string,
  buffer: Buffer,
  contentType: string,
  maxRetries = 3
): Promise<any> {
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await supabase.storage
        .from('spatial-floorplans')
        .upload(fileName, buffer, { contentType });

      if (error) {
        throw error;
      }

      return data;

    } catch (error: any) {
      lastError = error;
      console.error(`Upload attempt ${attempt}/${maxRetries} failed:`, error.message);

      // Don't retry on bucket not found - this is a config error
      if (error.message?.includes('Bucket not found')) {
        throw new Error('Storage bucket not configured. Please run database migrations.');
      }

      // Exponential backoff: 500ms, 1s, 2s
      if (attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt - 1) * 500;
        console.log(`Retrying upload in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError || new Error('Upload failed after retries');
}

/**
 * Trigger background analysis worker (fire and forget)
 */
function triggerAsyncAnalysis(projectId: string) {
  // Determine the correct base URL for production
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    || process.env.RENDER_EXTERNAL_URL
    || 'https://www.design-rite.com';

  const analysisUrl = `${baseUrl}/api/spatial-studio/process-analysis`;

  console.log(`Triggering async analysis for project ${projectId} at ${analysisUrl}`);

  fetch(analysisUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId }),
  }).catch(err => {
    console.error('Failed to trigger async analysis:', err);
    console.error('Analysis URL was:', analysisUrl);
  });
}

/**
 * Get project status endpoint
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({
      service: 'Spatial Studio - Floor Plan Upload',
      status: 'healthy',
      openai_configured: !!process.env.OPENAI_API_KEY,
      supabase_configured: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      timestamp: new Date().toISOString()
    });
  }

  // Fetch project status
  const { data: project, error } = await supabase
    .from('spatial_projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (error || !project) {
    return NextResponse.json(
      { error: 'Project not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    projectId: project.id,
    status: project.analysis_status,
    error: project.analysis_error,
    model: project.threejs_model,
    dimensions: project.dimensions,
    startedAt: project.analysis_started_at,
    completedAt: project.analysis_completed_at,
  });
}
