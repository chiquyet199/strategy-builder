import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

/**
 * Roles Guard
 * Protects routes by checking if the authenticated user has one of the required roles
 * Master role has access to everything
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    this.logger.debug('Starting execution');

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    this.logger.debug(`Required roles: ${JSON.stringify(requiredRoles)}`);

    // No roles required, allow access
    if (!requiredRoles) {
      this.logger.debug('No roles required, allowing access');
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    this.logger.debug(
      'User from request',
      user
        ? { userId: user.userId, email: user.email, role: user.role }
        : null,
    );

    if (!user) {
      this.logger.warn('No user found, throwing ForbiddenException');
      throw new ForbiddenException('User not authenticated');
    }

    this.logger.debug('Role check', {
      userRole: user.role,
      requiredRoles,
      roleMatch: user.role === UserRole.MASTER,
    });

    // Master role has access to everything
    if (user.role === UserRole.MASTER) {
      return true;
    }

    // Check if user has one of the required roles
    const hasRole = requiredRoles.some((role) => user.role === role);

    if (!hasRole) {
      throw new ForbiddenException(
        `Insufficient permissions. Required roles: ${requiredRoles.join(', ')}, User role: ${user.role}`,
      );
    }

    return true;
  }
}
