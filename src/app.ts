import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Rutas de diagnóstico (antes de cualquier router complejo) ──────────────
app.get('/test-simple', (_req, res) => res.send('Ruta simple funciona ✅'));
app.get('/', (_req, res) => res.status(200).send('Fábrica Online ✅'));
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'influence-factory-backend',
    timestamp: new Date().toISOString(),
  });
});
// ──────────────────────────────────────────────────────────────────────────

app.use((req, res, next) => {
  req.setTimeout(300000);
  res.setTimeout(300000);
  next();
});

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// ── Registro del router principal con protección ante fallos ──────────────
try {
  const { default: apiRouter } = await import('./routes/api.js');
  console.log('🔄 Registrando rutas /api/v1...');
  app.use('/api/v1', apiRouter);
  console.log('✅ Rutas /api/v1 cargadas correctamente');
} catch (err) {
  console.error('❌ ERROR al cargar rutas /api/v1:', err);
}
// ──────────────────────────────────────────────────────────────────────────

app.use(errorHandler);

export default app;
