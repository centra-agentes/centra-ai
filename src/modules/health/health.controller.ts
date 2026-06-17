import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
@Public()         // no API key required for health checks
@SkipThrottle()   // Railway probes this endpoint every 30s — exclude from rate limits
export class HealthController {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check del servicio' })
  async check() {
    const dbOk = this.dataSource.isInitialized;

    return {
      status: dbOk ? 'ok' : 'degraded',
      instance: process.env.AGENT_INSTANCE_NAME || 'centravigia',
      version: process.env.npm_package_version || '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbOk ? 'ok' : 'error',
      services: {
        database: dbOk ? 'ok' : 'error',
        api: 'ok',
      },
    };
  }

  @Get('ping')
  ping() {
    return { pong: true, timestamp: new Date().toISOString() };
  }
}
