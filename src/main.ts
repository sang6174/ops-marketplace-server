// src/main.ts
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module.js';
import { API_PREFIX, API_VERSION } from './common/constants/index.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3000);
  const nodeEnv = configService.get<string>('app.nodeEnv', 'development');

  app.useLogger(app.get(Logger));

  // ===== Security middleware =====
  app.use(helmet());
  app.use(compression());
  app.enableCors({
    origin:
      nodeEnv === 'production'
        ? [configService.get<string>('app.appUrl', '')]
        : '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
    exposedHeaders: ['Idempotency-Replayed', 'x-request-id'],
    credentials: true,
  });
  app.use(cookieParser());

  // ===== API prefix & versioning =====
  app.setGlobalPrefix(API_PREFIX);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: API_VERSION,
  });

  // ===== Global ValidationPipe =====
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ===== Swagger (just on at dev/staging`) =====
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('OPS Marketplace API')
      .setDescription('Multi-vendor marketplace REST API documentation')
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'JWT',
      )
      .addTag('Auth', 'Register, login, refresh token, logout, etc.')
      .addTag('Users', 'User management')
      .addTag('Addresses', 'Address management')
      .addTag('Admin', 'Admin management')
      .addTag('Shops', 'Shop management')
      .addTag('Categories', 'Category management')
      .addTag('Products', 'Product management')
      .addTag('Cart', 'Shopping cart')
      .addTag('Orders', 'Order management')
      .addTag('Payments', 'Payment management')
      .addTag('Ledger', 'Ledger management')
      .addTag('Payouts', 'Payout management')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${API_PREFIX}/docs`, app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });

    console.log(`Swagger docs: http://localhost:${port}/${API_PREFIX}/docs`);
  }

  await app.listen(port);

  console.log(`Server running on: http://localhost:${port}/${API_PREFIX}/v1`);
  console.log(`Environment: ${nodeEnv}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
