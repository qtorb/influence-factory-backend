import express from 'express';
import cors from 'cors';
import apiRouter from './routes/api.js';
import { env } from './config/env.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const configuredOrigins = env.frontendUrl
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);
const allowAnyOrigin = configuredOrigins.includes('*');
const devOrigins = ['http://localhost:3000', 'http://localhost:5173'];
const ALLOWED_ORIGINS = env.nodeEnv === 'production'
  ? configuredOrigins
  : [...configuredOrigins, ...devOrigins];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }
    if (allowAnyOrigin || ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('CORS origin not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

// Increase timeout for long-running requests
app.use((req, res, next) => {
  req.setTimeout(300000); // 5 minutes
  res.setTimeout(300000);
  next();
});

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

app.use('/api/v1', apiRouter);

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'influence-factory-backend',
    timestamp: new Date().toISOString(),
  });
});

app.use(errorHandler);

export default app;
