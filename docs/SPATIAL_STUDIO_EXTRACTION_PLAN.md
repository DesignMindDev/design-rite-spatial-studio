# Spatial Studio Microservice Extraction Plan

**Created:** October 3, 2025
**Purpose:** Extract Spatial Studio from Design-Rite v3 monolith into standalone microservice
**Goal:** Reduce main app load, enable independent scaling, create reusable product architecture

---

## 🎯 What Are We Trying to Achieve?

### Primary Objectives

1. **Lighten Design-Rite v3 Load**
   - Move compute-intensive AI processing to separate service
   - Reduce main app bundle size and memory footprint
   - Enable independent scaling of AI workloads vs. main app

2. **Create Reusable Microservice Architecture**
   - Establish pattern for extracting products from monolith
   - Enable multiple products (Spatial Studio, Spec Harvester, etc.) as services
   - Maintain shared authentication and data infrastructure

3. **Independent Deployment & Scaling**
   - Deploy Spatial Studio updates without touching main app
   - Scale AI service independently based on usage
   - Different pricing tiers without affecting core platform

4. **Revenue Stream Isolation**
   - Track Spatial Studio usage/revenue separately
   - Enable white-labeling and partnerships
   - Prepare for potential spin-off or acquisition

### Success Metrics

- Design-Rite v3 memory usage reduced by 30%+
- Spatial Studio API response times maintained or improved
- Zero downtime during extraction
- Shared auth working seamlessly across services
- Independent deployment pipeline operational

---

## 📋 Current State Analysis

### What Lives in Design-Rite v3 Today

**API Routes:**
```
app/api/spatial-studio/
├── upload-floorplan/route.ts      (File upload, trigger async analysis)
├── process-analysis/route.ts      (Background worker, OpenAI Vision API)
├── analyze-site/route.ts          (Camera placement recommendations)
├── add-annotation/route.ts        (Mobile site walk annotations)
└── [Future: enhance, progress, generate-quote]
```

**Frontend Components:**
```
app/admin/spatial-studio-dev/page.tsx     (Admin UI)
app/components/spatial-studio/
├── FloorPlanViewer3D.tsx                 (Three.js rendering)
├── AnalyticsDashboard.tsx                (Usage stats)
└── [Future: ProgressMeter, EnhancementChat]
```

**Database Tables (Supabase):**
```sql
spatial_projects                  (Core project data)
spatial_annotations               (Site walk notes)
ai_analysis_debug                 (OpenAI API logs)
ai_device_suggestions             (Camera placements)
```

**Dependencies:**
- OpenAI API (GPT-4 Vision)
- Supabase (Storage + Database)
- Three.js (3D rendering)
- Next.js 14 (App Router)
- Next-Auth.js (Shared authentication)

### What's Shared with Design-Rite

**Must Remain Shared:**
- Supabase database (cross-product queries)
- Authentication system (single login, shared sessions)
- Product pricing database (`products` table)
- User management (`users`, `activity_logs`)
- Admin dashboard access

**Can Be Isolated:**
- OpenAI API calls (separate key/budget)
- File storage (separate bucket)
- AI processing compute
- 3D rendering logic
- Spatial-specific tables

---

## 🏗️ Target Architecture

### Microservice Structure

```
┌─────────────────────────────────────────────────────────┐
│          Design-Rite v3 (Main Platform)                 │
│  - User auth (Next-Auth + Supabase)                     │
│  - Quote generation, BOM, AI Assessment                 │
│  - Admin dashboard, billing, user management            │
│  - Products database, pricing engine                    │
└─────────────────┬───────────────────────────────────────┘
                  │
                  │ Shared Supabase + Auth
                  │
      ┌───────────┴──────────┬──────────────────┐
      │                      │                  │
┌─────▼─────────┐  ┌─────────▼────────┐  ┌─────▼──────────┐
│ Spatial Studio │  │ Spec Harvester   │  │ Future Service │
│ Microservice   │  │ Microservice     │  │                │
│                │  │                  │  │                │
│ - AI Analysis  │  │ - PDF Scraping   │  │ - TBD Product  │
│ - 3D Rendering │  │ - Data Extract   │  │                │
│ - Annotations  │  │ - Spec Matching  │  │                │
└────────────────┘  └──────────────────┘  └────────────────┘

Each microservice:
✅ Independent Git repo
✅ Separate Render web service
✅ Own OpenAI/API keys
✅ Shared Supabase (RLS isolation)
✅ Shared Next-Auth sessions
```

