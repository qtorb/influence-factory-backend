import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';
import { v4 as uuidv4 } from 'uuid';
import { validateSources, isValidSourceUrl } from './validators';

dotenv.config();
const prisma = new PrismaClient();
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('error', (err) => console.error('Redis error:', err));

const app: Express = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

app.get('/health', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    let redisStatus = 'disconnected';
    try {
      if (!redisClient.isOpen) {
        await redisClient.connect();
      }
      redisStatus = 'connected';
    } catch (err) {
      redisStatus = 'disconnected';
    }
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
      redis: redisStatus,
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      message: 'Service unavailable',
      timestamp: new Date().toISOString(),
    });
  }
});

app.get('/api/v1/status', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'operational',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Database connection failed',
    });
  }
});

app.post('/api/v1/tenants', async (req: Request, res: Response) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }
    const tenant = await prisma.tenant.create({
      data: {
        id: uuidv4(),
        name,
        email,
        subscriptionTier: 'free',
        status: 'active',
      },
    });
    res.status(201).json(tenant);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error('Error creating tenant:', error);
    res.status(500).json({ error: 'Failed to create tenant' });
  }
});

app.get('/api/v1/tenants/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        users: true,
        projects: true,
      },
    });
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    res.status(200).json(tenant);
  } catch (error) {
    console.error('Error fetching tenant:', error);
    res.status(500).json({ error: 'Failed to fetch tenant' });
  }
});

app.post('/api/v1/projects', async (req: Request, res: Response) => {
  try {
    const { tenantId, name, description, authorityStrategy } = req.body;
    if (!tenantId || !name) {
      return res.status(400).json({ error: 'Tenant ID and name are required' });
    }
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    const project = await prisma.project.create({
      data: {
        id: uuidv4(),
        tenantId,
        name,
        description,
        authorityStrategy: authorityStrategy || 'data-driven',
        status: 'active',
      },
    });
    res.status(201).json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

app.get('/api/v1/tenants/:tenantId/projects', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const projects = await prisma.project.findMany({
      where: { tenantId },
      include: {
        posts: true,
        wordPressSites: true,
      },
    });
    res.status(200).json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// ============================================================================
// SOURCE VALIDATION ENDPOINTS (replaces CORS-Anywhere)
// ============================================================================

app.post('/api/v1/validate-source', async (req: Request, res: Response) => {
  try {
    const { urls, tenantId } = req.body;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'urls array is required and must not be empty' });
    }

    if (urls.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 URLs per request' });
    }

    // Validate tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Filter and validate URLs
    const validUrls = urls.filter(url => {
      try {
        return typeof url === 'string' && isValidSourceUrl(url);
      } catch {
        return false;
      }
    });

    if (validUrls.length === 0) {
      return res.status(400).json({ error: 'No valid URLs provided' });
    }

    // Validate sources in parallel
    const validatedSources = await validateSources(validUrls);

    res.status(200).json({
      success: true,
      tenantId,
      total: validatedSources.length,
      accessible: validatedSources.filter(s => s.accessible).length,
      sources: validatedSources,
    });
  } catch (error: any) {
    console.error('Error validating sources:', error);
    res.status(500).json({ error: 'Failed to validate sources', details: error.message });
  }
});

// ============================================================================
// POSTS CRUD ENDPOINTS
// ============================================================================

// POST /api/v1/posts - Create a new post
app.post('/api/v1/posts', async (req: Request, res: Response) => {
  try {
    const { tenantId, projectId, title, content, excerpt, intro, body, conclusion, tags } = req.body;

    if (!tenantId || !projectId || !title || !content || !excerpt) {
      return res.status(400).json({
        error: 'Missing required fields: tenantId, projectId, title, content, excerpt'
      });
    }

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Verify project exists and belongs to tenant
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project || project.tenantId !== tenantId) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const post = await prisma.post.create({
      data: {
        id: uuidv4(),
        tenantId,
        projectId,
        title,
        content,
        excerpt,
        intro,
        body,
        conclusion,
        status: 'draft',
      },
    });

    res.status(201).json({
      success: true,
      post,
      message: 'Post created successfully',
    });
  } catch (error: any) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post', details: error.message });
  }
});

