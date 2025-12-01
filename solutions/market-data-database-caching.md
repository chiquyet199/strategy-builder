# Market Data Database Caching with Scheduled Sync

## Overview

This solution implements a database-backed market data storage system with scheduled daily sync jobs. Market data is fetched from Binance API (or generated via mock data as fallback) and stored in PostgreSQL for fast, efficient queries during backtesting operations.

## Architecture

### Components

1. **Database Entity** (`Candlestick`)
   - Stores candlestick data with proper indexes
   - Composite unique index on (symbol, timeframe, timestamp)
   - Indexes on timestamp and (symbol, timeframe) for query optimization

2. **Binance API Service** (`BinanceApiService`)
   - Fetches real market data from Binance public API
   - Handles rate limiting and pagination
   - Converts between Binance format (BTCUSDT) and internal format (BTC/USD)

3. **Market Data Sync Service** (`MarketDataSyncService`)
   - Pre-populates historical data (2020-2025)
   - Syncs daily data automatically
   - Fills data gaps
   - Batch inserts for performance

4. **Scheduled Job** (`MarketDataSyncJob`)
   - Daily cron job to sync new market data
   - Configurable via `MARKET_DATA_SYNC_CRON` environment variable

5. **Market Data Service** (`MarketDataService`)
   - Queries database first
   - Falls back to on-demand generation if data missing
   - Aggregates timeframes from daily data

## Benefits

### Performance
- Database queries with indexes are fast for date range lookups
- Pre-generated data eliminates computation time during requests
- Batch inserts/updates are efficient
- Leverages PostgreSQL's query optimization

### Durability
- Persistent storage (survives restarts)
- Easy backup/restore
- Transaction support for data integrity

### Extendability
- Easy to add new symbols in the future
- Can store additional metadata (volume, indicators)
- Supports complex queries and analytics
- Can add data versioning/history tracking

### Cost Saving
- No Redis memory costs (using existing PostgreSQL)
- Reduced CPU usage (no on-demand generation)
- Lower infrastructure costs

## Database Schema

### Candlestick Entity

```typescript
@Entity('candlesticks')
@Index(['symbol', 'timeframe', 'timestamp'], { unique: true })
@Index(['timestamp'])
@Index(['symbol', 'timeframe'])
export class Candlestick {
  id: string (UUID)
  symbol: string (e.g., 'BTC/USD')
  timestamp: Date
  open: number (decimal 18,2)
  high: number (decimal 18,2)
  low: number (decimal 18,2)
  close: number (decimal 18,2)
  volume: number (decimal 18,2)
  timeframe: '1h' | '4h' | '1d' | '1w' | '1m'
  createdAt: Date
  updatedAt: Date
}
```

### Indexes

1. **Composite Unique Index**: `(symbol, timeframe, timestamp)`
   - Prevents duplicate entries
   - Optimizes lookups by symbol, timeframe, and timestamp

2. **Timestamp Index**: `(timestamp)`
   - Optimizes date range queries (`WHERE timestamp BETWEEN ...`)

3. **Composite Index**: `(symbol, timeframe)`
   - Optimizes queries filtering by symbol and timeframe

## Data Flow

### Initial Setup (First Run)
1. Application starts
2. `MarketDataModule.onModuleInit()` checks if historical data exists
3. If missing, triggers `prePopulateHistoricalData()` in background
4. Fetches data from Binance API (or generates mock data)
5. Stores daily candles in database (2020-01-01 to 2025-12-31)

### Daily Sync
1. Cron job runs at configured time (default: midnight)
2. `MarketDataSyncJob.handleDailySync()` executes
3. For each supported symbol, syncs today's data
4. Stores in database with conflict handling (upsert)

### Data Retrieval
1. User requests backtest with date range
2. `MarketDataService.getCandles()` queries database
3. If data exists, returns immediately
4. If missing, falls back to on-demand generation (with logging)

### Timeframe Aggregation
- Only daily (`1d`) candles are stored in database
- Other timeframes (1h, 4h, 1w, 1m) are aggregated on-the-fly from daily data
- Aggregation happens in-memory during request

