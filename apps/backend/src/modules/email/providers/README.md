# Email Providers

This directory contains email provider implementations following SOLID principles.

## Current Providers

- **ConsoleEmailProvider**: Logs emails to console (development/testing)

## Adding a New Email Provider

To add a new email provider (e.g., SendGrid, AWS SES, Mailgun, etc.):

### 1. Create Provider Class

Create a new file implementing the `EmailProvider` interface:

```typescript
// providers/sendgrid-email.provider.ts
import { Injectable } from '@nestjs/common';
import { EmailProvider, EmailOptions, EmailResult } from '../interfaces/email-provider.interface';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class SendGridEmailProvider implements EmailProvider {
  constructor() {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      const msg = {
        to: options.to,
        from: options.from || process.env.EMAIL_FROM,
        subject: options.subject,
        text: options.text,
        html: options.html,
      };

      await sgMail.send(msg);
      
      return {
        success: true,
        messageId: `sg-${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
```

### 2. Update Email Module

Update `email.module.ts` to use the new provider:

```typescript
const emailProvider: Provider = {
  provide: 'EMAIL_PROVIDER',
  useClass: process.env.EMAIL_PROVIDER === 'sendgrid' 
    ? SendGridEmailProvider 
    : ConsoleEmailProvider,
};
```

Or use environment-based configuration for more flexibility.

## SOLID Principles Applied

- **Single Responsibility**: Each provider handles only email sending
- **Open/Closed**: Open for extension (new providers), closed for modification
- **Liskov Substitution**: Any provider can replace another without breaking functionality
- **Interface Segregation**: Clean interface with only necessary methods
- **Dependency Inversion**: EmailService depends on EmailProvider abstraction, not concrete implementations

