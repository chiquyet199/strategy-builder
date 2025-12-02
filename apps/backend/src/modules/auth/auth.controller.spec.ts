import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UserRole } from './entities/user.entity';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockUser = {
    id: 'user-id-123',
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.USER,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockAuthResult = {
    access_token: 'jwt-token-123',
    user: {
      ...mockUser,
      createdAt: mockUser.createdAt.toISOString(),
      updatedAt: mockUser.updatedAt.toISOString(),
    },
  };

  beforeEach(async () => {
    const mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
      getProfile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'newuser@example.com',
      name: 'New User',
      password: 'password123',
    };

    it('should successfully register a user', async () => {
      authService.register.mockResolvedValue(mockAuthResult);

      const result = await controller.register(registerDto);

      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual({
        data: mockAuthResult,
        message: 'User registered successfully',
      });
    });

    it('should throw ConflictException if user already exists', async () => {
      authService.register.mockRejectedValue(
        new ConflictException('User with this email already exists'),
      );

      await expect(controller.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should successfully login a user', async () => {
      authService.login.mockResolvedValue(mockAuthResult);

      const result = await controller.login(loginDto);

      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual({
        data: mockAuthResult,
        message: 'Login successful',
      });
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      authService.login.mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );

      await expect(controller.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('forgotPassword', () => {
    const forgotPasswordDto: ForgotPasswordDto = {
      email: 'test@example.com',
    };

    it('should successfully process forgot password request', async () => {
      const serviceResult = {
        message: 'If the email exists, a password reset link has been sent',
      };
      authService.forgotPassword.mockResolvedValue(serviceResult);

      const result = await controller.forgotPassword(forgotPasswordDto);

      expect(authService.forgotPassword).toHaveBeenCalledWith(
        forgotPasswordDto,
      );
      expect(result).toEqual({
        data: serviceResult,
        message: 'Password reset request processed',
      });
    });
  });

  describe('resetPassword', () => {
    const resetPasswordDto: ResetPasswordDto = {
      token: 'reset-token-123',
      newPassword: 'newPassword123',
    };

    it('should successfully reset password', async () => {
      const serviceResult = {
        message: 'Password has been reset successfully',
      };
      authService.resetPassword.mockResolvedValue(serviceResult);

      const result = await controller.resetPassword(resetPasswordDto);

      expect(authService.resetPassword).toHaveBeenCalledWith(resetPasswordDto);
      expect(result).toEqual({
        data: serviceResult,
        message: 'Password reset successful',
      });
    });

    it('should throw BadRequestException for invalid token', async () => {
      authService.resetPassword.mockRejectedValue(
        new BadRequestException('Invalid or expired reset token'),
      );

      await expect(controller.resetPassword(resetPasswordDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getProfile', () => {
    const mockRequest = {
      user: {
        userId: 'user-id-123',
        email: 'test@example.com',
        role: UserRole.USER,
      },
    };

    const mockProfile = {
      id: 'user-id-123',
      email: 'test@example.com',
      name: 'Test User',
      role: UserRole.USER,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    it('should successfully get user profile', async () => {
      authService.getProfile.mockResolvedValue(mockProfile);

      const result = await controller.getProfile(mockRequest);

      expect(authService.getProfile).toHaveBeenCalledWith(
        mockRequest.user.userId,
      );
      expect(result).toEqual({
        data: mockProfile,
        message: 'Profile retrieved successfully',
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      authService.getProfile.mockRejectedValue(
        new UnauthorizedException('User not found'),
      );

      await expect(controller.getProfile(mockRequest)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});

