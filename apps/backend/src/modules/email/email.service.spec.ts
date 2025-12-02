import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import {
  EmailProvider,
  EmailOptions,
  EmailResult,
} from './interfaces/email-provider.interface';

describe('EmailService', () => {
  let service: EmailService;
  let emailProvider: jest.Mocked<EmailProvider>;

  const mockEmailResult: EmailResult = {
    success: true,
    messageId: 'test-message-id',
  };

  beforeEach(async () => {
    const mockProvider: EmailProvider = {
      sendEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: 'EMAIL_PROVIDER',
          useValue: mockProvider,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    emailProvider = module.get('EMAIL_PROVIDER');
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.FRONTEND_URL;
    delete process.env.EMAIL_FROM;
  });

  describe('sendEmail', () => {
    it('should delegate to email provider', async () => {
      const options: EmailOptions = {
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test body',
        from: 'sender@example.com',
      };

      emailProvider.sendEmail.mockResolvedValue(mockEmailResult);

      const result = await service.sendEmail(options);

      expect(emailProvider.sendEmail).toHaveBeenCalledWith(options);
      expect(result).toEqual(mockEmailResult);
    });
  });

  describe('sendPasswordResetEmail', () => {
    const email = 'user@example.com';
    const resetToken = 'reset-token-123';

    it('should send password reset email with default URL', async () => {
      emailProvider.sendEmail.mockResolvedValue(mockEmailResult);

      const result = await service.sendPasswordResetEmail(email, resetToken);

      expect(emailProvider.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: email,
          subject: 'Password Reset Request',
          from: 'noreply@strategy.app',
        }),
      );

      const callArgs = emailProvider.sendEmail.mock.calls[0][0];
      expect(callArgs.html).toContain(resetToken);
      expect(callArgs.text).toContain(resetToken);
      expect(callArgs.html).toContain('Password Reset Request');
      expect(callArgs.html).toContain('Reset Password');
      expect(result).toEqual(mockEmailResult);
    });

    it('should use custom reset URL if provided', async () => {
      const customUrl = 'https://custom-domain.com/reset?token=';
      emailProvider.sendEmail.mockResolvedValue(mockEmailResult);

      await service.sendPasswordResetEmail(email, resetToken, customUrl);

      const callArgs = emailProvider.sendEmail.mock.calls[0][0];
      expect(callArgs.html).toContain(customUrl);
      expect(callArgs.text).toContain(customUrl);
    });

    it('should use FRONTEND_URL from env if set', async () => {
      process.env.FRONTEND_URL = 'https://app.example.com';
      emailProvider.sendEmail.mockResolvedValue(mockEmailResult);

      await service.sendPasswordResetEmail(email, resetToken);

      const callArgs = emailProvider.sendEmail.mock.calls[0][0];
      expect(callArgs.html).toContain('https://app.example.com');
    });

    it('should use EMAIL_FROM from env if set', async () => {
      process.env.EMAIL_FROM = 'custom@example.com';
      emailProvider.sendEmail.mockResolvedValue(mockEmailResult);

      await service.sendPasswordResetEmail(email, resetToken);

      const callArgs = emailProvider.sendEmail.mock.calls[0][0];
      expect(callArgs.from).toBe('custom@example.com');
    });

    it('should include expiration notice in email', async () => {
      emailProvider.sendEmail.mockResolvedValue(mockEmailResult);

      await service.sendPasswordResetEmail(email, resetToken);

      const callArgs = emailProvider.sendEmail.mock.calls[0][0];
      expect(callArgs.html).toContain('expire in 1 hour');
      expect(callArgs.text).toContain('expire in 1 hour');
    });

    it('should include security notice in email', async () => {
      emailProvider.sendEmail.mockResolvedValue(mockEmailResult);

      await service.sendPasswordResetEmail(email, resetToken);

      const callArgs = emailProvider.sendEmail.mock.calls[0][0];
      expect(callArgs.html).toContain("didn't request this");
      expect(callArgs.text).toContain("didn't request this");
    });
  });
});

