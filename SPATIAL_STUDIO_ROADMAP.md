# Spatial Studio - Product Roadmap & Vision

**Last Updated:** January 2025
**Vision Owner:** Design-Rite
**Strategic Goal:** Build the foundation for Integrator Plus+ lifecycle platform within Design-Rite v3, validate with investors, then extract to standalone SaaS product.

---

## Executive Vision

**Spatial Studio** is the AI-powered spatial intelligence engine that will power **Integrator Plus+**, a complete project lifecycle platform for security integrators. The platform enables field engineers to conduct site walks with wearable cameras (smart glasses, iPhones, GoPros), capture customer requirements through natural conversation, and instantly generate professional security proposals with equipment recommendations, 3D visualizations, and accurate labor estimates.

### The Customer Story

> "An engineer walks into a facility with an iPad Pro and smart glasses. As they walk with the customer through the front entrance, the customer explains: *'We need facial recognition here to identify visitors and employees, and we want alerts when unknown people enter.'*
>
> The engineer's audio is captured and transcribed. The iPad's LiDAR scans the space. The camera records the existing infrastructure.
>
> Back at the office, they upload the walkthrough footage to Spatial Studio. Within minutes, they have:
> - A 3D model of the space with accurate measurements
> - Camera placements optimized for facial recognition coverage
> - A complete BOM including cameras, access control, video intercom, and network infrastructure
> - Labor estimates for installation
> - A professional proposal ready to send
>
> What used to take 8 hours of manual takeoff and design now takes 15 minutes."

---

## Strategic Phasing

### Phase 1: MVP in Design-Rite v3 (Current - Q1 2025)
**Goal:** Prove technical capability, attract investors, validate market demand

**Why v3 First:**
- Faster iteration with existing infrastructure
- Use existing admin dashboard, auth, and deployment
- One Render instance, one domain, one API key = lower costs
- Perfect working demo for investor pitches
- Validate product-market fit before committing to standalone platform

**When to Extract:**
- After securing seed funding
- After 10+ beta integrator customers
- When video/LiDAR processing requires different infrastructure
- When white-labeling opportunities emerge

### Phase 2: Standalone Platform (Q2-Q3 2025)
**Goal:** Scale Integrator Plus+ as independent SaaS offering

**Trigger Events:**
- Investor funding secured ($500K+)
- 25+ active integrator subscriptions
- Video processing infrastructure requirements exceed v3 capacity
- Partnership/white-label opportunities require product separation

---

## Product Roadmap

### ✅ Phase 1.0: Foundation (Completed - Dec 2024)
**Status:** Live in v3 at `/admin/spatial-studio-dev`

- [x] Floor plan upload (PNG/JPG/PDF)
- [x] GPT-4 Vision architectural analysis
- [x] Wall, door, window detection
- [x] Asynchronous processing architecture
- [x] Supabase storage and database integration
- [x] Basic 3D visualization with Three.js
- [x] Analytics dashboard with success metrics
- [x] Debug logging for AI analysis

**Technical Debt Fixed:**
- [x] Production bucket creation via SQL (no runtime auto-create)
- [x] OpenAI retry logic with exponential backoff
- [x] File validation (size limits, type restrictions)
- [x] Environment variable fallback for production URLs

**Testing Infrastructure (Completed - Oct 2025):**
- [x] Comprehensive API test suite (22 tests, 100% passing)
- [x] Phase 1 critical path validation
- [x] Phase 2 error handling coverage
- [x] Phase 3 integration & performance tests
- [x] Async processing workflow verification
- [x] Concurrent upload handling validated
- [x] Test execution time: 76.7 seconds
- [x] **Production-ready status confirmed** ✅

---

### 🔄 Phase 1.1: Investor Demo Polish (In Progress - Jan 2025)
**Goal:** Create compelling demo for pitch meetings

**Priority Features:**

#### 1. Real-Time Progress Meter ⏱️
**Business Value:** Shows AI is actually working, builds confidence in technology

**Technical Requirements:**
- Server-Sent Events (SSE) or polling for live updates
- Track actual stages: Upload → Vision Analysis → Parsing → 3D Generation
- Display real OpenAI API response times (not simulated)
- Show detected features incrementally as they're parsed
- File size-based upload ETA calculations