### Tech Stack Per Service

**Spatial Studio Microservice:**
```typescript
Repository:  design-rite-spatial-studio (NEW)
Framework:   Next.js 14 (API routes + SSR)
Rendering:   Three.js, React-Three-Fiber
AI:          OpenAI GPT-4 Vision (dedicated key)
Database:    Supabase (shared instance, RLS policies)
Auth:        Next-Auth.js (shared secret, cross-domain)
Storage:     Supabase Storage (separate bucket: spatial-floorplans)
Hosting:     Render (web service: spatial-studio-api)
Domain:      spatial.design-rite.com or api.design-rite.com/spatial
```

**Design-Rite v3 (Main):**
```typescript
Repository:  design-rite-v3 (existing)
Framework:   Next.js 14
Database:    Supabase (shared instance)
Auth:        Next-Auth.js (auth provider)
Hosting:     Render (main web service)
Domain:      design-rite.com
```

---

## 🔄 Extraction Strategy (Step-by-Step)

### Phase 1: Setup New Repository (Week 1)

#### 1.1 Create New Git Repo
```bash
# On GitHub/GitLab
Create repo: design-rite-spatial-studio

# Clone locally
git clone <repo-url>
cd design-rite-spatial-studio

# Initialize Next.js
npx create-next-app@latest . --typescript --app --use-npm
```

#### 1.2 Copy Core Dependencies
```bash
# Copy essential config from design-rite-v3
cp ../design-rite-v3/package.json ./package.json.reference
cp ../design-rite-v3/tsconfig.json ./
cp ../design-rite-v3/.env.example ./

# Install Spatial Studio specific packages
npm install @supabase/supabase-js
npm install openai
npm install three @react-three/fiber @react-three/drei
npm install next-auth
npm install bcryptjs
```

#### 1.3 Setup Environment Variables
```bash
# .env.local for Spatial Studio microservice
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...  # Same as main app
SUPABASE_SERVICE_KEY=eyJ...           # Same as main app

OPENAI_API_KEY=sk-spatial-studio-key  # NEW separate key

NEXTAUTH_URL=https://spatial.design-rite.com
NEXTAUTH_SECRET=shared-secret-with-main-app  # SAME as v3

# Main app callback for auth
MAIN_APP_URL=https://design-rite.com
```

---

### Phase 2: Extract API Routes (Week 1-2)

#### 2.1 Copy API Endpoints
```bash
# Copy entire spatial-studio API directory
cp -r ../design-rite-v3/app/api/spatial-studio ./app/api/

# Directory structure after copy:
app/api/spatial-studio/
├── upload-floorplan/route.ts
├── process-analysis/route.ts
├── analyze-site/route.ts
└── add-annotation/route.ts
```

#### 2.2 Update Imports & Dependencies

**Before (in v3 monolith):**
```typescript
// app/api/spatial-studio/upload-floorplan/route.ts
import { createClient } from '@/lib/supabase-server'
import { OpenAI } from '@/lib/openai-client'
```

**After (in microservice):**
```typescript
// app/api/spatial-studio/upload-floorplan/route.ts
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

// Initialize clients directly (no shared lib)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})
```

#### 2.3 Create Shared Auth Middleware

**File: `middleware.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  })

  // Verify user authenticated via main app
  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Optional: Check user has Spatial Studio access
  const userRole = token.role as string
  if (!['super_admin', 'admin', 'manager'].includes(userRole)) {
    return NextResponse.json(
      { error: 'Insufficient permissions' },
      { status: 403 }
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/spatial-studio/:path*'
}
```

---

### Phase 3: Extract Frontend Components (Week 2)

#### 3.1 Copy UI Components
```bash
# Copy all Spatial Studio components
cp -r ../design-rite-v3/app/components/spatial-studio ./app/components/

# Copy admin page (optional, or keep in main app)
cp ../design-rite-v3/app/admin/spatial-studio-dev/page.tsx ./app/page.tsx
```

#### 3.2 Update API Calls

**Before (in v3 monolith):**
```typescript
// Calls local API
const res = await fetch('/api/spatial-studio/upload-floorplan', {
  method: 'POST',
  body: formData
})
```

