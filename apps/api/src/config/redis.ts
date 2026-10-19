import { Redis } from 'ioredis';
import RedisMock from 'ioredis-mock';
import { ENV } from './env.js';

let redisClient: Redis;
let redisSubClient: Redis;

export function getRedisClient(): Redis {
  if (redisClient) return redisClient;

  if (ENV.USE_MOCK_REDIS) {
    redisClient = new (RedisMock as unknown as typeof Redis)();
  } else {
    try {
      redisClient = new Redis(ENV.REDIS_URL, {
        maxRetriesPerRequest: 2,
        retryStrategy: (times) => {
          if (times > 3) {
            console.warn('[Redis] Connection fallback to in-memory store for resilience');
            redisClient = new (RedisMock as unknown as typeof Redis)();
            redisClient.on('error', () => {});
            return null;
          }
          return Math.min(times * 100, 2000);
        },
      });
      redisClient.on('error', () => {});
    } catch {
      redisClient = new (RedisMock as unknown as typeof Redis)();
      redisClient.on('error', () => {});
    }
  }

  return redisClient;
}

export function getRedisSubClient(): Redis {
  if (redisSubClient) return redisSubClient;

  if (ENV.USE_MOCK_REDIS) {
    redisSubClient = new (RedisMock as unknown as typeof Redis)();
  } else {
    try {
      redisSubClient = new Redis(ENV.REDIS_URL, {
        maxRetriesPerRequest: 2,
        retryStrategy: () => null,
      });
      redisSubClient.on('error', () => {});
    } catch {
      redisSubClient = new (RedisMock as unknown as typeof Redis)();
      redisSubClient.on('error', () => {});
    }
  }

  return redisSubClient;
}

/**
 * 60s Redis cache for dashboard totals
 */
export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const redis = getRedisClient();
    const data = await redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

export async function setCached(key: string, value: any, ttlSeconds: number = 60): Promise<void> {
  try {
    const redis = getRedisClient();
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (e) {
    // silently ignore cache write failure
  }
}

export async function deleteCached(patternOrKey: string): Promise<void> {
  try {
    const redis = getRedisClient();
    await redis.del(patternOrKey);
  } catch {
    // ignore
  }
}

/**
 * Redis distributed lock for schedulers and automations
 */
export async function acquireLock(lockKey: string, ttlSeconds: number = 300): Promise<boolean> {
  try {
    const redis = getRedisClient();
    const result = await redis.set(`lock:${lockKey}`, 'locked', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  } catch {
    return true; // fail-open in test / offline
  }
}

export async function releaseLock(lockKey: string): Promise<void> {
  try {
    const redis = getRedisClient();
    await redis.del(`lock:${lockKey}`);
  } catch {
    // ignore
  }
}