**UI Mockup:**
```
🏗️ Processing Your Floor Plan
━━━━━━━━━━━━━━━━━━━ 67%

✅ Upload Complete (2.4 MB in 1.8s)
🔍 AI Vision Analysis: 8.3s elapsed
📐 Parsing Architectural Features...

Live Detection:
• 14 walls detected
• 6 door openings identified
• 3 windows found
• 3 rooms mapped

⏱️ Estimated completion: 4 seconds
```

**Files to Create:**
- `app/api/spatial-studio/progress/route.ts` - SSE endpoint for live updates
- `app/components/spatial-studio/ProgressMeter.tsx` - Visual progress UI
- Update `process-analysis/route.ts` to emit progress events

---

#### 2. Enhancement Assistant 🤖
**Business Value:** The "wow factor" - conversational AI that refines designs

**Core Capabilities:**
- Chat interface for spatial refinements
- "Add 2 cameras to parking lot" → AI adds equipment + updates BOM
- "Customer wants facial recognition" → AI recommends appropriate cameras
- "Reduce cost by $2,000" → AI suggests alternatives
- Display reasoning for each recommendation

**Technical Architecture:**
- Dedicated OpenAI Assistant with spatial intelligence instructions
- Function calling for: `add_camera()`, `adjust_coverage()`, `optimize_costs()`
- Load current 3D model as context for each chat message
- Return updated model + equipment changes + cost impact

**UI Integration:**
```
┌─────────────────────┬──────────────────────┐
│  3D Floor Plan      │  Enhancement Chat    │
│  [Interactive View] │  💬 AI Assistant     │
│                     │                      │
│  [14 walls]         │  You: "Add cameras   │
│  [6 doors]          │       to all entry   │
│  [3 windows]        │       points"        │
│                     │                      │
│  🎥 Show Cameras    │  AI: "Added 3        │
│  📊 Generate Quote  │      cameras:        │
│                     │      • Front: 4MP... │
│                     │      Cost: +$1,800"  │
└─────────────────────┴──────────────────────┘
```

**Files to Create:**
- `app/api/spatial-studio/enhance/route.ts` - Enhancement assistant endpoint
- `app/components/spatial-studio/EnhancementChat.tsx` - Chat UI component
- `lib/spatial-enhancement-assistant.ts` - OpenAI Assistant configuration
- Database: Add `equipment_recommendations JSONB` column

**OpenAI Assistant Configuration:**
```typescript
const spatialAssistant = {
  name: "Spatial Enhancement Assistant",
  instructions: `You are an expert security systems designer. You help engineers
  refine spatial designs by adding cameras, optimizing coverage, and ensuring
  code compliance. Analyze the current 3D model and customer requirements to
  provide specific equipment recommendations with placement coordinates.`,

  tools: [
    {
      type: "function",
      function: {
        name: "add_camera_placement",
        description: "Add a camera to the spatial model with specific coordinates",
        parameters: {
          type: "object",
          properties: {
            camera_type: { type: "string", enum: ["dome", "bullet", "turret", "PTZ"] },
            position: { type: "array", items: { type: "number" } },
            coverage_radius: { type: "number" },
            reasoning: { type: "string" }
          }
        }
      }
    }
  ]
}
```

---

#### 3. Visual Polish & Professional UI 🎨
**Business Value:** Looks production-ready, not prototype

**Improvements:**
- Better 3D rendering (textured walls, realistic lighting)
- Color-coded legend (walls=gray, doors=brown, windows=blue, cameras=red)
- Smooth camera controls with zoom/pan gestures
- Display square footage and room dimensions
- Professional color scheme matching Design-Rite branding

**3D Model Enhancements:**
- Add floor texture (concrete/tile)
- Wall thickness and height variation
- Door swing direction indicators
- Window placement at realistic heights
- Camera field-of-view visualization (colored cones)

**Files to Update:**
- `app/components/spatial-studio/FloorPlanViewer3D.tsx` - Enhanced rendering
- Add materials library for realistic textures
- Implement raycasting for click interactions

---