## Rate Limiting

### Binance API Limits
- **Weight Limit**: 1200 weight units per minute
- **Request Limit**: 1200 requests per minute
- **Klines Request Weight**: 5 (for limit=1000)

### Implementation
- Tracks request weight usage per minute
- Tracks request count per minute
- Calculates wait time based on current usage
- Default delay: 250ms between requests (4 req/sec = 240 req/min)
- Exponential backoff on 429 errors (rate limit exceeded)
- Respects `Retry-After` header

### First Run Calculation
- Date range: 2020-01-01 to 2025-12-31 = ~2190 days
- Requests needed: ~3 per symbol (1000 candles per request)
- Total weight: ~15 units per symbol
- With 250ms delay: Safe for multiple symbols

## Configuration

### Environment Variables

#### Market Data Configuration

```env
# Enable/disable Binance API (default: true)
# Set to 'false' to use mock data generation only
USE_BINANCE_API=true

# Supported trading pairs (comma-separated)
# Format: BTC/USD,ETH/USD,BNB/USD
# Note: Binance uses USDT, but we normalize to USD
# Default: BTC/USD
SUPPORTED_SYMBOLS=BTC/USD,ETH/USD,BNB/USD

# Market data sync cron expression (default: midnight daily)
# Format: minute hour day month day-of-week
# Examples:
#   "0 0 * * *" - Every day at midnight
#   "0 2 * * *" - Every day at 2 AM
#   "0 */6 * * *" - Every 6 hours
MARKET_DATA_SYNC_CRON=0 0 * * *

# Auto-prepopulate historical data on startup (default: true)
# Set to 'false' to disable automatic pre-population
MARKET_DATA_PREPOPULATE=true

# Batch size for database inserts (default: 1000)
# Larger batches = faster inserts but more memory usage
MARKET_DATA_BATCH_SIZE=1000
```

#### Database Configuration

```env
# Database connection (use DATABASE_URL or individual variables)
DATABASE_URL=postgresql://username:password@host:port/database

# Or individual variables:
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=strategy
DB_SSL=false  # Set to 'true' for external databases
```

#### Redis Configuration (for rate limiting)

```env
# Redis connection (use REDIS_URL or individual variables)
REDIS_URL=redis://:password@host:port

# Or individual variables:
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis
```

#### Application Configuration

```env
# Node environment
NODE_ENV=production

# Server port
PORT=3000

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173

# JWT Secret (required in production)
JWT_SECRET=your-secret-key-change-in-production

# Master account (optional, for admin access)
MASTER_EMAIL=admin@example.com
MASTER_PASSWORD=ChangeThisPassword123!
MASTER_NAME=Master Admin
```

## API Endpoints

### Public Endpoints

#### Get Candlestick Data
```
GET /api/v1/market-data/candles
Query Parameters:
  - symbol: string (default: 'BTC/USD')
  - timeframe: '1h' | '4h' | '1d' | '1w' | '1m' (default: '1d')
  - startDate: string (ISO 8601)
  - endDate: string (ISO 8601)
```

### Admin Endpoints (Requires Admin/Master Role)

#### Get Sync Status
```
GET /api/v1/market-data/admin/sync-status?symbol=BTC/USD
Returns:
  - symbol: string
  - timeframes: Record<Timeframe, number>
  - earliestDate: Date | null
  - latestDate: Date | null
  - supportedSymbols: string[]
```

#### Trigger Daily Sync
```
POST /api/v1/market-data/admin/sync/daily
Body (optional):
  {
    "symbol": "BTC/USD"  // If omitted, syncs all supported symbols
  }
```

#### Trigger Historical Pre-population
```
POST /api/v1/market-data/admin/sync/prepopulate
Body (optional):
  {
    "symbol": "BTC/USD"  // If omitted, pre-populates all supported symbols
  }
```

