import { Injectable, Logger } from '@nestjs/common';
import {
  EmailProvider,
  EmailOptions,
  EmailResult,
} from '../interfaces/email-provider.interface';

/**
 * Console Email Provider
 * Development provider that logs emails to console instead of sending them
 * Useful for development and testing environments
 */
@Injectable()
export class ConsoleEmailProvider implements EmailProvider {
  private readonly logger = new Logger(ConsoleEmailProvider.name);

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    const recipients = Array.isArray(options.to)
      ? options.to.join(', ')
      : options.to;

    this.logger.log('='.repeat(80));
    this.logger.log('📧 EMAIL SENT (Console Provider)');
    this.logger.log('='.repeat(80));
    this.logger.log(`To: ${recipients}`);
    this.logger.log(`From: ${options.from || 'noreply@strategy.app'}`);
    if (options.cc) {
      const cc = Array.isArray(options.cc) ? options.cc.join(', ') : options.cc;
      this.logger.log(`CC: ${cc}`);
    }
    if (options.bcc) {
      const bcc = Array.isArray(options.bcc)
        ? options.bcc.join(', ')
        : options.bcc;
      this.logger.log(`BCC: ${bcc}`);
    }
    this.logger.log(`Subject: ${options.subject}`);
    this.logger.log('-'.repeat(80));
    if (options.text) {
      this.logger.log('Text Content:');
      this.logger.log(options.text);
    }
    if (options.html) {
      this.logger.log('HTML Content:');
      this.logger.log(options.html);
    }
    this.logger.log('='.repeat(80));

    return {
      success: true,
      messageId: `console-${Date.now()}`,
    };
  }
}

