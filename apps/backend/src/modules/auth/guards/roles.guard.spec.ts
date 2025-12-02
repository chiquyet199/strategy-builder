import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    guard = new RolesGuard(reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockContext = (user?: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
        }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  };

  describe('canActivate', () => {
    it('should allow access if no roles required', () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);
      const context = createMockContext();

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException if user is not authenticated', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const context = createMockContext(null);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('User not authenticated');
    });

    it('should allow access if user has master role', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const context = createMockContext({
        userId: 'user-123',
        email: 'user@example.com',
        role: UserRole.MASTER,
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access if user has required role', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const context = createMockContext({
        userId: 'user-123',
        email: 'user@example.com',
        role: UserRole.ADMIN,
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access if user has one of multiple required roles', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN, UserRole.USER]);
      const context = createMockContext({
        userId: 'user-123',
        email: 'user@example.com',
        role: UserRole.USER,
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException if user does not have required role', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const context = createMockContext({
        userId: 'user-123',
        email: 'user@example.com',
        role: UserRole.USER,
      });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('Insufficient permissions');
    });

    it('should handle empty roles array', () => {
      reflector.getAllAndOverride.mockReturnValue([]);
      const context = createMockContext({
        userId: 'user-123',
        email: 'user@example.com',
        role: UserRole.USER,
      });

      // Empty array means roles are required but none match, should deny access
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });
});

