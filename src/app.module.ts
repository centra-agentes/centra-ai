import { join } from 'path';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';

import { appConfig, databaseConfig, ramaJudicialConfig } from './config';
import { ProcesosModule } from './modules/procesos/procesos.module';
import { PublicacionesModule } from './modules/publicaciones/publicaciones.module';
import { HealthController } from './modules/health/health.controller';
import { TasksService } from './modules/health/tasks.service';
import { VigilanceModule } from './modules/vigilance/vigilance.module';
import { AuthModule } from './modules/auth/auth.module';
import { ApiKeyGuard } from './modules/auth/guards/api-key.guard';
import { AgentModule } from './modules/agent/agent.module';

@Module({
  imports: [
    // ─── Config global ────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, ramaJudicialConfig],
      envFilePath: ['.env', '.env.local'],
    }),

    // ─── Servir el dashboard (public/) en la raíz ─────────────────────────
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      exclude: ['/api/(.*)'],
      serveStaticOptions: {
        index: 'index.html',
        fallthrough: true,
      },
    }),

    // ─── Base de datos ────────────────────────────────────────────────────
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        ...configService.get('database'),
      }),
      inject: [ConfigService],
    }),

    // ─── Rate limiting diferenciado por módulo (default: 60 req/min) ──────
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: configService.get<number>('THROTTLE_TTL', 60) * 1000,
            limit: configService.get<number>('THROTTLE_LIMIT', 60),
          },
        ],
      }),
      inject: [ConfigService],
    }),

    // ─── Scheduler ────────────────────────────────────────────────────────
    ScheduleModule.forRoot(),

    // ─── Feature modules ──────────────────────────────────────────────────
    AuthModule,
    ProcesosModule,
    PublicacionesModule,
    VigilanceModule,
    AgentModule,
  ],
  controllers: [HealthController],
  providers: [
    TasksService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: ApiKeyGuard },
  ],
})
export class AppModule {}
