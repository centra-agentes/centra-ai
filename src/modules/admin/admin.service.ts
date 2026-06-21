import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { SystemConfigEntity } from './entities/system-config.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(SystemConfigEntity)
    private readonly configRepo: Repository<SystemConfigEntity>,
    private readonly configService: ConfigService,
  ) {}

  async getAnthropicKey(): Promise<string | null> {
    try {
      const row = await this.configRepo.findOne({ where: { key: 'anthropic_api_key' } });
      if (row?.value) return row.value;
    } catch {
      // Table may not exist yet on first boot; fall through to env var
    }
    return this.configService.get<string>('ANTHROPIC_API_KEY') ?? null;
  }

  async setAnthropicKey(value: string): Promise<void> {
    await this.configRepo.upsert({ key: 'anthropic_api_key', value }, ['key']);
    process.env.ANTHROPIC_API_KEY = value;
  }
}
