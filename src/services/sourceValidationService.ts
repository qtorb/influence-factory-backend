import redisClient from './redisClient.js';
import { validateSources, isValidSourceUrl, ValidatedSource } from '../validators.js';

const CACHE_TTL_SECONDS = 60 * 10;

async function cacheSourceResult(url: string, result: ValidatedSource): Promise<void> {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    await redisClient.set(`source_validation:${url}`, JSON.stringify(result), {
      EX: CACHE_TTL_SECONDS,
    });
  } catch (error) {
    console.warn('Redis cache unavailable, continuing without cache:', error);
  }
}

async function getCachedSourceResult(url: string): Promise<ValidatedSource | null> {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    const cached = await redisClient.get(`source_validation:${url}`);
    return cached ? (JSON.parse(cached) as ValidatedSource) : null;
  } catch (error) {
    console.warn('Redis cache unavailable, continuing without cache:', error);
    return null;
  }
}

export async function validateSourceUrls(urls: string[], projectId: string): Promise<ValidatedSource[]> {
  const validUrls = urls.filter(isValidSourceUrl);
  const results: ValidatedSource[] = [];

  for (const url of validUrls) {
    let source = await getCachedSourceResult(url);
    if (!source) {
      const [result] = await validateSources([url], projectId);
      source = result;
      await cacheSourceResult(url, source);
    }
    results.push(source);
  }

  return results;
}

export async function validateSourceBatch(urls: string[], projectId: string): Promise<ValidatedSource[]> {
  return validateSourceUrls(urls, projectId);
}
