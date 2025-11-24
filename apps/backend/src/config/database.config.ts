/**
 * Database Configuration Utility
 * Parses DATABASE_URL connection string or uses individual connection parameters
 * Supports both connection string (common in cloud platforms) and individual environment variables
 */

export interface DatabaseConfig {
  type: 'postgres';
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
}

/**
 * Parse DATABASE_URL connection string
 * Format: postgresql://username:password@host:port/database
 */
function parseDatabaseUrl(url: string): DatabaseConfig {
  try {
    const parsedUrl = new URL(url);
    
    return {
      type: 'postgres',
      host: parsedUrl.hostname,
      port: parseInt(parsedUrl.port || '5432', 10),
      username: parsedUrl.username,
      password: parsedUrl.password,
      database: parsedUrl.pathname.slice(1), // Remove leading '/'
      ssl:
        parsedUrl.searchParams.get('sslmode') === 'require' ||
        parsedUrl.protocol === 'postgresql+ssl:'
          ? { rejectUnauthorized: false }
          : false,
    };
  } catch (error) {
    throw new Error(`Invalid DATABASE_URL format: ${error.message}`);
  }
}

/**
 * Get database configuration
 * Priority: DATABASE_URL > individual environment variables
 */
export function getDatabaseConfig(): DatabaseConfig {
  // Check if DATABASE_URL is provided (common in cloud platforms like Heroku, Render, etc.)
  if (process.env.DATABASE_URL) {
    return parseDatabaseUrl(process.env.DATABASE_URL);
  }

  // Fall back to individual environment variables
  return {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'strategy',
    ssl: process.env.NODE_ENV === 'production' && process.env.DB_SSL !== 'false'
      ? { rejectUnauthorized: false }
      : false,
  };
}

