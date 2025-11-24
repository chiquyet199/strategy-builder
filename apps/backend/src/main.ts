import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  
  // Enable CORS for frontend connection
  app.enableCors({
    origin: 'http://localhost:5173', // Vite default port
    credentials: true,
  });
  
  await app.listen(3000);
  console.log('🚀 Backend server running on http://localhost:3000');
}
bootstrap();
