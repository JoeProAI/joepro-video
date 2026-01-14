# JoePro Video Service

Async video generation service using Luma Ray-2, GPT-Image, and Gemini. Designed for long-running video generation jobs that exceed Vercel's timeout limits.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  JoePro Main    │────▶│  joepro-video    │────▶│  Firebase       │
│  (Vercel)       │     │  (Railway)       │     │  (Job Store)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                       │
        │                       ▼
        │               ┌──────────────────┐
        │               │  External APIs   │
        │               │  - Luma Ray-2    │
        │               │  - OpenAI GPT    │
        │               │  - Gemini        │
        │               └──────────────────┘
        │
        ▼
┌─────────────────┐
│  Poll Status    │
│  /api/status/id │
└─────────────────┘
```

## API Endpoints

### Create Job
```bash
POST /api/jobs/create
{
  "prompt": "A cat riding a dragon through a magical forest",
  "duration": 30,
  "style": "hyper realistic, photorealistic",
  "userId": "user123",
  "sessionId": "stripe_session_id"
}

Response:
{
  "jobId": "uuid",
  "status": "queued",
  "pollUrl": "/api/status/uuid"
}
```

### Check Status
```bash
GET /api/status/:jobId

Response:
{
  "id": "uuid",
  "status": "processing",
  "progress": {
    "completed": 2,
    "total": 4,
    "percentage": 50
  },
  "segments": [...]
}
```

### Get Result
```bash
GET /api/status/:jobId/result

Response:
{
  "id": "uuid",
  "segments": [
    { "videoUrl": "...", "thumbnailUrl": "..." },
    ...
  ]
}
```

## Environment Variables

```env
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...
LUMA_API_KEY=luma-...
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="..."
PORT=3001
ALLOWED_ORIGINS=https://joepro.ai,https://neuralsalvage.com
```

## Development

```bash
npm install
npm run dev
```

## Deployment (Railway)

1. Connect this repo to Railway
2. Set environment variables
3. Deploy

Railway will automatically:
- Detect the Dockerfile
- Build and deploy
- Provide a public URL

## Why Not Vercel?

Vercel has a 300-second (5 min) timeout for serverless functions. Video generation with Luma Ray-2 can take 3-5 minutes per segment. A 30-second video (4 segments) can take 15-20 minutes total.

This service runs on Railway with no timeout limits, processing jobs in the background while clients poll for status.
