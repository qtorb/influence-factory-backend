# Influence Factory - Backend

Multi-tenant SaaS platform for AI-powered content generation with WordPress integration.

## Architecture

- **Framework:** Express.js (TypeScript)
- **Database:** PostgreSQL + Prisma ORM + pgvector
- **Job Queue:** Bull + Redis (async processing)
- **AI Models:** Anthropic Claude, OpenAI GPT
- **Security:** JWT + Row Level Security (RLS)

## Features

✅ Multi-tenant architecture with Row Level Security
✅ AI-powered content generation (Prompts por Bloques)
✅ GEO (Generative Engine Optimization) with authority injection
✅ Asynchronous job queue with exponential backoff retry
✅ Multi-site WordPress publishing with credential encryption
✅ Semantic duplicate prevention (pgvector embeddings)
✅ Real-time metrics and monitoring

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ (with pgvector)
- Redis 6+
- Claude API key
- OpenAI API key

### Setup

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your credentials

# Run migrations
npm run migrate

# Start development server
npm run dev
```

The API will be available at `http://localhost:3000`

### Production Build

```bash
npm run build
npm run migrate
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project details

### Content Generation
- `POST /api/posts` - Create post (trigger generation)
- `GET /api/posts` - List posts
- `POST /api/posts/:id/publish` - Publish to WordPress

### Queue Monitoring
- `GET /api/queue/metrics` - Real-time queue metrics
- `GET /api/health` - Health check endpoint

## Deployment

### Railway.app

1. Push code to GitHub
2. Create new Railway project
3. Add PostgreSQL service
4. Add Redis service
5. Connect backend repository
6. Set environment variables
7. Deploy

See `RAILWAY_DEPLOYMENT_GUIDE.docx` for detailed instructions.

## Testing

```bash
npm test
```

## 