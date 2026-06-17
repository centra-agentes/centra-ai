import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationError } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3000);
  const env = configService.get<string>('app.nodeEnv', 'development');
  const isProd = env === 'production';

  // ─── Helmet (HTTP security headers) ────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: isProd ? [] : null,
        },
      },
      hsts: isProd ? { maxAge: 31536000, includeSubDomains: true } : false,
      frameguard: { action: 'deny' },
    }),
  );

  // ─── Prefijo global de API ──────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ─── CORS: restrictivo en producción ────────────────────────────────────
  if (isProd) {
    app.enableCors({
      origin: false, // mismo origen — el frontend está embebido en este servidor
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Master-Key'],
    });
  } else {
    app.enableCors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Master-Key'],
      exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
      credentials: false,
    });
  }

  // ─── Validación global ──────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors: ValidationError[]) => ({
        type: 'validation-error',
        title: 'Error de validación',
        status: 400,
        detail: 'Uno o más campos no cumplen con las reglas de validación',
        errors: errors.map((e) => ({ field: e.property, constraints: e.constraints })),
        timestamp: new Date().toISOString(),
      }),
    }),
  );

  // ─── Filtros e interceptores globales ───────────────────────────────────
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // ─── Swagger (solo en desarrollo) ───────────────────────────────────────
  if (!isProd) {
    const config = new DocumentBuilder()
      .setTitle('CentraVigía — API')
      .setDescription('Agente judicial inteligente. Solo disponible en modo desarrollo.')
      .setVersion('1.0')
      .addApiKey({ type: 'apiKey', in: 'header', name: 'X-API-Key' }, 'X-API-Key')
      .addBearerAuth()
      .addTag('Auth / API Keys')
      .addTag('Procesos Judiciales')
      .addTag('Publicaciones Procesales')
      .addTag('Vigilance')
      .addTag('Agent')
      .addTag('Health')
      .build();

    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config), {
      customSiteTitle: 'CentraVigía API Docs',
      swaggerOptions: { persistAuthorization: true },
    });

    logger.log(`📚 Swagger: http://localhost:${port}/docs`);
  }

  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 CentraVigía corriendo en puerto ${port} [${env}]`);
  logger.log(`🌐 Dashboard: http://localhost:${port}`);
  logger.log(`📡 API: http://localhost:${port}/api/v1`);
}

bootstrap();
