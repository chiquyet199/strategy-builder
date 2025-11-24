/**
 * Redis Configuration Utility
 * Parses REDIS_URL (Railway format) or uses individual connection parameters
 * Supports both connection string and individual environment variables
 */

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  tls?: boolean;
}

/**
 * Parse REDIS_URL connection string
 * Format: redis://:password@host:port or rediss://:password@host:port (TLS)
 */
function parseRedisUrl(url: string): RedisConfig {
  try {
    const parsedUrl = new URL(url);
    const isTls = parsedUrl.protocol === 'rediss:';
    
    return {
      host: parsedUrl.hostname,
      port: parseInt(parsedUrl.port || '6379', 10),
      password: parsedUrl.password || undefined,
      tls: isTls,
    };
  } catch (error) {
    throw new Error(`Invalid REDIS_URL format: ${error.message}`);
  }
}

/**
 * Get Redis configuration
 * Priority: REDIS_URL > individual environment variables
 */
export function getRedisConfig(): RedisConfig {
  // Check if REDIS_URL is provided (Railway, Heroku, etc.)
  if (process.env.REDIS_URL) {
    return parseRedisUrl(process.env.REDIS_URL);
  }

  // Fall back to individual environment variables
  const password = process.env.REDIS_PASSWORD;
  
  if (process.env.NODE_ENV === 'production' && !password) {
    throw new Error(
      'REDIS_PASSWORD or REDIS_URL is required in production. Please set it in your environment variables.',
    );
  }

  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: password || 'redis', // Default for development only
  };
}

