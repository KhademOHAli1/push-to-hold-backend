import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * Bootstrap the NestJS application.
 * Configures:
 * - Global API prefix (/api/v1)
 * - Validation pipes for DTOs
 * - CORS for frontend apps
 * - Swagger API documentation
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global API prefix
  app.setGlobalPrefix('api/v1');

  // Validation pipe for DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS configuration
  app.enableCors({
    origin: [
      'http://localhost:3000', // Next.js dev
      'http://localhost:8080', // Flutter web
      process.env.FRONTEND_URL,
    ].filter(Boolean),
    credentials: true,
  });

  // Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('Push to Hold API')
    .setDescription(`
      Push to Hold Democracy Index API.
      
      ## Overview
      This API powers the Push to Hold app, which helps consumers identify companies
      that actively defend democracy and keep distance from right-wing extremism.
      
      ## Authentication
      Most endpoints require JWT authentication. Include the token in the Authorization header:
      \`Authorization: Bearer <token>\`
      
      ## Traffic Light System
      - 🟢 **Green**: Company signed democracy pledge, no conflicts
      - 🟡 **Yellow**: No clear stance found yet
      - 🔴 **Red**: Conflicts with democracy criteria documented
    `)
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'User authentication and registration')
    .addTag('Scan', 'Barcode scanning and product lookup')
    .addTag('Companies', 'Company search and details')
    .addTag('Democracy', 'Timeline, evidence, and open data')
    .addTag('Portal', 'Company representative self-service')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`🚀 Push to Hold API running on http://localhost:${port}/api/v1`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}
bootstrap();
