import app from './app.js';
import { env } from './config/env.js';
import prisma from './config/prisma.js';
import redisClient from './services/redisClient.js';

const PORT = env.port;

async function start() {
  // Start server immediately
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Influence Factory backend listening on port ${PORT}`);
    console.log(`🌐 Frontend origin allowed: ${env.frontendUrl}`);
  });

  // Temporarily bypass database connection for Claude-only testing
  /*
  setTimeout(async () => {
    try {
      await prisma.$connect();
      console.log('✅ Connected to database');
    } catch (error) {
      console.warn('⚠️  Database connection failed. The app will continue without database:', error.message);
    }
  }, 100);
  */

  // Temporarily bypass Redis connection for Claude-only testing
  /*
  setTimeout(async () => {
    try {
      if (!redisClient.isOpen) {
        await redisClient.connect();
      }
      console.log('✅ Connected to Redis');
    } catch (error) {
      console.warn('⚠️  Redis connection failed. The app will continue without cache:', error.message);
    }
  }, 200);
  */
}

start();