**After (in microservice OR from main app):**
```typescript
// Calls microservice API
const SPATIAL_API = process.env.NEXT_PUBLIC_SPATIAL_STUDIO_API_URL
const res = await fetch(`${SPATIAL_API}/api/spatial-studio/upload-floorplan`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.token}` // Pass auth token
  },
  body: formData
})
```

---

### Phase 4: Database RLS Policies (Week 2)

#### 4.1 Add Service Role Markers

**Supabase SQL:**
```sql
-- Add service identifier to existing tables
ALTER TABLE spatial_projects
  ADD COLUMN IF NOT EXISTS service_name VARCHAR(50) DEFAULT 'spatial-studio';

ALTER TABLE spatial_annotations
  ADD COLUMN IF NOT EXISTS service_name VARCHAR(50) DEFAULT 'spatial-studio';

ALTER TABLE ai_analysis_debug
  ADD COLUMN IF NOT EXISTS service_name VARCHAR(50) DEFAULT 'spatial-studio';

-- Index for performance
CREATE INDEX idx_spatial_projects_service ON spatial_projects(service_name);
```

#### 4.2 Update RLS Policies

```sql
-- Allow microservice to read/write its own tables
CREATE POLICY "Spatial Studio service access"
ON spatial_projects
FOR ALL
USING (
  service_name = 'spatial-studio' OR
  auth.uid() IN (
    SELECT id FROM users
    WHERE role IN ('super_admin', 'admin', 'manager')
  )
);
```

---

### Phase 5: Render Deployment (Week 3)

#### 5.1 Create Render Web Service

**Render Dashboard:**
1. New Web Service → "spatial-studio-api"
2. Connect GitHub repo: `design-rite-spatial-studio`
3. Build Command: `npm install && npm run build`
4. Start Command: `npm start`
5. Environment: Node 20

#### 5.2 Configure Environment Variables

**In Render dashboard:**
```bash
# Supabase (SHARED with main app)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

# OpenAI (SEPARATE key for Spatial Studio)
OPENAI_API_KEY=sk-spatial-studio-dedicated-key

# Auth (SHARED secret for cross-service sessions)
NEXTAUTH_URL=https://spatial-studio-api.onrender.com
NEXTAUTH_SECRET=same-secret-as-design-rite-v3

# Main app URL for callbacks
MAIN_APP_URL=https://design-rite.com
```

#### 5.3 Setup Custom Domain (Optional)

**DNS Configuration:**
```
CNAME: spatial.design-rite.com → spatial-studio-api.onrender.com
```

---

### Phase 6: Connect Main App to Microservice (Week 3)

#### 6.1 Update Design-Rite v3 Environment

**File: `.env.local` in design-rite-v3**
```bash
# Add microservice URL
NEXT_PUBLIC_SPATIAL_STUDIO_API_URL=https://spatial.design-rite.com
# or: https://spatial-studio-api.onrender.com
```

#### 6.2 Create API Client Wrapper

**File: `lib/spatial-studio-client.ts` in design-rite-v3**
```typescript
import { getSession } from 'next-auth/react'

const SPATIAL_API = process.env.NEXT_PUBLIC_SPATIAL_STUDIO_API_URL

export async function uploadFloorPlan(formData: FormData) {
  const session = await getSession()

  const res = await fetch(`${SPATIAL_API}/api/spatial-studio/upload-floorplan`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session?.user?.id}`
    },
    body: formData
  })

  return res.json()
}

export async function analyzeSite(projectId: string) {
  const session = await getSession()

  const res = await fetch(`${SPATIAL_API}/api/spatial-studio/analyze-site`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.user?.id}`
    },
    body: JSON.stringify({ projectId })
  })

  return res.json()
}

// Export all Spatial Studio API calls
```

#### 6.3 Update Admin Pages

**File: `app/admin/spatial-studio-dev/page.tsx` in design-rite-v3**
```typescript
'use client'

import { uploadFloorPlan, analyzeSite } from '@/lib/spatial-studio-client'

