import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';
import { v4 as uuidv4 } from 'uuid';

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
