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
        retryStrategy: (times) => {
          if (times > 3) {
            console.warn('[Redis] Connection failed, switching to in-memory Redis mock');
            redisClient = new (RedisMock as unknown as typeof Redis)();
            return null;
          }
          return Math.min(times * 100, 3000);
        },
      });
    } catch {
      redisClient = new (RedisMock as unknown as typeof Redis)();
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
        retryStrategy: () => null,
      });
    } catch {
      redisSubClient = new (RedisMock as unknown as typeof Redis)();
    }
  }

  return redisSubClient;
}
