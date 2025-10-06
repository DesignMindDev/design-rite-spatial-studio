import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

/**
 * Get Spatial Studio analytics and metrics
 */
export async function GET(request: NextRequest) {
  try {
    // Get total projects count
    const { count: totalProjects } = await supabase
      .from('spatial_projects')
      .select('*', { count: 'exact', head: true });

    // Get completed analyses
    const { count: completedAnalyses } = await supabase
      .from('spatial_projects')
      .select('*', { count: 'exact', head: true })
      .eq('analysis_status', 'completed');

    // Get failed analyses
    const { count: failedAnalyses } = await supabase
      .from('spatial_projects')
      .select('*', { count: 'exact', head: true })
      .eq('analysis_status', 'failed');

    // Get recent projects (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count: recentProjects } = await supabase
      .from('spatial_projects')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString());

    // Get average analysis time (completed projects only)
    const { data: completedProjects } = await supabase
      .from('spatial_projects')
      .select('analysis_started_at, analysis_completed_at')
      .eq('analysis_status', 'completed')
      .not('analysis_started_at', 'is', null)
      .not('analysis_completed_at', 'is', null)
      .limit(100);

    let avgAnalysisTime = 0;
    if (completedProjects && completedProjects.length > 0) {
      const times = completedProjects.map(p => {
        const start = new Date(p.analysis_started_at).getTime();
        const end = new Date(p.analysis_completed_at).getTime();
        return (end - start) / 1000; // seconds
      });
      avgAnalysisTime = times.reduce((a, b) => a + b, 0) / times.length;
    }

    // Get total walls detected across all projects
    const { data: allProjects } = await supabase
      .from('spatial_projects')
      .select('threejs_model')
      .eq('analysis_status', 'completed')
      .not('threejs_model', 'is', null);

    let totalWalls = 0;
    if (allProjects) {
      totalWalls = allProjects.reduce((sum, p) => {
        const model = p.threejs_model as any;
        return sum + (model?.walls?.length || 0);
      }, 0);
    }

    return NextResponse.json({
      success: true,
      metrics: {
        totalProjects: totalProjects || 0,
        completedAnalyses: completedAnalyses || 0,
        failedAnalyses: failedAnalyses || 0,
        recentProjects: recentProjects || 0,
        avgAnalysisTime: Math.round(avgAnalysisTime * 10) / 10, // 1 decimal place
        totalWalls: totalWalls,
        successRate: totalProjects ? Math.round((completedAnalyses || 0) / totalProjects * 100) : 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch analytics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