#### Sync Date Range
```
POST /api/v1/market-data/admin/sync/date-range
Body:
  {
    "symbol": "BTC/USD",
    "timeframe": "1d",
    "startDate": "2020-01-01",
    "endDate": "2025-12-31"
  }
```

#### Fill Data Gaps
```
POST /api/v1/market-data/admin/sync/fill-gaps
Body (optional):
  {
    "symbol": "BTC/USD",
    "startDate": "2020-01-01",  // Optional, defaults to 2020-01-01
    "endDate": "2025-12-31"     // Optional, defaults to 2025-12-31
  }
```

## Production Readiness Checklist

### Required Configuration

- [ ] **Database Setup**
  - [ ] PostgreSQL database created and accessible
  - [ ] Database migrations created and tested
  - [ ] `DATABASE_URL` or individual DB variables configured
  - [ ] `DB_SSL=true` if using external database
  - [ ] Database backups configured

- [ ] **Redis Setup**
  - [ ] Redis instance running and accessible
  - [ ] `REDIS_URL` or individual Redis variables configured
  - [ ] Redis password set (required in production)
  - [ ] Redis persistence configured (optional but recommended)

- [ ] **Environment Variables**
  - [ ] `NODE_ENV=production`
  - [ ] `JWT_SECRET` set to strong random value
  - [ ] `USE_BINANCE_API=true` (or false if using mock data)
  - [ ] `SUPPORTED_SYMBOLS` configured
  - [ ] `MARKET_DATA_SYNC_CRON` configured
  - [ ] `MARKET_DATA_PREPOPULATE=true` for first deployment
  - [ ] `MARKET_DATA_BATCH_SIZE` optimized for your database

- [ ] **Security**
  - [ ] All sensitive environment variables secured
  - [ ] Database credentials not exposed
  - [ ] Redis password set
  - [ ] JWT secret is strong and unique
  - [ ] CORS configured correctly (`FRONTEND_URL`)

- [ ] **Monitoring & Logging**
  - [ ] Application logs configured and monitored
  - [ ] Database connection monitoring
  - [ ] Redis connection monitoring
  - [ ] Binance API error tracking
  - [ ] Sync job execution monitoring
  - [ ] Alerting for sync failures

### Recommended Optimizations

- [ ] **Database**
  - [ ] Database connection pooling configured
  - [ ] Query performance monitoring
  - [ ] Index usage analysis
  - [ ] Regular VACUUM/ANALYZE scheduled
  - [ ] Database size monitoring

- [ ] **Performance**
  - [ ] Batch size tuned for your database
  - [ ] Connection pool size optimized
  - [ ] Rate limiting delays tuned if needed
  - [ ] Pre-population scheduled during low-traffic hours

- [ ] **Reliability**
  - [ ] Health check endpoints monitored
  - [ ] Automatic retry logic for failed syncs
  - [ ] Data validation and integrity checks
  - [ ] Backup and restore procedures tested

- [ ] **Scalability**
  - [ ] Database read replicas (if needed)
  - [ ] Horizontal scaling considerations
  - [ ] Load balancing configuration
  - [ ] CDN for static assets (if applicable)

### Migration Steps

1. **Pre-deployment**
   ```bash
   # Create database migration for candlesticks table
   npm run typeorm migration:generate -- -n CreateCandlestickTable
   npm run typeorm migration:run
   ```

2. **Deploy Application**
   - Set all required environment variables
   - Deploy application code
   - Verify database connection
   - Verify Redis connection

3. **Initial Data Population**
   - On first startup, `MARKET_DATA_PREPOPULATE=true` will trigger
   - Monitor logs for pre-population progress
   - For large datasets, this may take time (2020-2025 = ~2190 days per symbol)
   - Can also trigger manually via admin endpoint

4. **Verify Sync**
   - Check sync status via admin endpoint
   - Verify data exists in database
   - Test a backtest request
   - Monitor daily sync job execution

5. **Post-deployment**
   - Monitor application logs
   - Check database size and growth
   - Verify daily sync is working
   - Set up alerts for failures

## Troubleshooting

### Missing Data

