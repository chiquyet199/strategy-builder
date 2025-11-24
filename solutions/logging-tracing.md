# Logging, Tracing, and Traceability Solution

## Overview

This document describes the logging, tracing, and traceability implementation for the Strategy application, including technical decisions, architecture, and future enhancements.

## Date
November 24, 2024

## Problem Statement

The application needed production-ready logging to:
1. Track and debug issues in production
2. Monitor application performance and behavior
3. Trace requests across distributed systems
4. Comply with audit and compliance requirements
5. Provide observability for operations teams
6. Enable correlation of related events

## Solution Architecture

### Components

1. **Winston Logger** (`LoggerModule`)
   - Structured logging with JSON format in production
   - Human-readable format in development
   - Multiple log levels (error, warn, info, debug)
   - File-based logging for errors and combined logs
   - Exception and rejection handlers

2. **Correlation ID Middleware** (`CorrelationIdMiddleware`)
   - Generates unique correlation ID for each request
   - Adds correlation ID to request and response headers
   - Enables tracing requests across services

3. **Logging Interceptor** (`LoggingInterceptor`)
   - Logs all HTTP requests and responses
   - Includes request metadata (method, URL, IP, user agent)
   - Tracks response times
   - Associates logs with correlation IDs

## Technical Decisions

### 1. Why Winston?

**Decision**: Use Winston for structured logging

**Rationale**:
- **Mature and Battle-Tested**: Widely used in production Node.js applications
- **Flexible Transports**: Supports console, file, and external services
- **Structured Logging**: JSON format for easy parsing and analysis
- **Performance**: Efficient logging with minimal overhead
- **NestJS Integration**: `nest-winston` provides seamless integration
- **Multiple Log Levels**: Supports error, warn, info, debug, verbose

**Alternatives Considered**:
- Pino: Faster but less flexible, better for high-throughput scenarios
- Bunyan: Similar to Winston but less actively maintained
- Console.log: Not production-ready, no structure or levels

### 2. Why Correlation IDs?

**Decision**: Implement request correlation IDs for traceability

**Rationale**:
- **Request Tracing**: Track a request through the entire system
- **Debugging**: Easily find all logs related to a specific request
- **Distributed Systems**: Essential for microservices architecture
- **Client Integration**: Clients can provide correlation IDs for support
- **Industry Standard**: Common practice in production applications

**Implementation**:
- Generated using UUID v4
- Accepts `X-Correlation-ID` or `X-Request-ID` from client
- Added to response headers as `X-Correlation-ID`
- Included in all log entries

### 3. Log Format Strategy

**Decision**: Different formats for development and production

**Development**:
- Human-readable, colorized output
- Includes context, correlation ID, and metadata
- Easy to read during development

**Production**:
- Structured JSON format
- Easy to parse by log aggregation tools
- Includes all metadata in structured format
- Optimized for log analysis tools (ELK, Splunk, etc.)

### 4. Log Levels

**Configuration**:
- `error`: Errors that need immediate attention
- `warn`: Warning conditions
- `info`: Informational messages (default in production)
- `debug`: Debug information (default in development)
- `verbose`: Very detailed information

**Usage Guidelines**:
- **error**: Exceptions, failures, critical issues
- **warn**: Deprecated features, rate limit violations, authentication failures
- **info**: Request/response logging, business events, state changes
- **debug**: Detailed flow information, variable values
- **verbose**: Very detailed tracing (rarely used)

## Implementation Details

### Logger Configuration

**File**: `apps/backend/src/common/logger/logger.config.ts`

**Features**:
- Environment-based log level
- JSON format in production, human-readable in development
- File transports for errors and combined logs (production only)
- Exception and rejection handlers
- Log rotation (5MB files, 5 files max)

**Log Files** (Production):
- `logs/error.log` - Error level logs only
- `logs/combined.log` - All logs
- `logs/exceptions.log` - Unhandled exceptions
- `logs/rejections.log` - Unhandled promise rejections

