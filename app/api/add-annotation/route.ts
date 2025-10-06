import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function POST(request: NextRequest) {
  try {
    const {
      projectId,
      annotationType,
      gpsCoordinates,
      floorCoordinates,
      voiceTranscript,
      photoUrl,
      deviceType,
      metadata
    } = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    console.log('Adding annotation to project:', projectId);

    // Validate project exists
    const { data: project, error: projectError } = await supabase
      .from('spatial_projects')
      .select('id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.error('Project not found:', projectError);
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Calculate confidence score based on data quality
    let confidenceScore = 0.5; // Base score

    if (gpsCoordinates && gpsCoordinates.accuracy) {
      // Better GPS accuracy = higher confidence
      confidenceScore += (10 - Math.min(gpsCoordinates.accuracy, 10)) / 10 * 0.2;
    }

    if (voiceTranscript && voiceTranscript.length > 10) {
      confidenceScore += 0.1; // Bonus for voice notes
    }

    if (photoUrl) {
      confidenceScore += 0.1; // Bonus for photo documentation
    }

    if (floorCoordinates) {
      confidenceScore += 0.1; // Bonus if coordinates mapped to floor plan
    }

    confidenceScore = Math.min(confidenceScore, 0.99); // Cap at 0.99

    // Insert annotation
    const { data: annotation, error: insertError } = await supabase
      .from('site_annotations')
      .insert({
        project_id: projectId,
        annotation_type: annotationType || 'general',
        gps_coordinates: gpsCoordinates || {},
        floor_coordinates: floorCoordinates || {},
        voice_transcript: voiceTranscript || '',
        photo_url: photoUrl || null,
        device_type: deviceType || 'unknown',
        confidence_score: confidenceScore,
        metadata: metadata || {},
        timestamp: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    console.log('Annotation added successfully:', annotation.id);

    return NextResponse.json({
      success: true,
      annotationId: annotation.id,
      confidence_score: confidenceScore,
      message: 'Annotation added successfully'
    });

  } catch (error) {
    console.error('Add annotation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to add annotation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve annotations for a project
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const { data: annotations, error } = await supabase
      .from('site_annotations')
      .select('*')
      .eq('project_id', projectId)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Fetch annotations error:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      annotations: annotations || [],
      count: annotations?.length || 0
    });

  } catch (error) {
    console.error('Get annotations error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch annotations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
