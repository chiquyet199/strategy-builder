/**
 * Email Provider Interface
 * Following SOLID principles - Interface Segregation and Dependency Inversion
 * This interface defines the contract for all email providers
 */
export interface EmailProvider {
  /**
   * Send an email
   * @param options Email sending options
   * @returns Promise that resolves when email is sent
   */
  sendEmail(options: EmailOptions): Promise<EmailResult>;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}
