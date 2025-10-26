import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/api-auth';
import { isServiceRequest, getServiceUserContext } from '@/lib/service-auth';
import { processFloorplanAnalysis } from '@/lib/analysis-worker';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

/**
 * Upload floor plan and create project (async analysis happens in background)
 * Returns immediately with projectId and status='pending'
 */
export async function POST(request: NextRequest) {
  // Check if this is a service request (from Main Platform)
  let userId = null;
  if (isServiceRequest(request)) {
    const context = getServiceUserContext(request);
    userId = context?.userId || 'service-user';
    console.log('Service request authenticated for upload-floorplan');
  } else {
    // Require authentication for regular users
    const auth = await requireAuth();
    if (auth.error) {
      return auth.error;
    }
    userId = auth.user?.id;
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

    // Trigger async analysis (fire and forget - don't await)
    // This runs in the background without blocking the response
    processFloorplanAnalysis(projectData.id).catch(err => {
      console.error('[Upload] Background analysis failed:', err);
      console.error('[Upload] Error details:', {
        message: err.message,
        projectId: projectData.id
      });
    });

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

  // Generate the public URL for the floorplan if it exists
  let floorplanPublicUrl = null;
  let floorplanFilename = null;

  if (project.floorplan_url) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    floorplanPublicUrl = `${supabaseUrl}/storage/v1/object/public/spatial-floorplans/${project.floorplan_url}`;
    // Extract filename from URL (format is typically: timestamp_filename)
    const parts = project.floorplan_url.split('_');
    floorplanFilename = parts.length > 1 ? parts.slice(1).join('_') : project.floorplan_url;
  }

  return NextResponse.json({
    projectId: project.id,
    status: project.analysis_status,
    error: project.analysis_error,
    model: project.threejs_model,
    dimensions: project.dimensions,
    startedAt: project.analysis_started_at,
    completedAt: project.analysis_completed_at,
    floorplanUrl: project.floorplan_url,
    floorplanPublicUrl,
    floorplanFilename,
    projectName: project.project_name,
  });
}

/**
 * Handle OPTIONS requests for CORS preflight
 */
export async function OPTIONS() {
  return NextResponse.json(
    {
      status: 'ok',
      methods: ['GET', 'POST', 'OPTIONS'],
      service: 'Spatial Studio Upload API'
    },
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Service-Key, x-service-key',
      }
    }
  );
}
