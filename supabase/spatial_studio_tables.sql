-- Spatial Studio - 3D Floor Plan Intelligence Tables
-- Run this in Supabase SQL Editor (Production Database)
-- Version: 2.0 - Production hardened with storage bucket and complete schema

-- ============================================
-- STORAGE BUCKET (Run this first!)
-- ============================================

-- Create storage bucket for floor plan uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('spatial-floorplans', 'spatial-floorplans', true)
ON CONFLICT (id) DO NOTHING;

-- Storage access policies
CREATE POLICY IF NOT EXISTS "Allow public read access to floor plans"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'spatial-floorplans');

CREATE POLICY IF NOT EXISTS "Allow public uploads to floor plans"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'spatial-floorplans');

CREATE POLICY IF NOT EXISTS "Allow public updates to floor plans"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'spatial-floorplans');

CREATE POLICY IF NOT EXISTS "Allow public deletes from floor plans"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'spatial-floorplans');

-- ============================================
-- DATABASE TABLES
-- ============================================

-- Table 1: Store 3D floor plan projects
CREATE TABLE IF NOT EXISTS spatial_projects (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id varchar(255),
  project_name varchar(255) NOT NULL,
  floorplan_url text,              -- Original 2D file URL in storage
  threejs_model jsonb,             -- 3D model data (JSON)
  dimensions jsonb,                -- {width, height, scale_factor}
  floor_count integer DEFAULT 1,
  analysis_status varchar(50) DEFAULT 'pending',  -- 'pending', 'processing', 'completed', 'failed'
  analysis_error text,             -- Error message if analysis fails
  analysis_started_at timestamp,
  analysis_completed_at timestamp,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Table 2: Store site walk annotations
CREATE TABLE IF NOT EXISTS site_annotations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid REFERENCES spatial_projects(id) ON DELETE CASCADE,
  annotation_type varchar(50),     -- 'camera', 'access_point', 'door', 'threat'
  gps_coordinates jsonb,           -- {lat, lng, altitude}
  floor_coordinates jsonb,         -- {x, y, z} in 3D model space
  voice_transcript text,
  photo_url text,
  timestamp timestamp DEFAULT now(),
  device_type varchar(100),
  confidence_score numeric(3,2),
  metadata jsonb                   -- Additional context
);

-- Table 3: AI device placement suggestions
CREATE TABLE IF NOT EXISTS ai_device_suggestions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid REFERENCES spatial_projects(id) ON DELETE CASCADE,
  device_category varchar(100),    -- 'Fixed Camera', 'PTZ', 'Access Control'
  suggested_coordinates jsonb,     -- {x, y, z}
  reasoning text,
  coverage_area jsonb,             -- Polygon array for coverage zone
  confidence_score numeric(3,2),
  created_at timestamp DEFAULT now()
);

-- Table 4: Site walk sessions (for tracking field visits)
CREATE TABLE IF NOT EXISTS site_walk_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid REFERENCES spatial_projects(id) ON DELETE CASCADE,
  operator_name varchar(255),
  device_type varchar(100),        -- 'iPhone 15 Pro', 'Meta Glasses', etc.
  start_time timestamp DEFAULT now(),
  end_time timestamp,
  annotation_count integer DEFAULT 0,
  status varchar(50) DEFAULT 'in_progress'
);

-- Table 5: Debug logging for AI analysis
CREATE TABLE IF NOT EXISTS ai_analysis_debug (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid REFERENCES spatial_projects(id) ON DELETE CASCADE,
  operation varchar(100),          -- 'vision_analysis', 'vision_analysis_success', 'vision_analysis_error', etc.
  input_data jsonb,                -- Request data sent to API
  raw_response text,               -- Raw API response
  parsed_result jsonb,             -- Parsed result
  error_message text,              -- Error details if failed
  execution_time_ms integer,       -- Time taken for operation
  created_at timestamp DEFAULT now()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_spatial_projects_customer ON spatial_projects(customer_id);
CREATE INDEX IF NOT EXISTS idx_spatial_projects_status ON spatial_projects(analysis_status);
CREATE INDEX IF NOT EXISTS idx_spatial_projects_created ON spatial_projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_annotations_project ON site_annotations(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_project ON ai_device_suggestions(project_id);
CREATE INDEX IF NOT EXISTS idx_site_walks_project ON site_walk_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_debug_project ON ai_analysis_debug(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_debug_operation ON ai_analysis_debug(operation);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE spatial_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_device_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_walk_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis_debug ENABLE ROW LEVEL SECURITY;

-- Public access policies (adjust based on auth requirements)
CREATE POLICY IF NOT EXISTS "Allow public read access to projects"
  ON spatial_projects FOR SELECT
  USING (true);

CREATE POLICY IF NOT EXISTS "Allow public insert to projects"
  ON spatial_projects FOR INSERT
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow public update to projects"
  ON spatial_projects FOR UPDATE
  USING (true);

CREATE POLICY IF NOT EXISTS "Allow public read access to annotations"
  ON site_annotations FOR SELECT
  USING (true);

CREATE POLICY IF NOT EXISTS "Allow public insert to annotations"
  ON site_annotations FOR INSERT
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow public read access to suggestions"
  ON ai_device_suggestions FOR SELECT
  USING (true);

CREATE POLICY IF NOT EXISTS "Allow public insert to suggestions"
  ON ai_device_suggestions FOR INSERT
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow public read access to sessions"
  ON site_walk_sessions FOR SELECT
  USING (true);

CREATE POLICY IF NOT EXISTS "Allow public insert to sessions"
  ON site_walk_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow public read access to debug logs"
  ON ai_analysis_debug FOR SELECT
  USING (true);

CREATE POLICY IF NOT EXISTS "Allow public insert to debug logs"
  ON ai_analysis_debug FOR INSERT
  WITH CHECK (true);

-- ============================================
-- SUCCESS CONFIRMATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Spatial Studio database schema created successfully!';
  RAISE NOTICE '✅ Storage bucket "spatial-floorplans" configured';
  RAISE NOTICE '✅ All tables, indexes, and RLS policies applied';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Next steps:';
  RAISE NOTICE '1. Verify storage bucket exists: Storage > Buckets > spatial-floorplans';
  RAISE NOTICE '2. Set environment variables in production (Render.com):';
  RAISE NOTICE '   - NEXT_PUBLIC_SUPABASE_URL';
  RAISE NOTICE '   - SUPABASE_SERVICE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)';
  RAISE NOTICE '   - OPENAI_API_KEY';
  RAISE NOTICE '   - NEXT_PUBLIC_APP_URL=https://www.design-rite.com';
  RAISE NOTICE '3. Test upload at: https://www.design-rite.com/spatial-studio';
END $$;
