# Spatial Studio Microservice - Quick Reference Card

**Last Updated:** October 3, 2025

---

## 📍 Locations

```
Microservice:  C:\Users\dkozi\Projects\Design-Rite\v3\design-rite-v3.1\design-rite-spatial-studio\
Main App (v3): C:\Users\dkozi\Projects\Design-Rite\v3\design-rite-v3.1\design-rite-v3\
Documentation: C:\Users\dkozi\OneDrive\Design-Rite\SpatialStudio DEV\
```

---

## 🚀 Quick Commands

### Start Microservice
```bash
cd C:\Users\dkozi\Projects\Design-Rite\v3\design-rite-v3.1\design-rite-spatial-studio
npm run dev
# Opens on: http://localhost:3020
```

### Run Tests
```bash
cd design-rite-spatial-studio
TEST_BASE_URL=http://localhost:3020 npm test
# Expected: 22/22 passing
```

### Health Check
```bash
curl http://localhost:3020/api/upload-floorplan
```

---

## 🔑 Key Environment Variables

```bash
# Same as Design-Rite v3:
NEXT_PUBLIC_SUPABASE_URL=https://aeorianxnxpxveoxzhov.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGci...qKUYyhUVZZpKKHXH-6-WCedEhlSbXIhuwk52ofXQqpk
OPENAI_API_KEY=sk-proj-eNFCtLC6...77UJlmsD6CgA

# Unique to Spatial Studio:
NEXT_PUBLIC_SERVICE_NAME=spatial-studio
NEXT_PUBLIC_MAIN_APP_URL=http://localhost:3010
```

---

## 📊 What Was Extracted

✅ **17 Files Total:**
- 5 API routes (`/api/add-annotation`, `/analyze-site`, `/upload-floorplan`, etc.)
- 2 UI components (FloorPlanViewer3D, wrapper)
- 2 pages (main page, projects page)
- 1 database schema (spatial_studio_tables.sql)
- 1 test suite (22 tests)
- 3 auth helpers (supabase.ts, api-auth.ts, supabase-admin-auth.ts)
- 1 middleware (auth protection)
- 2 config files (package.json, tsconfig.json)

---

## 🔐 Authentication

**Shared with v3:**
- Same Supabase project
- Same JWT sessions
- Same user_roles table

**Access Required:**
- Manager+ roles only (super_admin, admin, manager)
- Protected by middleware.ts

---

## 🛠️ Troubleshooting

### Server Not Starting
```bash
# Check if port 3020 is in use
netstat -ano | findstr :3020

# Kill process if needed
taskkill /PID <process_id> /F

# Restart
npm run dev
```

### Import Errors
```bash
# All imports should use @/* alias:
import { getSupabaseAdmin } from '@/lib/supabase'
import FloorPlanViewer3D from '@/components/FloorPlanViewer3D'
```

### Database Issues
```bash
# Verify schema exists in Supabase
# Go to: Supabase Dashboard → Table Editor
# Look for: spatial_projects, site_annotations, ai_device_suggestions
```

---

## 📚 Full Documentation

- **Complete Guide:** `EXTRACTION_IMPLEMENTATION_GUIDE.md` (19,000 words)
- **Fast Track:** `QUICK_START.md` (7,000 words)
- **This Session:** `SESSION_SUMMARY.md` (Complete context)
- **Product Vision:** `SPATIAL_STUDIO_ROADMAP.md`

---

## ✅ Status

- [x] Extraction complete
- [x] Server running (port 3020)
- [x] All tests passing (22/22)
- [x] v3 redirect configured
- [x] Documentation complete
- [ ] GitHub repo created (next step)
- [ ] Production deployment (future)

---

## 🎯 Next Actions

1. **Test Upload:** Go to http://localhost:3020 and upload a floor plan
2. **Create GitHub Repo:** `design-rite-spatial-studio`
3. **Deploy to Render:** When ready for production

---

**Questions?** See `SESSION_SUMMARY.md` for complete details.
