# Spatial Studio - Microservice

AI-powered floor plan intelligence extracted from Design-Rite v3 monolith.

## Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local
# Edit .env.local with your credentials

# Run development server
npm run dev
# Server runs on http://localhost:3020

# Run tests
npm test
```

## Architecture

- **Main App**: Design-Rite v3 (`localhost:3010`)
- **This Microservice**: Spatial Studio (`localhost:3020`)
- **Shared**: Supabase Auth + Database

## API Endpoints

- `POST /api/upload-floorplan` - Upload floor plan file
- `GET /api/upload-floorplan?projectId=xxx` - Check upload status
- `POST /api/process-analysis` - Background AI analysis worker
- `POST /api/analyze-site` - Camera placement recommendations
- `POST /api/add-annotation` - Add GPS annotations
- `GET /api/analytics` - Performance metrics

## Documentation

- [Product Roadmap](./SPATIAL_STUDIO_ROADMAP.md)
- [Test Plan](./docs/SPATIAL_STUDIO_TEST_PLAN.md)
- [Extraction Guide](./docs/SPATIAL_STUDIO_EXTRACTION_PLAN.md)