export default function SpatialStudioAdmin() {
  async function handleUpload(file: File) {
    const formData = new FormData()
    formData.append('floorplan', file)
    formData.append('projectName', 'Test Project')
    formData.append('customerId', 'test-customer')

    // Now calls microservice via client wrapper
    const result = await uploadFloorPlan(formData)
    console.log('Upload result:', result)
  }

  // ... rest of component
}
```

---

### Phase 7: MCP Server Integration (Week 4)

#### 7.1 Render MCP Server Setup

**Goal:** Connect Claude Desktop to Spatial Studio microservice (like Spec Harvester)

**File: `claude_desktop_config.json` (User's machine)**
```json
{
  "mcpServers": {
    "design-rite-spatial-studio": {
      "url": "https://spatial-studio-api.onrender.com/mcp",
      "apiKey": "${SPATIAL_STUDIO_MCP_KEY}",
      "description": "AI-powered spatial analysis and 3D modeling"
    },
    "design-rite-spec-harvester": {
      "url": "https://spec-harvester.onrender.com/mcp",
      "apiKey": "${SPEC_HARVESTER_MCP_KEY}",
      "description": "Manufacturer spec sheet extraction"
    }
  }
}
```

#### 7.2 Create MCP Endpoint in Spatial Studio

**File: `app/api/mcp/route.ts` in spatial-studio repo**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const MCP_API_KEY = process.env.MCP_API_KEY

export async function POST(request: NextRequest) {
  // Verify MCP API key
  const authHeader = request.headers.get('Authorization')
  if (authHeader !== `Bearer ${MCP_API_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { method, params } = await request.json()

  // Handle MCP commands
  switch (method) {
    case 'spatial.upload':
      return handleUpload(params)
    case 'spatial.analyze':
      return handleAnalyze(params)
    case 'spatial.listProjects':
      return handleListProjects(params)
    default:
      return NextResponse.json({ error: 'Unknown method' }, { status: 400 })
  }
}

