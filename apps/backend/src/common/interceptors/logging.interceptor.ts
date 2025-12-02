import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request } from 'express';

/**
 * Logging Interceptor
 * Logs all HTTP requests and responses with correlation IDs
 * Provides request/response tracing for debugging and monitoring
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, ip, headers } = request;
    const correlationId = request['correlationId'] || 'unknown';
    const userAgent = headers['user-agent'] || 'unknown';
    const startTime = Date.now();

    // Log incoming request
    this.logger.log({
      message: `Incoming ${method} ${url}`,
      method,
      url,
      ip,
      userAgent,
      correlationId,
    });

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const { statusCode } = response;
        const duration = Date.now() - startTime;

        // Log successful response
        this.logger.log({
          message: `Outgoing ${method} ${url} ${statusCode}`,
          method,
          url,
          statusCode,
          duration: `${duration}ms`,
          correlationId,
        });
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        const statusCode = error.status || 500;

        // Log error response
        this.logger.error({
          message: `Error ${method} ${url} ${statusCode}`,
          method,
          url,
          statusCode,
          duration: `${duration}ms`,
          error: error.message,
          stack: error.stack,
          correlationId,
        });

        throw error;
      }),
    );
  }
}
