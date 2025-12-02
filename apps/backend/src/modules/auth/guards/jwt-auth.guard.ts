import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    this.logger.debug('Starting execution');
    
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    this.logger.debug(`Is public route: ${isPublic}`);
    
    if (isPublic) {
      this.logger.debug('Public route, allowing access');
      return true;
    }
    
    try {
      this.logger.debug('Calling super.canActivate (Passport JWT strategy)');
      const request = context.switchToHttp().getRequest();
      const authHeader = request.headers.authorization;
      this.logger.debug(`Authorization header present: ${!!authHeader}`);
      
      if (authHeader) {
        // Check for duplicate "Bearer Bearer" issue
        if (authHeader.startsWith('Bearer Bearer ')) {
          this.logger.warn('WARNING - Duplicate "Bearer" detected in Authorization header!');
          this.logger.warn('This usually means you included "Bearer" in Swagger UI token field.');
          this.logger.warn('Swagger UI automatically adds "Bearer" prefix, so just enter your token without it.');
        }
        
        // Log first 20 chars of token for debugging (don't log full token for security)
        const tokenPreview = authHeader.startsWith('Bearer ')
          ? authHeader.substring(7, 27) + '...'
          : authHeader.substring(0, 20) + '...';
        this.logger.debug(`Token preview: ${tokenPreview}`);
        this.logger.debug(`Token format correct (starts with Bearer): ${authHeader.startsWith('Bearer ')}`);
        this.logger.debug(`Full auth header length: ${authHeader.length}`);
      }
      
      const result = await super.canActivate(context);
      this.logger.debug(`Result: ${result}`);
      this.logger.debug('User after validation', { user: request.user });
      return result as boolean;
    } catch (error) {
      this.logger.error('Error during authentication', error.stack);
      this.logger.error(`Error message: ${error.message}`);
      throw error;
    }
  }
}