**Problem**: Some dates are missing in database

**Solution**:
1. Check sync status: `GET /api/v1/market-data/admin/sync-status`
2. Trigger gap filling: `POST /api/v1/market-data/admin/sync/fill-gaps`
3. Check logs for API errors
4. Manually sync date range if needed

### Rate Limit Errors

**Problem**: Binance API rate limit errors (429)

**Solution**:
- The service automatically handles rate limits with exponential backoff
- Check logs for rate limit warnings
- Consider reducing `SUPPORTED_SYMBOLS` if syncing many pairs
- Adjust sync schedule to spread load

### Database Performance Issues

**Problem**: Slow queries or high database load

**Solution**:
1. Verify indexes are created: `\d candlesticks` in psql
2. Check query execution plans
3. Consider increasing `MARKET_DATA_BATCH_SIZE` if inserts are slow
4. Monitor database connection pool
5. Run `VACUUM ANALYZE` on candlesticks table

### Sync Job Not Running

**Problem**: Daily sync not executing

**Solution**:
1. Verify `MARKET_DATA_SYNC_CRON` is set correctly
2. Check application logs for cron job execution
3. Verify `@nestjs/schedule` is properly imported
4. Manually trigger sync via admin endpoint to test

## Monitoring Queries

### Check Data Coverage

```sql
-- Count by symbol and timeframe
SELECT 
    symbol,
    timeframe,
    COUNT(*) as count,
    MIN(timestamp) as earliest,
    MAX(timestamp) as latest
FROM candlesticks
GROUP BY symbol, timeframe
ORDER BY symbol, timeframe;

-- Check for gaps
WITH date_series AS (
    SELECT generate_series(
        '2020-01-01'::date,
        '2025-12-31'::date,
        '1 day'::interval
    )::date AS date
),
symbols AS (
    SELECT DISTINCT symbol FROM candlesticks WHERE timeframe = '1d'
)
SELECT 
    s.symbol,
    COUNT(*) as missing_days
FROM symbols s
CROSS JOIN date_series ds
LEFT JOIN candlesticks c ON c.symbol = s.symbol 
    AND c.timeframe = '1d' 
    AND DATE(c.timestamp) = ds.date
WHERE c.id IS NULL
GROUP BY s.symbol;
```

### Check Index Usage

```sql
-- List all indexes on candlesticks table
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'candlesticks';

-- Check index usage statistics
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename = 'candlesticks';
```

### Database Size

```sql
-- Table size
SELECT 
    pg_size_pretty(pg_total_relation_size('candlesticks')) as total_size,
    pg_size_pretty(pg_relation_size('candlesticks')) as table_size,
    pg_size_pretty(pg_indexes_size('candlesticks')) as indexes_size;

-- Row count
SELECT COUNT(*) FROM candlesticks;
```

## Future Enhancements

### Potential Improvements

1. **Pre-aggregate Timeframes**
   - Store 1h, 4h, 1w, 1m candles in database
   - Trade storage space for query speed
   - Useful for high-frequency queries

2. **Multiple Data Sources**
   - Support other exchanges (Coinbase, Kraken, etc.)
   - Data source abstraction layer
   - Fallback chain if primary source fails

3. **Data Versioning**
   - Track data updates/changes
   - Support data corrections
   - Historical data snapshots

4. **Real-time Updates**
   - WebSocket integration for live data
   - Incremental updates instead of daily batch
   - Lower latency for recent data

5. **Analytics & Reporting**
   - Data quality metrics
   - Sync performance monitoring
   - Usage statistics

6. **Caching Layer**
   - Redis cache for frequently accessed data
   - Reduce database load
   - Faster response times

## References

- [Binance API Documentation](https://binance-docs.github.io/apidocs/spot/en/#kline-candlestick-data)
- [NestJS Schedule Module](https://docs.nestjs.com/techniques/task-scheduling)
- [TypeORM Documentation](https://typeorm.io/)
- [PostgreSQL Indexes](https://www.postgresql.org/docs/current/indexes.html)

