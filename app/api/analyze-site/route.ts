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

export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    console.log('Analyzing site for project:', projectId);

    // Fetch project data
    const { data: project, error: projectError } = await supabase
      .from('spatial_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.error('Project not found:', projectError);
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Fetch any existing annotations
    const { data: annotations } = await supabase
      .from('site_annotations')
      .select('*')
      .eq('project_id', projectId);

    console.log('Found', annotations?.length || 0, 'annotations');

    // Analyze with GPT-4o
    const analysisPrompt = `You are a security system design expert. Analyze this floor plan and provide comprehensive security recommendations.

**Floor Plan Data:**
${JSON.stringify(project.threejs_model, null, 2)}

**Dimensions:**
${JSON.stringify(project.dimensions, null, 2)}

**Existing Annotations:**
${annotations && annotations.length > 0 ? annotations.map(a => `
- Type: ${a.annotation_type}
- Location: ${JSON.stringify(a.floor_coordinates)}
- Notes: ${a.voice_transcript || 'None'}
`).join('\n') : 'No annotations yet'}

Please provide:
1. **Camera Placements**: Recommend specific camera locations with coverage analysis
2. **Access Control**: Suggest door/entry points for card readers or biometric systems
3. **Blind Spots**: Identify any security gaps or uncovered areas
4. **Equipment List**: Detailed list of recommended devices with quantities
5. **Coverage Analysis**: Percentage of area covered by cameras
6. **Priority Zones**: Areas requiring highest security (entries, high-value zones)

Return as JSON with this EXACT structure (no markdown, pure JSON):
{
  "cameras": [
    {
      "type": "Fixed 4MP Camera",
      "position": [x, y, z],
      "coverage_radius": 30,
      "coverage_angle": 90,
      "reasoning": "Covers main entry with clear view of faces",
      "priority": "high",
      "confidence": 0.95
    }
  ],
  "access_points": [
    {
      "location": [x, y, z],
      "device_type": "Card Reader",
      "reasoning": "Primary entry point requiring access control",
      "confidence": 0.90
    }
  ],
  "blind_spots": [
    {
      "area": "Northwest corner",
      "position": [x, y, z],
      "risk_level": "medium",
      "recommendation": "Add PTZ camera or additional fixed camera"
    }
  ],
  "equipment_list": {
    "cameras": {"Fixed 4MP": 12, "PTZ": 2},
    "nvr": {"16 Channel 4K NVR": 1},
    "access_control": {"Card Readers": 4, "Controller": 1},
    "network": {"PoE Switch 24-port": 1, "Patch Cables": 16}
  },
  "coverage_analysis": {
    "total_area_sqft": 2000,
    "covered_area_sqft": 1850,
    "coverage_percentage": 92.5,
    "blind_spot_percentage": 7.5
  },
  "priority_zones": [
    {
      "name": "Main Entry",
      "position": [x, y, z],
      "priority": "critical",
      "cameras_needed": 2
    }
  ],
  "estimated_cost": {
    "equipment": 45000,
    "installation": 12000,
    "total": 57000
  }
}`;

    console.log('Sending analysis request to GPT-4o...');

    // Helper: retry wrapper with exponential backoff for OpenAI calls
    async function retryOpenAI(callable: () => Promise<any>, attempts = 3, baseMs = 1000) {
      let lastErr: any = null;
      for (let i = 0; i < attempts; i++) {
        try {
          return await callable();
        } catch (err) {
          lastErr = err;
          const wait = baseMs * Math.pow(2, i);
          console.warn(`OpenAI call failed (attempt ${i + 1}/${attempts}), retrying in ${wait}ms`, String(err));
          await new Promise((r) => setTimeout(r, wait));
        }
      }
      throw lastErr;
    }

    // Call OpenAI with retry and parse safely; fall back to an empty analysis on failure
    let analysis: any = null;
    try {
      const completion = await retryOpenAI(() => openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a security system design expert. Return ONLY valid JSON, no markdown code blocks, no explanations.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 3000,
      }));

      console.log('GPT-4o response received');

      // Parse the response
      try {
        const responseText = completion.choices?.[0]?.message?.content || '{}';
        const cleanJson = String(responseText).replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        analysis = JSON.parse(cleanJson);
        console.log('Analysis parsed successfully');
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.log('Raw response:', completion.choices?.[0]?.message?.content);
        // fallback to empty but valid structure
        analysis = {
          cameras: [],
          access_points: [],
          blind_spots: [],
          equipment_list: {},
          coverage_analysis: {},
          priority_zones: [],
          estimated_cost: {}
        };
      }
    } catch (openaiError) {
      console.error('OpenAI analysis failed after retries:', openaiError);
      analysis = {
        cameras: [],
        access_points: [],
        blind_spots: [],
        equipment_list: {},
        coverage_analysis: {},
        priority_zones: [],
        estimated_cost: {}
      };
    }

    // Save camera suggestions to database
    if (analysis.cameras && Array.isArray(analysis.cameras)) {
      console.log('Saving', analysis.cameras.length, 'camera suggestions...');

      for (const camera of analysis.cameras) {
        try {
          await supabase.from('ai_device_suggestions').insert({
            project_id: projectId,
            device_category: camera.type,
            suggested_coordinates: { x: camera.position[0], y: camera.position[1], z: camera.position[2] },
            reasoning: camera.reasoning,
            coverage_area: {
              radius: camera.coverage_radius,
              angle: camera.coverage_angle
            },
            confidence_score: camera.confidence,
          });
        } catch (insertErr) {
          console.error('Failed to save camera suggestion, continuing:', insertErr);
        }
      }
    }

    // Save access control suggestions
    if (analysis.access_points && Array.isArray(analysis.access_points)) {
      console.log('Saving', analysis.access_points.length, 'access control suggestions...');

      for (const accessPoint of analysis.access_points) {
        try {
          await supabase.from('ai_device_suggestions').insert({
            project_id: projectId,
            device_category: accessPoint.device_type,
            suggested_coordinates: { x: accessPoint.location[0], y: accessPoint.location[1], z: accessPoint.location[2] },
            reasoning: accessPoint.reasoning,
            coverage_area: {},
            confidence_score: accessPoint.confidence,
          });
        } catch (insertErr) {
          console.error('Failed to save access control suggestion, continuing:', insertErr);
        }
      }
    }

    console.log('Analysis complete and saved to database');

    return NextResponse.json({
      success: true,
      analysis,
      suggestions_saved: (analysis.cameras?.length || 0) + (analysis.access_points?.length || 0)
    });

  } catch (error) {
    console.error('Site analysis error:', error);
    return NextResponse.json(
      {
        error: 'Analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    service: 'Spatial Studio - Site Analysis',
    status: 'healthy',
    openai_configured: !!process.env.OPENAI_API_KEY,
    timestamp: new Date().toISOString()
  });
}
