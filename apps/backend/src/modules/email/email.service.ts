import { Injectable, Inject } from '@nestjs/common';
import {
  EmailProvider,
  EmailOptions,
  EmailResult,
} from './interfaces/email-provider.interface';

/**
 * Email Service
 * Following SOLID principles - Dependency Inversion Principle
 * Depends on abstraction (EmailProvider interface) not concrete implementation
 */
@Injectable()
export class EmailService {
  constructor(
    @Inject('EMAIL_PROVIDER') private readonly emailProvider: EmailProvider,
  ) {}

  /**
   * Send an email using the configured provider
   */
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    return this.emailProvider.sendEmail(options);
  }

  /**
   * Send a password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
    resetUrl?: string,
  ): Promise<EmailResult> {
    const defaultResetUrl =
      resetUrl ||
      `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

    const subject = 'Password Reset Request';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
            <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>
            <p>You requested to reset your password. Click the button below to reset it:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${defaultResetUrl}" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
            </div>
            <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
            <p style="color: #666; font-size: 12px; word-break: break-all;">${defaultResetUrl}</p>
            <p style="color: #666; font-size: 14px; margin-top: 30px;">This link will expire in 1 hour.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
          </div>
        </body>
      </html>
    `;

    const text = `
Password Reset Request

You requested to reset your password. Use the link below to reset it:

${defaultResetUrl}

This link will expire in 1 hour.

If you didn't request this, please ignore this email.
    `.trim();

    return this.sendEmail({
      to: email,
      subject,
      html,
      text,
      from: process.env.EMAIL_FROM || 'noreply@strategy.app',
    });
  }
}