// GET /api/v1/posts - Get all posts with optional filtering
app.get('/api/v1/posts', async (req: Request, res: Response) => {
  try {
    const { tenantId, projectId, status } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId query parameter is required' });
    }

    const where: any = { tenantId: tenantId as string };
    if (projectId) where.projectId = projectId as string;
    if (status) where.status = status as string;

    const posts = await prisma.post.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        sources: true,
        wordPressSite: true,
      },
    });

    res.status(200).json({
      success: true,
      count: posts.length,
      posts,
    });
  } catch (error: any) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts', details: error.message });
  }
});

// GET /api/v1/posts/:id - Get a specific post
app.get('/api/v1/posts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId query parameter is required' });
    }

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        sources: true,
        wordPressSite: true,
        embedding: true,
      },
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Verify post belongs to tenant
    if (post.tenantId !== tenantId) {
      return res.status(403).json({ error: 'Forbidden: Post does not belong to this tenant' });
    }

    res.status(200).json({
      success: true,
      post,
    });
  } catch (error: any) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Failed to fetch post', details: error.message });
  }
});

// PUT /api/v1/posts/:id - Update a post
app.put('/api/v1/posts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { tenantId, title, content, excerpt, intro, body, conclusion, status, featuredImageUrl } = req.body;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    // Verify post exists and belongs to tenant
    const existingPost = await prisma.post.findUnique({
      where: { id },
    });

    if (!existingPost) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (existingPost.tenantId !== tenantId) {
      return res.status(403).json({ error: 'Forbidden: Post does not belong to this tenant' });
    }

    const updatedPost = await prisma.post.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(content && { content }),
        ...(excerpt && { excerpt }),
        ...(intro && { intro }),
        ...(body && { body }),
        ...(conclusion && { conclusion }),
        ...(status && { status }),
        ...(featuredImageUrl && { featuredImageUrl }),
        updatedAt: new Date(),
      },
    });

    res.status(200).json({
      success: true,
      post: updatedPost,
      message: 'Post updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating post:', error);
    res.status(500).json({ error: 'Failed to update post', details: error.message });
  }
});

// DELETE /api/v1/posts/:id - Delete a post
app.delete('/api/v1/posts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId query parameter is required' });
    }

    // Verify post exists and belongs to tenant
    const existingPost = await prisma.post.findUnique({
      where: { id },
    });

    if (!existingPost) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (existingPost.tenantId !== tenantId) {
      return res.status(403).json({ error: 'Forbidden: Post does not belong to this tenant' });
    }

    await prisma.post.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: 'Post deleted successfully',
      postId: id,
    });
  } catch (error: any) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post', details: error.message });
  }
});

app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method,
  });
});

app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred',
  });
});

async function gracefulShutdown() {
  console.log('Shutting down gracefully...');
  try {
    await prisma.$disconnect();
    console.log('Prisma disconnected');
  } catch (error) {
    console.error('Error disconnecting Prisma:', error);
  }
  try {
    if (redisClient.isOpen) {
      await redisClient.quit();
      console.log('Redis disconnected');
    }
  } catch (error) {
    console.error('Error disconnecting Redis:', error);
  }
  process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function startServer() {
  try {
    console.log('Starting server initialization...');

    // Connect to Prisma with timeout
    console.log('Connecting to PostgreSQL...');
    await Promise.race([
      prisma.$connect(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Prisma connection timeout')), 10000)
      )
    ]);
    console.log('✓ Connected to PostgreSQL database');

    // Connect to Redis with timeout (non-blocking)
    console.log('Attempting Redis connection...');
    try {
      await Promise.race([
        redisClient.connect(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Redis connection timeout')), 5000)
        )
      ]);
      console.log('✓ Connected to Redis');
    } catch (err) {
      console.warn('⚠ Redis connection failed, continuing without caching:', err);
    }

    const server = app.listen(PORT, () => {
      console.log(`\n╔════════════════════════════════════════╗\n║   Influence Factory Backend Server    ║\n╠════════════════════════════════════════╣\n║ Server running on port: ${String(PORT).padEnd(20)} ║\n║ Environment: ${(process.env.NODE_ENV || 'development').padEnd(26)} ║\n║ Database: PostgreSQL                   ║\n║ Cache: Redis                           ║\n╚════════════════════════════════════════╝\n      `);
    });

    // Handle server errors
    server.on('error', (err: any) => {
      console.error('Server error:', err);
      process.exit(1);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  gracefulShutdown();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  gracefulShutdown();
});

startServer();

export default app;