### Correlation ID Middleware

**File**: `apps/backend/src/common/middleware/correlation-id.middleware.ts`

**Behavior**:
1. Checks for `X-Correlation-ID` or `X-Request-ID` header
2. Generates UUID v4 if not present
3. Adds to request object: `req.correlationId`
4. Adds to response header: `X-Correlation-ID`

**Usage in Code**:
```typescript
// In controller or service
const correlationId = req['correlationId'];
this.logger.log({ message: 'Processing request', correlationId });
```

### Logging Interceptor

**File**: `apps/backend/src/common/interceptors/logging.interceptor.ts`

**Logs**:
- Incoming request: method, URL, IP, user agent, correlation ID
- Outgoing response: status code, duration, correlation ID
- Errors: status code, error message, stack trace, duration

**Example Log Entry**:
```json
{
  "timestamp": "2024-11-24 17:30:45.123",
  "level": "info",
  "message": "Incoming POST /api/v1/auth/login",
  "method": "POST",
  "url": "/api/v1/auth/login",
  "ip": "127.0.0.1",
  "userAgent": "Mozilla/5.0...",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "context": "HTTP"
}
```

### Structured Logging

**Best Practices**:
```typescript
// ✅ Good: Structured logging with context
this.logger.log({
  message: 'User logged in',
  userId: user.id,
  email: user.email,
  correlationId: req['correlationId'],
});

// ✅ Good: Error logging with stack trace
this.logger.error({
  message: 'Failed to send email',
  error: error.message,
  stack: error.stack,
  correlationId: req['correlationId'],
});

// ❌ Bad: String concatenation
this.logger.log(`User ${user.id} logged in`);
```

## Environment Configuration

### Environment Variables

```env
# Log Level (optional)
# Options: error, warn, info, debug, verbose
# Default: 'info' in production, 'debug' in development
LOG_LEVEL=debug

# Node Environment
NODE_ENV=production
```

### Log Levels by Environment

- **Development**: `debug` (shows all logs)
- **Production**: `info` (shows info and above)
- **Staging**: `info` or `debug` (configurable)

## Production Considerations

### Log Aggregation

**Recommended Tools**:
1. **ELK Stack** (Elasticsearch, Logstash, Kibana)
   - Open source
   - Powerful search and visualization
   - Good for on-premise deployments

2. **Cloud Services**:
   - AWS CloudWatch Logs
   - Google Cloud Logging
   - Azure Monitor
   - Datadog
   - New Relic

3. **File-based** (Current Implementation):
   - Logs written to files
   - Can be collected by log shippers (Filebeat, Fluentd)
   - Suitable for containerized deployments

### Log Retention

**Current Configuration**:
- Max file size: 5MB
- Max files: 5 per log type
- Total: ~25MB per log type

**Production Recommendations**:
- Implement log rotation policies
- Archive old logs to cold storage
- Set retention policies (e.g., 30 days hot, 1 year cold)
- Compress archived logs

### Performance

