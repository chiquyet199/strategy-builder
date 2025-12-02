import { Module, Provider } from '@nestjs/common';
import { EmailService } from './email.service';
import { ConsoleEmailProvider } from './providers/console-email.provider';

/**
 * Email Module
 * Following SOLID principles - Open/Closed Principle
 * Easy to extend with new providers without modifying existing code
 *
 * To add a new provider (e.g., SendGrid, AWS SES, etc.):
 * 1. Create a new provider class implementing EmailProvider interface
 * 2. Update the EMAIL_PROVIDER provider below to use the new provider
 * 3. Or use environment variables to switch between providers
 */
const emailProvider: Provider = {
  provide: 'EMAIL_PROVIDER',
  useClass: ConsoleEmailProvider, // Default to console provider
  // In production, you can switch to:
  // useClass: SendGridEmailProvider,
  // useClass: AwsSesEmailProvider,
  // etc.
};

@Module({
  providers: [EmailService, emailProvider],
  exports: [EmailService],
})
export class EmailModule {}
