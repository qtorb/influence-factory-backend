import { createClient } from 'redis';
import { env } from '../config/env.js';

const redisClient = createClient({
  url: env.redisUrl,
});

redisClient.on('error', (error) => {
  console.warn('⚠️  Redis connection error (continuing without cache):', error.message);
});

export default redisClient;
