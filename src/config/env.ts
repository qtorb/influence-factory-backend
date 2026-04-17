import dotenv from 'dotenv';

dotenv.config();

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 3001),
  frontendUrl: process.env.FRONTEND_URL ?? '*',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  databaseUrl: getRequiredEnv('DATABASE_URL'),
  claudeApiKey: getRequiredEnv('CLAUDE_API_KEY'),
  claudeModel: process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-6',
  wpBaseUrl: getRequiredEnv('WP_BASE_URL'),
  wpUsername: getRequiredEnv('WP_USER'),
  wpPassword: getRequiredEnv('WP_APP_PASSWORD'),
  nodeEnv: process.env.NODE_ENV ?? 'development',
};
