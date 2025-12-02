# Email Module

## Overview
The Email module provides email sending functionality following SOLID principles. It uses the Dependency Inversion Principle, depending on an `EmailProvider` interface rather than concrete implementations.

## Key Services

### EmailService
Main service for sending emails:
- **sendEmail()**: Send a generic email using the configured provider
- **sendPasswordResetEmail()**: Send a password reset email with formatted HTML and text content

## Email Providers

The service uses an `EmailProvider` interface, allowing for different implementations:
- Console provider (development/testing)
- SMTP provider (production)
- Third-party services (SendGrid, AWS SES, etc.)

## Configuration

### Environment Variables
- `EMAIL_FROM`: Sender email address (default: "noreply@strategy.app")
- `FRONTEND_URL`: Frontend URL for password reset links (default: "http://localhost:5173")

## Email Templates

### Password Reset Email
- HTML template with styled button and link
- Plain text fallback
- Includes expiration notice (1 hour)
- Security notice for unsolicited emails

## Testing
Unit tests: `email.service.spec.ts`

