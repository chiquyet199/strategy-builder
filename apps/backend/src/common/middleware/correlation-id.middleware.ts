import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Correlation ID Middleware
 * Adds a unique correlation ID to each request for traceability
 * The correlation ID is:
 * - Generated if not present in request headers
 * - Added to response headers
 * - Available in request object for logging
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Get correlation ID from request header or generate new one
    const correlationId =
      req.headers['x-correlation-id'] || req.headers['x-request-id'] || uuidv4();

    // Add to request object for use in controllers/services
    req['correlationId'] = correlationId;

    // Add to response headers for client traceability
    res.setHeader('X-Correlation-ID', correlationId as string);

    next();
  }
}