async function handleUpload(params: any) {
  // Upload floor plan via MCP
  const { floorplanUrl, projectName } = params

  // Download file from URL
  const fileRes = await fetch(floorplanUrl)
  const fileBuffer = await fileRes.arrayBuffer()

  // Upload to Supabase storage
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const fileName = `mcp-upload-${Date.now()}.png`
  const { data, error } = await supabase.storage
    .from('spatial-floorplans')
    .upload(fileName, fileBuffer)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Create project record
  const { data: project } = await supabase
    .from('spatial_projects')
    .insert({
      project_name: projectName,
      floorplan_url: data.path,
      analysis_status: 'pending'
    })
    .select()
    .single()

  // Trigger async analysis
  await fetch(`${process.env.NEXTAUTH_URL}/api/spatial-studio/process-analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId: project.id })
  })

  return NextResponse.json({
    success: true,
    projectId: project.id,
    status: 'processing'
  })
}

async function handleAnalyze(params: any) {
  const { projectId } = params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  // Fetch project with analysis results
  const { data: project } = await supabase
    .from('spatial_projects')
    .select('*')
    .eq('id', projectId)
    .single()

  return NextResponse.json({
    success: true,
    project,
    status: project.analysis_status,
    model: project.threejs_model
  })
}

async function handleListProjects(params: any) {
  const { customerId } = params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const { data: projects } = await supabase
    .from('spatial_projects')
    .select('id, project_name, analysis_status, created_at')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })

  return NextResponse.json({
    success: true,
    projects
  })
}
```

#### 7.3 MCP Commands for Claude Desktop

**Available Commands:**
```bash
# Upload floor plan from Claude Desktop
spatial.upload --floorplanUrl "https://example.com/plan.png" --projectName "Office Building"

# Check analysis status
spatial.analyze --projectId "uuid-123"

# List all projects for customer
spatial.listProjects --customerId "customer-456"
```

---

## 🔐 Authentication Flow (Cross-Service) - Supabase Auth

### How Users Access Spatial Studio Microservice

```
User Login Flow (Supabase Auth):
1. User logs into design-rite.com (main app)
2. Supabase Auth creates session with JWT token
3. Session stored in HTTP-only cookie (automatic)
4. User navigates to Spatial Studio feature
5. Main app frontend calls: spatial.design-rite.com/api/...
6. Browser sends Supabase session cookie automatically
7. Spatial Studio middleware verifies session via Supabase
8. User profile fetched from profiles + user_roles tables

Shared State:
✅ Same Supabase project across all services
✅ Same database (profiles, user_roles, activity_logs)
✅ Supabase Auth JWT valid for all microservices
✅ Single logout invalidates all sessions
✅ RLS policies enforce multi-tenant isolation
```

### Middleware Implementation (Supabase Auth)

**File: `middleware.ts` (Both repos)**
```typescript
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res })

  // Refresh session if needed
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check user role from user_roles table
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', session.user.id)
    .single()

  const userRole = roleData?.role || 'user'

  // Only allow admin-level users
  if (!['super_admin', 'admin', 'manager'].includes(userRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return res
}

export const config = {
  matcher: ['/api/spatial-studio/:path*']
}
```

### Helper Functions for API Routes

**File: `lib/supabase-admin-auth.ts` (Both repos)**
```typescript
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function getAdminUser() {
  const supabase = createRouteHandlerClient({ cookies })

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, company, subscription_tier, subscription_status')
    .eq('id', session.user.id)
    .single()

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', session.user.id)
    .single()

  return {
    id: session.user.id,
    email: session.user.email!,
    role: roleData?.role || 'user',
    fullName: profile?.full_name,
    company: profile?.company,
    subscriptionTier: profile?.subscription_tier,
    subscriptionStatus: profile?.subscription_status
  }
}

export async function requireAuth() {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return user
}

export async function requireRole(allowedRoles: string[]) {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return user
}
```

---

## 📊 Database Strategy (Shared Supabase)

### Single Supabase Instance for All Services

**Why Shared Database:**
- Cross-product queries (user activity, billing)
- Single source of truth for users
- Unified admin dashboard
- Cost efficiency (one Supabase project)

**How to Isolate Service Data:**

```sql
-- Every table has service_name column
CREATE TABLE spatial_projects (
  id UUID PRIMARY KEY,
  service_name VARCHAR(50) DEFAULT 'spatial-studio',
  customer_id VARCHAR(255),
  project_name TEXT,
  -- ...
);

-- RLS policies enforce isolation
CREATE POLICY "Service isolation"
ON spatial_projects
FOR ALL
USING (
  service_name = current_setting('app.service_name', true) OR
  auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role = 'super_admin'
  )
);

-- Each microservice sets its service name
-- In API route:
await supabase.rpc('set_config', {
  setting: 'app.service_name',
  value: 'spatial-studio',
  is_local: true
})
```

### Migration Strategy

```bash
# Run migrations from main design-rite-v3 repo
cd design-rite-v3/supabase/migrations

# New migration for service isolation
cat > 20251003_add_service_name.sql << EOF
-- Add service_name to all tables
ALTER TABLE spatial_projects ADD COLUMN IF NOT EXISTS service_name VARCHAR(50) DEFAULT 'spatial-studio';
ALTER TABLE spatial_annotations ADD COLUMN IF NOT EXISTS service_name VARCHAR(50) DEFAULT 'spatial-studio';
ALTER TABLE ai_analysis_debug ADD COLUMN IF NOT EXISTS service_name VARCHAR(50) DEFAULT 'spatial-studio';

-- Update existing rows
UPDATE spatial_projects SET service_name = 'spatial-studio' WHERE service_name IS NULL;
UPDATE spatial_annotations SET service_name = 'spatial-studio' WHERE service_name IS NULL;
UPDATE ai_analysis_debug SET service_name = 'spatial-studio' WHERE service_name IS NULL;

-- Indexes for performance
CREATE INDEX idx_spatial_projects_service ON spatial_projects(service_name);
CREATE INDEX idx_spatial_annotations_service ON spatial_annotations(service_name);
EOF

# Apply migration
supabase migration up
```

---

## 🧪 Testing Strategy

### Test Both Services Independently

**Spatial Studio Microservice Tests:**
```bash
# In design-rite-spatial-studio repo
cd design-rite-spatial-studio

# Run tests against microservice
TEST_BASE_URL=https://spatial-studio-api.onrender.com \
  npm test -- __tests__/api/spatial-studio.test.ts

# Expected: 22/22 tests passing
```

**Integration Tests (Main App + Microservice):**
```bash
# In design-rite-v3 repo
cd design-rite-v3

# Test main app calling microservice
TEST_BASE_URL=https://design-rite.com \
SPATIAL_API=https://spatial-studio-api.onrender.com \
  npm test -- __tests__/integration/spatial-studio-integration.test.ts
```

### New Integration Test File

**File: `__tests__/integration/spatial-studio-integration.test.ts`**
```typescript
import { getSession } from 'next-auth/react'
import { uploadFloorPlan } from '@/lib/spatial-studio-client'

describe('Spatial Studio Microservice Integration', () => {
  it('should upload floor plan via microservice', async () => {
    // Login to main app
    const session = await signIn('credentials', {
      email: 'test@example.com',
      password: 'test123'
    })

    expect(session).toBeTruthy()

    // Call microservice from main app
    const formData = new FormData()
    formData.append('floorplan', testFile)
    formData.append('projectName', 'Integration Test')
    formData.append('customerId', 'test-customer')

    const result = await uploadFloorPlan(formData)

    expect(result.success).toBe(true)
    expect(result.projectId).toBeTruthy()
  })

  it('should reject unauthenticated requests', async () => {
    // Don't login, try to call microservice directly
    const res = await fetch(
      `${process.env.SPATIAL_API}/api/spatial-studio/upload-floorplan`,
      {
        method: 'POST',
        body: formData
      }
    )

    expect(res.status).toBe(401) // Unauthorized
  })
})
```

---

## 📦 Deployment Checklist

### Pre-Launch Validation

- [ ] **Repository Setup**
  - [ ] New repo created: `design-rite-spatial-studio`
  - [ ] All API routes copied and tested
  - [ ] Dependencies installed (`package.json`)
  - [ ] Environment variables documented

- [ ] **Database Migration**
  - [ ] `service_name` column added to all tables
  - [ ] RLS policies updated for microservice access
  - [ ] Existing data backfilled with service names

- [ ] **Authentication**
  - [ ] Shared `NEXTAUTH_SECRET` configured
  - [ ] Middleware validates JWT tokens
  - [ ] Cross-service session tested
  - [ ] Logout invalidates all sessions

- [ ] **Render Deployment**
  - [ ] Web service created on Render
  - [ ] Environment variables set
  - [ ] Build successful
  - [ ] Health check endpoint responding

- [ ] **Main App Integration**
  - [ ] API client wrapper created (`spatial-studio-client.ts`)
  - [ ] Admin pages updated to call microservice
  - [ ] Error handling for microservice failures
  - [ ] Fallback UI if microservice down

- [ ] **Testing**
  - [ ] 22/22 Spatial Studio tests passing
  - [ ] Integration tests passing
  - [ ] Load testing (10+ concurrent uploads)
  - [ ] Authentication flow validated

- [ ] **Monitoring**
  - [ ] Render metrics dashboard reviewed
  - [ ] Error logging configured (Sentry/LogRocket)
  - [ ] OpenAI API usage tracking
  - [ ] Cost alerts set (Render + OpenAI)

- [ ] **Documentation**
  - [ ] README updated with microservice architecture
  - [ ] API documentation generated
  - [ ] MCP server usage documented
  - [ ] Troubleshooting guide created

---

## 💰 Cost Analysis

### Before Extraction (Monolith)

**Single Render Service:**
- Plan: Starter ($7/month) or Professional ($25/month)
- Memory: 512MB-2GB (shared across all features)
- OpenAI API: ~$50-200/month (mixed usage)

**Total: ~$32-225/month**

### After Extraction (Microservices)

**Design-Rite v3 (Main):**
- Render: Professional ($25/month) - 1GB memory
- Reduced OpenAI usage: ~$30/month (quotes only)

**Spatial Studio Microservice:**
- Render: Starter ($7/month) - 512MB memory
- Dedicated OpenAI: ~$100/month (AI analysis)

**Spec Harvester Microservice:**
- Render: Starter ($7/month) - 512MB memory
- OpenAI: ~$50/month (PDF extraction)

**Total: ~$219/month**

### Cost Benefits

✅ **Better Resource Allocation:**
- Main app not slowed by AI processing
- Independent scaling per service
- Pay for what each service uses

✅ **Usage Tracking:**
- See exact cost per product
- Identify optimization opportunities
- Invoice customers per service usage

✅ **Future Savings:**
- Scale only high-demand services
- Shut down unused services
- Negotiate bulk AI credits per service

---

## 🚀 Rollout Plan

### Week 1: Setup & Extraction
- [x] Create new Git repo
- [x] Copy API routes
- [ ] Update imports & dependencies
- [ ] Test endpoints locally

### Week 2: Database & Auth
- [ ] Add service isolation columns
- [ ] Update RLS policies
- [ ] Configure shared auth
- [ ] Test cross-service sessions

### Week 3: Deployment
- [ ] Deploy to Render
- [ ] Configure environment variables
- [ ] Test production endpoints
- [ ] Update main app to call microservice

### Week 4: MCP & Testing
- [ ] Create MCP endpoint
- [ ] Configure Claude Desktop
- [ ] Run integration tests
- [ ] Load testing & optimization

### Week 5: Monitoring & Docs
- [ ] Setup monitoring dashboards
- [ ] Write API documentation
- [ ] Create troubleshooting guide
- [ ] Train team on new architecture

---

## 📝 Success Criteria

### Technical Metrics

- [ ] Design-Rite v3 memory usage reduced by 30%+
- [ ] Spatial Studio API response times < 45 seconds (maintained)
- [ ] Zero downtime during extraction
- [ ] 100% test coverage maintained (22/22 tests)
- [ ] Authentication working across all services

### Business Metrics

- [ ] Independent deployment successful (no main app impact)
- [ ] Cost per service tracked separately
- [ ] Revenue attribution per product clear
- [ ] Customer experience unchanged or improved

### Future-Proofing

- [ ] Reusable microservice pattern established
- [ ] Documentation for extracting next product
- [ ] MCP server pattern replicated
- [ ] White-label capability enabled

---

## 🔄 Replication Pattern for Future Products

### Template for Extracting Any Product

1. **Create new repo:** `design-rite-{product-name}`
2. **Copy relevant code:** API routes + components
3. **Add service isolation:** Database columns + RLS
4. **Configure shared auth:** Same NEXTAUTH_SECRET
5. **Deploy to Render:** Separate web service
6. **Create MCP endpoint:** For Claude Desktop integration
7. **Update main app:** Call microservice via client wrapper
8. **Test & monitor:** Independent metrics per service

### Products Ready for Extraction

**Next Candidates:**
1. ✅ **Spec Harvester** (already done)
2. 🔄 **Spatial Studio** (in progress)
3. 📋 **AI Assessment Tool** (future)
4. 📊 **Quote Generator** (future)
5. 🤖 **AI Chatbot Assistant** (future)

---

## 📞 Support & Troubleshooting

### Common Issues

**Issue: "Unauthorized" error when calling microservice**
- ✅ Check `NEXTAUTH_SECRET` matches across services
- ✅ Verify JWT token in Authorization header
- ✅ Check middleware configuration

**Issue: "Database connection failed"**
- ✅ Verify Supabase URL and keys are same
- ✅ Check RLS policies allow service access
- ✅ Confirm `service_name` column exists

**Issue: "OpenAI API rate limit"**
- ✅ Use separate API key per service
- ✅ Implement retry logic with backoff
- ✅ Check daily/monthly quotas

### Getting Help

**Documentation:**
- [Spatial Studio Roadmap](./SPATIAL_STUDIO_ROADMAP.md)
- [Spatial Studio Test Plan](./docs/SPATIAL_STUDIO_TEST_PLAN.md)
- [Spec Harvester Architecture](../lowvolt-spec-harvester/README.md)

**Team Contacts:**
- Architecture questions: Design-Rite Engineering
- Deployment issues: DevOps team
- API questions: Check Render logs first

---

## 🎉 Benefits Summary

### For Development Team

✅ **Faster Iteration:**
- Deploy Spatial Studio updates independently
- No risk to main app stability
- Clear code ownership

✅ **Better Testing:**
- Isolated test suites per service
- Easier to reproduce bugs
- Independent CI/CD pipelines

✅ **Clearer Architecture:**
- Microservice boundaries force good design
- Shared concerns (auth, DB) explicit
- Reusable patterns across products

### For Business

✅ **Cost Transparency:**
- Track revenue per product
- Optimize spending per service
- Invoice customers accurately

✅ **Scalability:**
- Scale AI workloads independently
- Add new products without main app impact
- Prepare for acquisitions or spin-offs

✅ **Market Flexibility:**
- White-label individual products
- Partnership opportunities per service
- Separate pricing tiers

---

## 📅 Timeline Summary

| Week | Milestone | Status |
|------|-----------|--------|
| 1 | Repository setup & API extraction | 🔄 In Progress |
| 2 | Database isolation & auth | ⏳ Pending |
| 3 | Render deployment | ⏳ Pending |
| 4 | MCP integration | ⏳ Pending |
| 5 | Testing & documentation | ⏳ Pending |

**Target Launch Date:** End of Week 5

---

**Document Owner:** Design-Rite Engineering Team
**Last Updated:** October 3, 2025
**Next Review:** After microservice deployment
