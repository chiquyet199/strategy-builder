# Authentication & Authorization

This module handles user authentication and role-based access control (RBAC).

## Features

- JWT-based authentication
- Role-based access control (RBAC)
- Three user roles: `USER`, `ADMIN`, `MASTER`
- Password reset functionality
- Rate limiting protection

## User Roles

- **USER**: Default role for regular users
- **ADMIN**: Administrative users with elevated permissions
- **MASTER**: Super admin with access to everything (bypasses all role checks)

## Usage

### Protecting Routes with Roles

Use the `@Roles()` decorator along with `@UseGuards()` to protect routes:

```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { UserRole } from './entities/user.entity';

// Admin or Master only
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MASTER)
@Get('admin/users')
async getAllUsers() {
  // Only admin and master can access
}

// Master only
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MASTER)
@Post('admin/system/reset')
async resetSystem() {
  // Only master can access
}

// Public route (no authentication required)
@Public()
@Get('public/info')
async getPublicInfo() {
  // Anyone can access
}
```

### Accessing User Information in Controllers

The authenticated user is available in the request object:

```typescript
@Get('profile')
@UseGuards(JwtAuthGuard)
async getProfile(@Request() req) {
  const userId = req.user.userId;
  const email = req.user.email;
  const role = req.user.role;
  
  // Use the user information
}
```

## Creating a Master Account

### Option 1: Direct Database Update

```sql
UPDATE users 
SET role = 'master' 
WHERE email = 'your-email@example.com';
```

### Option 2: Using TypeORM in a Script

Create a script to set a user as master:

```typescript
// scripts/set-master.ts
import { AppModule } from '../app.module';
import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, UserRole } from '../modules/auth/entities/user.entity';
import { Repository } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userRepo = app.get<Repository<User>>(getRepositoryToken(User));
  
  const email = 'master@example.com';
  const user = await userRepo.findOne({ where: { email } });
  
  if (user) {
    user.role = UserRole.MASTER;
    await userRepo.save(user);
    console.log(`✅ Set ${email} as MASTER`);
  } else {
    console.log(`❌ User ${email} not found`);
  }
  
  await app.close();
}

bootstrap();
```

## Security Notes

- Master role bypasses all role checks - use with extreme caution
- Always validate roles on the backend - frontend checks are for UX only
- JWT tokens include role, but the strategy fetches the latest role from the database
- Role changes take effect on the next token refresh (24h default)