#### 4. Equipment Quote Generation 💰
**Business Value:** Bridge to existing quote system, show ROI

**Workflow:**
1. Analyze detected features → Recommend equipment
2. Calculate quantities: cameras per door, cable runs, switch ports
3. Pull pricing from existing Supabase products database
4. Generate BOM with labor estimates
5. Export to PDF or push to AI Assessment for refinement

**Equipment Logic:**
- Entry doors → Facial recognition camera + access control
- Windows (ground floor) → Security cameras with IR
- Parking lot → License plate capture cameras
- Per 8 cameras → 1x PoE switch + network infrastructure
- Labor: Camera installation (2hr each), cable runs (calculated from distances)

**Files to Create:**
- `lib/spatial-to-bom-generator.ts` - Convert 3D model to equipment list
- `app/api/spatial-studio/generate-quote/route.ts` - Quote generation endpoint
- Integration with existing `products` table for pricing

---

#### 5. Project Revision History 📝
**Business Value:** Professional workflow, tracks customer changes

**Database Schema:**
```sql
CREATE TABLE spatial_project_revisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES spatial_projects(id),
  revision_number INT NOT NULL,
  changes_summary TEXT,
  threejs_model_snapshot JSONB,
  equipment_bom_snapshot JSONB,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Features:**
- Save snapshot on each enhancement
- Compare revisions side-by-side (v1 vs v2)
- Rollback to previous version
- Export revision history for SOW verification

---

### 📅 Phase 1.2: Investor Pitch Assets (Late Jan 2025)
**Goal:** Create compelling materials for fundraising

#### Demo Project Library
- Pre-loaded commercial office building (4,200 sq ft)
- Pre-loaded retail store with parking lot
- Pre-loaded school campus (multi-building)
- Each with full analysis results and equipment recommendations

#### Analytics Dashboard Enhancements
- "X projects analyzed in last 30 days"
- "Y hours saved vs manual takeoff" (estimated at 6 hours per project)
- "Z% accuracy vs human estimator" (based on beta feedback)
- Average project value generated
- Conversion rate (analysis → quote → sale)

#### Marketing Collateral
- Demo video (2-3 minutes): Upload → Analysis → Enhancement → Quote
- Screenshot library for pitch deck
- ROI calculator: "Save 40 hours per month at $75/hr = $36,000/year"
- Customer testimonial quotes (beta users)

---

### 🚀 Phase 2.0: Multimodal Intelligence (Q2 2025)
**Goal:** Video + audio + LiDAR site walk analysis

**Trigger:** Investor funding secured OR 10+ beta customers validated

#### Video Upload & Processing
**Capability:** Upload GoPro/iPhone site walk video, extract insights

**Technical Stack:**
- FFmpeg for keyframe extraction (every 2 seconds)
- Batch frames to GPT-4 Vision API
- Temporal analysis (track movement through space)
- Detect existing equipment (cameras, access panels, network racks)

**Files to Create:**
- `app/api/spatial-studio/upload-video/route.ts`
- `lib/video-processor.ts` - FFmpeg integration
- `lib/frame-analyzer.ts` - Batch Vision API calls

#### Audio Transcription & Requirement Extraction
**Capability:** Capture customer conversation, extract security requirements

**Technical Stack:**
- OpenAI Whisper API for transcription
- GPT-4 with function calling to parse requirements
- Extract: security objectives, compliance needs, budget constraints

**Example:**
```
Audio: "We need facial recognition at the front entrance to identify
        visitors and employees. We also need alerts when unknown people
        enter. Budget is around $15,000."

Extracted Requirements:
- Security Objective: Visitor identification, employee recognition
- Technology: Facial recognition camera system
- Compliance: May require data privacy (GDPR/CCPA)
- Budget Constraint: $15,000 max
- Recommended Equipment:
  • 1x 8MP facial recognition camera
  • 1x access control panel
  • 1x video intercom
  • Network infrastructure
