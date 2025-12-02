import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { AuthService } from './auth.service';
import { User, UserRole } from './entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { EmailService } from '../email/email.service';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<Repository<User>>;
  let jwtService: jest.Mocked<JwtService>;
  let emailService: jest.Mocked<EmailService>;

  const mockUser: User = {
    id: 'user-id-123',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashedPassword123',
    role: UserRole.USER,
    resetPasswordToken: null,
    resetPasswordExpires: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const mockRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
    };

    const mockEmailService = {
      sendPasswordResetEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(User));
    jwtService = module.get<JwtService>(JwtService) as jest.Mocked<JwtService>;
    emailService = module.get<EmailService>(
      EmailService,
    ) as jest.Mocked<EmailService>;
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

    it('should successfully register a new user', async () => {
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('jwt-token-123');

      const result = await service.register(registerDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(userRepository.create).toHaveBeenCalled();
      expect(userRepository.save).toHaveBeenCalled();
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
      expect(result).toHaveProperty('access_token', 'jwt-token-123');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(mockUser.email);
    });

    it('should throw ConflictException if user already exists', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      expect(userRepository.findOne).toHaveBeenCalled();
      expect(userRepository.create).not.toHaveBeenCalled();
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should hash password before saving', async () => {
      const hashSpy = jest.spyOn(bcrypt, 'hash');
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('jwt-token-123');

      await service.register(registerDto);

      expect(hashSpy).toHaveBeenCalledWith(registerDto.password, 10);
      hashSpy.mockRestore();
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should successfully login with valid credentials', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jwtService.sign.mockReturnValue('jwt-token-123');

      const result = await service.login(loginDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: loginDto.email },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.password,
      );
      expect(jwtService.sign).toHaveBeenCalled();
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('user');
    });

    it('should throw UnauthorizedException if user does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(userRepository.findOne).toHaveBeenCalled();
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(bcrypt.compare).toHaveBeenCalled();
      expect(jwtService.sign).not.toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getProfile(mockUser.id);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(result).toHaveProperty('id', mockUser.id);
      expect(result).toHaveProperty('email', mockUser.email);
      expect(result).toHaveProperty('name', mockUser.name);
      expect(result).toHaveProperty('role', mockUser.role);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.getProfile('invalid-id')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('forgotPassword', () => {
    const forgotPasswordDto: ForgotPasswordDto = {
      email: 'test@example.com',
    };

    it('should generate reset token and send email for existing user', async () => {
      const userWithToken = { ...mockUser };
      userRepository.findOne.mockResolvedValue(userWithToken);
      userRepository.save.mockResolvedValue(userWithToken);
      emailService.sendPasswordResetEmail.mockResolvedValue(undefined);

      const result = await service.forgotPassword(forgotPasswordDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: forgotPasswordDto.email },
      });
      expect(userRepository.save).toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalled();
      expect(result.message).toContain('password reset link has been sent');
    });

    it('should return success message even if user does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.forgotPassword(forgotPasswordDto);

      expect(userRepository.findOne).toHaveBeenCalled();
      expect(userRepository.save).not.toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
      expect(result.message).toContain('password reset link has been sent');
    });

    it('should handle email service errors gracefully', async () => {
      const userWithToken = { ...mockUser };
      userRepository.findOne.mockResolvedValue(userWithToken);
      userRepository.save.mockResolvedValue(userWithToken);
      emailService.sendPasswordResetEmail.mockRejectedValue(
        new Error('Email service error'),
      );

      const result = await service.forgotPassword(forgotPasswordDto);

      expect(emailService.sendPasswordResetEmail).toHaveBeenCalled();
      expect(result.message).toContain('password reset link has been sent');
    });

    it('should set reset token expiry to 1 hour from now', async () => {
      const userWithToken = { ...mockUser };
      const now = new Date();
      jest.useFakeTimers();
      jest.setSystemTime(now);

      userRepository.findOne.mockResolvedValue(userWithToken);
      userRepository.save.mockImplementation((user: any) => {
        const expiryTime = user.resetPasswordExpires.getTime();
        const expectedExpiry = now.getTime() + 60 * 60 * 1000; // 1 hour
        expect(expiryTime).toBeCloseTo(expectedExpiry, -3); // Within 1 second
        return Promise.resolve(user as User);
      });
      emailService.sendPasswordResetEmail.mockResolvedValue(undefined);

      await service.forgotPassword(forgotPasswordDto);

      jest.useRealTimers();
    });
  });

  describe('resetPassword', () => {
    const resetToken = 'valid-reset-token';
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    const resetPasswordDto: ResetPasswordDto = {
      token: resetToken,
      newPassword: 'newPassword123',
    };

    it('should successfully reset password with valid token', async () => {
      const userWithToken = {
        ...mockUser,
        resetPasswordToken: hashedToken,
        resetPasswordExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      };
      userRepository.findOne.mockResolvedValue(userWithToken);
      userRepository.save.mockResolvedValue(userWithToken);

      const result = await service.resetPassword(resetPasswordDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { resetPasswordToken: hashedToken },
      });
      expect(userRepository.save).toHaveBeenCalled();
      expect(result.message).toBe('Password has been reset successfully');
    });

    it('should throw BadRequestException if token is invalid', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if token has expired', async () => {
      const userWithExpiredToken = {
        ...mockUser,
        resetPasswordToken: hashedToken,
        resetPasswordExpires: new Date(Date.now() - 1000), // Expired
      };
      userRepository.findOne.mockResolvedValue(userWithExpiredToken);

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should hash new password before saving', async () => {
      const hashSpy = jest.spyOn(bcrypt, 'hash');
      const userWithToken = {
        ...mockUser,
        resetPasswordToken: hashedToken,
        resetPasswordExpires: new Date(Date.now() + 60 * 60 * 1000),
      };
      userRepository.findOne.mockResolvedValue(userWithToken);
      userRepository.save.mockResolvedValue(userWithToken);

      await service.resetPassword(resetPasswordDto);

      expect(hashSpy).toHaveBeenCalledWith(resetPasswordDto.newPassword, 10);
      hashSpy.mockRestore();
    });

    it('should clear reset token and expiry after successful reset', async () => {
      const userWithToken = {
        ...mockUser,
        resetPasswordToken: hashedToken,
        resetPasswordExpires: new Date(Date.now() + 60 * 60 * 1000),
      };
      userRepository.findOne.mockResolvedValue(userWithToken);
      userRepository.save.mockImplementation((user: any) => {
        expect(user.resetPasswordToken).toBeNull();
        expect(user.resetPasswordExpires).toBeNull();
        return Promise.resolve(user as User);
      });

      await service.resetPassword(resetPasswordDto);

      expect(userRepository.save).toHaveBeenCalled();
    });
  });
});
