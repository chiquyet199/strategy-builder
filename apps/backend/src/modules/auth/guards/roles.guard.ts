import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
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
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    console.log('RolesGuard: Starting execution');

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    console.log('RolesGuard: Required roles:', requiredRoles);

    // No roles required, allow access
    if (!requiredRoles) {
      console.log('RolesGuard: No roles required, allowing access');
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    console.log(
      'RolesGuard: User from request:',
      user
        ? { userId: user.userId, email: user.email, role: user.role }
        : 'null',
    );

    if (!user) {
      console.log('RolesGuard: No user found, throwing ForbiddenException');
      throw new ForbiddenException('User not authenticated');
    }

    // Debug logging (can be removed in production)
    console.log('RolesGuard Debug:', {
      userRole: user.role,
      userRoleType: typeof user.role,
      masterRole: UserRole.MASTER,
      masterRoleType: typeof UserRole.MASTER,
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