```

**Files to Create:**
- `app/api/spatial-studio/process-audio/route.ts`
- `lib/requirement-extractor.ts` - GPT-4 requirement parsing
- Database: Add `customer_requirements TEXT[]`, `audio_transcript TEXT`

#### LiDAR Point Cloud Processing
**Capability:** iPhone/iPad LiDAR scans for precise measurements

**Technical Stack:**
- Parse .usdz or .ply point cloud files
- Convert to 3D mesh for Three.js rendering
- Extract precise room dimensions
- Identify ceiling height, obstacles, mounting surfaces

**Files to Create:**
- `lib/lidar-processor.ts` - Point cloud parsing
- Integration with Three.js for mesh rendering

#### Multi-Source Data Fusion
**Capability:** Combine video + audio + LiDAR + floor plan for comprehensive analysis

**Workflow:**
1. Upload package (ZIP): video.mp4 + audio.m4a + floorplan.pdf + lidar.usdz
2. Process each data source in parallel
3. Merge insights:
   - LiDAR: Precise dimensions
   - Video: Equipment identification, spatial layout
   - Audio: Customer requirements
   - Floor plan: Architectural context
4. Generate unified 3D model with equipment recommendations

---

### 🏢 Phase 3.0: Integrator Plus+ Lifecycle (Q3 2025)
**Goal:** Full project lifecycle from discovery to warranty

**Trigger:** 25+ active integrator subscriptions OR white-label partnership

#### Wearable Technology Integration
- Meta Ray-Ban smart glasses API
- RealWear HMT-1 integration
- Vuzix Blade AR glasses support
- iPhone Pro continuous capture mode

#### Installation Progress Tracking
- Weekly site walk uploads during installation
- AI verifies BOM items installed correctly
- Automated punch list generation (missing items, incorrect placement)
- Photo evidence library with timestamps

#### Digital Sign-Off Workflow
- Final walkthrough video with customer commentary
- AI-generated as-built documentation
- Digital signature capture
- Deliverables package export (white-labeled PDF)

#### Warranty & Service Management
- Historical project data for service calls
- Video library of original installation
- Expansion planning with existing spatial data
- Service ticket integration

---

### 🌐 Phase 4.0: Standalone Platform & White-Label (Q4 2025)
**Goal:** Extract from v3, scale as independent SaaS, enable partnerships

**New Repository:**
- `design-rite-spatial-studio` or `design-rite-integrator-plus`
- Separate Render web service
- Isolated Supabase project (or keep shared with cross-platform auth)
- Custom domain: `spatial.design-rite.com` or `integrator.design-rite.com`

**White-Label Capabilities:**
- Custom branding (logo, colors, domain)
- Partner-specific API keys
- Isolated data tenancy
- Usage-based pricing tiers

**Enterprise Features:**
- SSO integration (Okta, Azure AD)
- Advanced analytics dashboard
- Multi-team collaboration
- API access for third-party integrations

---

## Technical Architecture

### Current Stack (Phase 1 in v3)
```
Frontend:  Next.js 14 (App Router), React, TypeScript
3D Engine: Three.js, React-Three-Fiber, React-Three-Drei
AI:        OpenAI GPT-4 Vision, GPT-4 with function calling
Database:  Supabase (PostgreSQL + Storage)
Auth:      Next-Auth.js with Supabase backend
Hosting:   Render (single web service)
Domain:    design-rite.com/admin/spatial-studio-dev
```

### Future Stack (Phase 4 standalone)
```
Frontend:  Next.js 14 (same)
3D Engine: Three.js + Babylon.js (for advanced AR features)
AI:        OpenAI GPT-4 Vision, Whisper API, custom fine-tuned models
Video:     FFmpeg, cloud transcoding (AWS MediaConvert or Cloudflare Stream)
Database:  Supabase (separate project) + PostgreSQL + S3 for media
Auth:      Next-Auth.js or Auth0 (for enterprise SSO)
Hosting:   Render or AWS (if GPU processing needed)
Domain:    spatial.design-rite.com
CDN:       Cloudflare for video delivery
```

### Data Model Evolution

#### Phase 1 (Current):
```typescript
interface SpatialProject {
  id: string;
  project_name: string;
  floorplan_url: string;
  threejs_model: {
    walls: Wall[];
    doors: Door[];
    windows: Window[];
    rooms: Room[];
    height: number;
  };
  analysis_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: timestamp;
}
```

#### Phase 2 (Multimodal):
```typescript
interface SpatialProject {
  // ... existing fields
  video_walkthrough_url?: string;
  audio_transcript?: string;
  lidar_data?: PointCloud;
  customer_requirements: string[];
  security_objectives: string[];
  equipment_recommendations: Equipment[];
  labor_breakdown: LaborEstimate;
}
```

#### Phase 3 (Lifecycle):
```typescript
interface SpatialProject {
  // ... existing fields
  lifecycle_stage: 'discovery' | 'sow_verified' | 'in_progress' | 'completed' | 'warranty';
  install_progress_logs: ProgressLog[];
  final_walkthrough_video?: string;
  client_signoff_at?: timestamp;
  warranty_expiration?: date;
  service_tickets: ServiceTicket[];
}
```

---

## Business Model

### Phase 1: Included in Design-Rite Platform
- Free for existing Design-Rite users (attract investors)
- Usage tracked for analytics (prove demand)
- Beta feedback collection for product refinement

### Phase 2-3: Integrator Plus+ Subscription Tiers

**Starter Tier - $199/month**
- 10 spatial projects per month
- Floor plan + basic video analysis
- Standard equipment recommendations
- Email support

**Professional Tier - $499/month**
- Unlimited spatial projects
- Full multimodal analysis (video + audio + LiDAR)
- Advanced AI enhancement assistant
- Installation progress tracking
- Priority support
- 1 wearable camera kit included

**Enterprise Tier - $1,299/month**
- Everything in Professional
- Multi-team collaboration (up to 10 users)
- White-labeled deliverables
- Custom branding
- API access
- Dedicated account manager
- 3 wearable camera kits included

**Add-Ons:**
- Additional camera kits: $99/month each
- Remote QA service: $50/project
- Custom integrations: Custom pricing

### Phase 4: White-Label Partnerships
- OEM licensing to distributors
- Usage-based revenue share (per analysis)
- Custom feature development contracts

---

## Success Metrics

### Phase 1 (Investor Demo)
- [x] 3D model renders in <3 seconds after analysis
- [x] API endpoints fully tested and validated (22/22 tests passing)
- [x] Asynchronous processing architecture production-ready
- [x] Error handling comprehensive (file validation, API failures)
- [x] Performance benchmarks met (AI analysis < 45 seconds)
- [ ] 95%+ accuracy on wall/door/window detection (vs manual review)
- [ ] 10 beta users provide positive feedback
- [ ] Average 6 hours saved vs manual takeoff
- [ ] Demo video views: 500+ on LinkedIn
- [ ] Investor meetings booked: 5+

### Phase 2 (Multimodal)
- [ ] Video processing completes in <60 seconds per minute of footage
- [ ] Audio transcription 95%+ word accuracy
- [ ] Requirement extraction captures 90%+ of customer needs
- [ ] 50 active integrator users
- [ ] $25K MRR (monthly recurring revenue)

### Phase 3 (Lifecycle)
- [ ] 100 active projects in progress tracking
- [ ] 90% customer satisfaction (CSAT score)
- [ ] 80% renewal rate on annual subscriptions
- [ ] $100K MRR
- [ ] 3 white-label partnership agreements signed

### Phase 4 (Standalone)
- [ ] 500 active integrator subscriptions
- [ ] $250K MRR
- [ ] Series A funding raised ($2M+)
- [ ] 10 enterprise customers (>$1K/month each)

---

## Competitive Advantage

### What Makes Spatial Studio Unique:

1. **AI-First Approach**
   - Competitors use manual CAD tools
   - We use GPT-4 Vision for instant analysis
   - Conversational enhancement vs. complex software UI

2. **Multimodal Intelligence**
   - Competitors require floor plans
   - We accept video, audio, LiDAR, photos, drawings
   - Natural site walk captures everything

3. **End-to-End Lifecycle**
   - Competitors focus on design only
   - We cover discovery → install → sign-off → warranty
   - Single platform for entire project

4. **Security Industry Expertise**
   - Built by security integrators, for integrators
   - Pre-loaded equipment database with real pricing
   - Code compliance built-in (FERPA, HIPAA, CJIS)

5. **Wearable Technology**
   - Hands-free documentation during site walks
   - Real-time capture while talking to customer
   - Professional appearance (vs. clipboard and camera)

---

## Risk Mitigation

### Technical Risks

**Risk:** OpenAI API costs become prohibitive at scale
**Mitigation:**
- Fine-tune custom models for common tasks (cheaper inference)
- Cache common analysis patterns
- Tier pricing to pass costs to high-volume users

**Risk:** Video processing requires GPU infrastructure
**Mitigation:**
- Start with cloud transcoding services (AWS MediaConvert)
- Evaluate GPU instances only when needed (>100 videos/day)
- Use serverless functions for batch processing

**Risk:** 3D rendering performance on mobile devices
**Mitigation:**
- Progressive loading (low-poly → high-poly)
- Level-of-detail (LOD) based on device capability
- Fallback to 2D floor plan on low-end devices

### Business Risks

**Risk:** Integrators resistant to new technology
**Mitigation:**
- Generous free trial (30 days, unlimited projects)
- White-glove onboarding with 1-on-1 training
- ROI calculator showing time/money saved
- Beta program with early adopters as champions

**Risk:** Competitors copy the approach
**Mitigation:**
- Patent AI-powered spatial analysis workflow (provisional filed)
- Build brand loyalty through superior UX
- Lock in customers with lifecycle features (switching cost)

**Risk:** Market not ready for wearable tech
**Mitigation:**
- Support traditional methods (iPad, iPhone, laptop)
- Wearables optional, not required
- Partner with existing workflows (System Surveyor, Bluebeam)

---

## Investment Ask (Future)

### Seed Round Target: $500K - $1M
**Use of Funds:**
- Engineering team expansion (2 full-stack, 1 ML engineer): $400K
- Wearable camera hardware (50 kits for beta program): $50K
- Cloud infrastructure (video processing, storage): $75K
- Marketing & sales (beta customer acquisition): $100K
- Legal (patents, contracts, compliance): $50K
- Runway: 12-18 months to Series A

### Series A Target: $2M - $5M (2026)
**Use of Funds:**
- Scale engineering team (10+ engineers)
- Enterprise sales team (5 reps)
- White-label partnership development
- International expansion
- Advanced AI R&D (custom models)

---

## Timeline Summary

| Phase | Timeframe | Key Deliverable | Success Metric |
|-------|-----------|-----------------|----------------|
| 1.1 | Jan 2025 | Investor demo (progress meter, enhancement assistant) | 5+ investor meetings |
| 1.2 | Feb 2025 | Beta program launch (10 integrators) | 10 active users, positive feedback |
| 2.0 | Q2 2025 | Multimodal analysis (video + audio + LiDAR) | 50 active users, $25K MRR |
| 3.0 | Q3 2025 | Full lifecycle platform (install tracking, sign-off) | 100 active projects, $100K MRR |
| 4.0 | Q4 2025 | Standalone platform, white-label ready | 500 users, $250K MRR, Series A |

---

## Appendix: Related Documents

- [Design-Rite v3 Master Overview](../CLAUDE.md) - Main platform documentation
- [Integrator Plus+ Program Summary](C:\Users\dkozi\OneDrive\New folder\Design-Rite_Integrator_Plus_Master_Overview 1.pdf) - Business program details
- [Admin Auth Setup](./ADMIN_AUTH_SETUP.md) - Authentication system
- [Calendly Demo Dashboard](./CALENDLY_SETUP.md) - Lead capture integration

---

## Document History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-01-25 | 1.0 | Initial roadmap created | Claude Code |
| 2025-01-25 | 1.1 | Added phasing strategy (v3 first, then standalone) | Claude Code |
| 2025-10-03 | 1.2 | Added comprehensive API testing completion (22/22 tests passing) | Claude Code |
| 2025-10-03 | 1.2 | Updated Phase 1.0 with testing infrastructure validation | Claude Code |
| 2025-10-03 | 1.2 | Updated success metrics with completed technical milestones | Claude Code |

---

**Next Review Date:** After investor demo completion (Late January 2025)

**Document Owner:** Design-Rite Product Team
**Strategic Advisor:** Claude Code (AI Development Partner)
