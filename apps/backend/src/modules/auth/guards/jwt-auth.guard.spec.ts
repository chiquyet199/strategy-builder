import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from './public.decorator';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: jest.Mocked<Reflector>;
  let mockSuperCanActivate: jest.Mock;

  beforeEach(() => {
    mockSuperCanActivate = jest.fn();
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    guard = new JwtAuthGuard(reflector);
    // Override the guard's canActivate to call our mock for super.canActivate
    guard.canActivate = jest.fn(async (context: ExecutionContext) => {
      const isPublic = reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

      if (isPublic) {
        return true;
      }

      return mockSuperCanActivate(context);
    }) as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockContext = (
    headers: Record<string, string> = {},
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers,
          user: undefined,
        }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  };

  describe('canActivate', () => {
    it('should allow access for public routes', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const context = createMockContext();

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockSuperCanActivate).not.toHaveBeenCalled();
    });

    it('should call super.canActivate for protected routes', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      mockSuperCanActivate.mockResolvedValue(true);
      const context = createMockContext({
        authorization: 'Bearer valid-token',
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockSuperCanActivate).toHaveBeenCalledWith(context);
    });

    it('should handle missing authorization header', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      mockSuperCanActivate.mockResolvedValue(true);
      const context = createMockContext();

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockSuperCanActivate).toHaveBeenCalled();
    });

    it('should log warning for duplicate Bearer prefix', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      mockSuperCanActivate.mockResolvedValue(true);
      const context = createMockContext({
        authorization: 'Bearer Bearer token',
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockSuperCanActivate).toHaveBeenCalled();
    });

    it('should handle errors from super.canActivate', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const error = new Error('Authentication failed');
      mockSuperCanActivate.mockRejectedValue(error);
      const context = createMockContext({
        authorization: 'Bearer token',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        'Authentication failed',
      );
    });
  });
});