**Optimizations**:
- Async logging (Winston handles this)
- Log level filtering (only log what's needed)
- Structured format (faster parsing)
- File rotation (prevents disk space issues)

**Monitoring**:
- Monitor log file sizes
- Alert on excessive error logs
- Track log volume and growth

### Security

**Sensitive Data**:
- Never log passwords, tokens, or secrets
- Sanitize user input in logs
- Consider PII (Personally Identifiable Information) regulations
- Implement log access controls

**Example**:
```typescript
// ❌ Bad: Logging sensitive data
this.logger.log({ password: user.password });

// ✅ Good: Sanitized logging
this.logger.log({ 
  userId: user.id,
  // password is never logged
});
```

## Tracing and Traceability

### Request Tracing

**Flow**:
1. Request arrives with or without correlation ID
2. Middleware generates/uses correlation ID
3. Correlation ID added to all logs for that request
4. Response includes correlation ID in header
5. Client can use correlation ID for support/debugging

### Distributed Tracing

**Current State**: Single-service correlation IDs

**Future Enhancement**: Distributed tracing with OpenTelemetry
- Trace requests across multiple services
- Visualize request flow
- Identify bottlenecks
- Measure service dependencies

### Audit Logging

**Use Cases**:
- Authentication events (login, logout, failed attempts)
- Authorization changes
- Data modifications
- Administrative actions

**Implementation**:
```typescript
// Example audit log
this.logger.log({
  message: 'User password reset requested',
  userId: user.id,
  email: user.email,
  ip: req.ip,
  correlationId: req['correlationId'],
  audit: true, // Mark as audit log
});
```

## Usage Examples

### Basic Logging

```typescript
import { Logger } from '@nestjs/common';

export class MyService {
  private readonly logger = new Logger(MyService.name);

  async doSomething() {
    this.logger.log('Starting operation');
    // ... code ...
    this.logger.log('Operation completed');
  }
}
```

### Structured Logging

```typescript
this.logger.log({
  message: 'User registered',
  userId: user.id,
  email: user.email,
  correlationId: req['correlationId'],
});
```

### Error Logging

```typescript
try {
  // ... code ...
} catch (error) {
  this.logger.error({
    message: 'Operation failed',
    error: error.message,
    stack: error.stack,
    correlationId: req['correlationId'],
  });
  throw error;
}
```

### Request Context

```typescript
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  @Post('login')
  async login(@Body() dto: LoginDto, @Request() req) {
    const correlationId = req['correlationId'];
    
    this.logger.log({
      message: 'Login attempt',
      email: dto.email,
      correlationId,
    });
    
    // ... login logic ...
  }
}
```

## Monitoring and Alerting

### Key Metrics to Monitor

1. **Error Rate**: Number of errors per time period
2. **Response Times**: Tracked in logging interceptor
3. **Request Volume**: Number of requests per endpoint
4. **Log Volume**: Size and growth of log files
5. **Correlation ID Coverage**: Percentage of logs with correlation IDs

### Alerting Rules

**Recommended Alerts**:
- Error rate exceeds threshold (e.g., > 1% of requests)
- Response time exceeds threshold (e.g., > 1 second)
- Log file size exceeds threshold
- Exception/rejection rate spikes
- Authentication failure rate spikes

### Dashboards

**Recommended Dashboards**:
- Request volume by endpoint
- Error rate over time
- Response time percentiles (p50, p95, p99)
- Top errors by frequency
- Correlation ID distribution

## Future Enhancements

### 1. Distributed Tracing

**Enhancement**: Implement OpenTelemetry for distributed tracing

**Benefits**:
- Trace requests across multiple services
- Visualize service dependencies
- Identify performance bottlenecks
- Measure service latency

**Implementation**:
```typescript
// Future: OpenTelemetry integration
import { TraceService } from '@nestjs/opentelemetry';

// Automatic instrumentation
// Manual spans for custom operations
```

### 2. Log Aggregation Integration

**Enhancement**: Direct integration with log aggregation services

**Options**:
- Winston transport for CloudWatch
- Winston transport for Datadog
- Winston transport for Elasticsearch
- Custom transport for any service

**Example**:
```typescript
// Future: CloudWatch transport
import winstonCloudWatch from 'winston-cloudwatch';

transports: [
  new winstonCloudWatch({
    logGroupName: 'strategy-backend',
    logStreamName: 'api',
  }),
]
```

### 3. Structured Error Tracking

**Enhancement**: Integration with error tracking services

**Services**:
- Sentry
- Rollbar
- Bugsnag
- Honeybadger

**Benefits**:
- Automatic error grouping
- Stack trace analysis
- Release tracking
- User impact analysis

### 4. Performance Monitoring

**Enhancement**: APM (Application Performance Monitoring) integration

**Services**:
- New Relic
- Datadog APM
- Elastic APM
- AWS X-Ray

**Benefits**:
- Database query performance
- External API call tracking
- Memory and CPU usage
- Transaction tracing

### 5. Business Metrics Logging

**Enhancement**: Structured business event logging

**Use Cases**:
- User registration events
- Payment transactions
- Feature usage
- Conversion tracking

**Implementation**:
```typescript
// Future: Business metrics
this.logger.log({
  message: 'User registered',
  event: 'user.registered',
  userId: user.id,
  source: 'web',
  timestamp: new Date().toISOString(),
  metrics: {
    registrationTime: duration,
    source: 'organic',
  },
});
```

### 6. Log Sampling

**Enhancement**: Sample high-volume logs to reduce storage

**Use Cases**:
- Debug logs in production (sample 10%)
- Info logs for health checks (sample 1%)
- Keep all error logs (no sampling)

**Implementation**:
```typescript
// Future: Log sampling
if (level === 'debug' && Math.random() > 0.1) {
  return; // Sample 10% of debug logs
}
```

### 7. Context Propagation

**Enhancement**: Automatic context propagation across async operations

**Benefits**:
- Correlation IDs in all async operations
- User context in background jobs
- Request context in scheduled tasks

**Implementation**:
```typescript
// Future: AsyncLocalStorage for context
import { AsyncLocalStorage } from 'async_hooks';

const context = new AsyncLocalStorage();
```

### 8. Log Enrichment

**Enhancement**: Enrich logs with additional context

**Sources**:
- User information
- Request metadata
- System metrics
- Business context

**Example**:
```typescript
// Future: Automatic log enrichment
this.logger.log({
  message: 'Request processed',
  // Automatically enriched with:
  // - User ID (if authenticated)
  // - Request ID
  // - Service version
  // - Deployment environment
  // - Instance ID
});
```

## Testing

### Unit Testing

```typescript
// Mock logger in tests
const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};
```

### Integration Testing

```typescript
// Verify correlation IDs in responses
const response = await request(app.getHttpServer())
  .get('/api/v1/health')
  .expect(200);

expect(response.headers['x-correlation-id']).toBeDefined();
```

## Troubleshooting

### Common Issues

1. **Logs not appearing**
   - Check LOG_LEVEL environment variable
   - Verify logger is properly injected
   - Check file permissions for log files

2. **Missing correlation IDs**
   - Verify middleware is registered
   - Check middleware order
   - Ensure correlation ID is passed in async operations

3. **Log file size issues**
   - Check log rotation settings
   - Monitor disk space
   - Adjust max file size if needed

4. **Performance impact**
   - Reduce log level in production
   - Use async transports
   - Consider log sampling

## Best Practices

### Do's

✅ **Do** use structured logging with objects
✅ **Do** include correlation IDs in all logs
✅ **Do** log at appropriate levels
✅ **Do** sanitize sensitive data
✅ **Do** use context in logger names
✅ **Do** log errors with stack traces
✅ **Do** include request metadata

### Don'ts

❌ **Don't** log passwords, tokens, or secrets
❌ **Don't** use string concatenation for logs
❌ **Don't** log excessive debug information in production
❌ **Don't** log PII without consideration
❌ **Don't** use console.log in production code
❌ **Don't** ignore error logs

## References

- [Winston Documentation](https://github.com/winstonjs/winston)
- [NestJS Logger](https://docs.nestjs.com/techniques/logger)
- [OpenTelemetry](https://opentelemetry.io/)
- [Structured Logging Best Practices](https://www.honeybadger.io/blog/nodejs-logging/)
- [Correlation IDs](https://www.honeybadger.io/blog/correlation-ids/)

## Conclusion

The logging implementation provides:
- ✅ Production-ready structured logging
- ✅ Request correlation IDs for traceability
- ✅ Environment-appropriate log formats
- ✅ Error tracking and monitoring
- ✅ Foundation for distributed tracing
- ✅ Extensible architecture for future enhancements

The solution balances development experience with production requirements, providing clear visibility into application behavior while maintaining performance and security.

