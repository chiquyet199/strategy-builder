# Environment Variables Setup

## Backend Environment Variables

Create a `.env` file in `apps/backend/` directory with the following variables:

```env
# Application Environment
NODE_ENV=development  # Use 'production' in production

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=strategy

# JWT Configuration
# IMPORTANT: Generate a strong secret for production
# Generate with: openssl rand -base64 32
JWT_SECRET=your-secret-key-change-in-production

# Redis Configuration (for rate limiting)
REDIS_HOST=localhost
REDIS_PORT=6379
# IMPORTANT: Use a strong password in production
REDIS_PASSWORD=redis

# Frontend URL (for CORS and email links)
FRONTEND_URL=http://localhost:5173

# Email Configuration (optional - for production email providers)
EMAIL_FROM=noreply@strategy.app
```

## Production Requirements

In production (`NODE_ENV=production`), the following are **required**:

- ✅ `JWT_SECRET` - Must be set (will throw error if missing)
- ✅ `REDIS_PASSWORD` - Must be set (will throw error if missing)
- ✅ `FRONTEND_URL` - Should be set to your production frontend URL
- ✅ `DB_PASSWORD` - Should use a strong password
- ✅ `DB_HOST`, `DB_USERNAME`, `DB_NAME` - Should be configured for your production database

## Development Defaults

In development, the following defaults are used if not set:

- `REDIS_PASSWORD` defaults to `'redis'` (matches docker-compose)
- `JWT_SECRET` defaults to `'your-secret-key-change-in-production'` (⚠️ change this!)
- `FRONTEND_URL` defaults to `'http://localhost:5173'`

## Docker Compose

When using Docker Compose, environment variables can be set in:

1. `.env` file in the project root (for docker-compose variable substitution)
2. `docker-compose.yml` environment section (for container environment)

Example `.env` file in project root:

```env
REDIS_PASSWORD=your-redis-password
```

This will be used by docker-compose for the Redis service.

