import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    console.log('JwtAuthGuard: Starting execution');
    
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    console.log('JwtAuthGuard: Is public route:', isPublic);
    
    if (isPublic) {
      console.log('JwtAuthGuard: Public route, allowing access');
      return true;
    }
    
    try {
      console.log('JwtAuthGuard: Calling super.canActivate (Passport JWT strategy)');
      const request = context.switchToHttp().getRequest();
      const authHeader = request.headers.authorization;
      console.log('JwtAuthGuard: Authorization header present:', !!authHeader);
      
      if (authHeader) {
        // Check for duplicate "Bearer Bearer" issue
        if (authHeader.startsWith('Bearer Bearer ')) {
          console.warn('JwtAuthGuard: WARNING - Duplicate "Bearer" detected in Authorization header!');
          console.warn('JwtAuthGuard: This usually means you included "Bearer" in Swagger UI token field.');
          console.warn('JwtAuthGuard: Swagger UI automatically adds "Bearer" prefix, so just enter your token without it.');
        }
        
        // Log first 20 chars of token for debugging (don't log full token for security)
        const tokenPreview = authHeader.startsWith('Bearer ')
          ? authHeader.substring(7, 27) + '...'
          : authHeader.substring(0, 20) + '...';
        console.log('JwtAuthGuard: Token preview:', tokenPreview);
        console.log('JwtAuthGuard: Token format correct (starts with Bearer):', authHeader.startsWith('Bearer '));
        console.log('JwtAuthGuard: Full auth header length:', authHeader.length);
      }
      
      const result = await super.canActivate(context);
      console.log('JwtAuthGuard: Result:', result);
      console.log('JwtAuthGuard: User after validation:', request.user);
      return result as boolean;
    } catch (error) {
      console.error('JwtAuthGuard: Error during authentication:', error);
      console.error('JwtAuthGuard: Error message:', error.message);
      console.error('JwtAuthGuard: Error stack:', error.stack);
      throw error;
    }
  }
}
