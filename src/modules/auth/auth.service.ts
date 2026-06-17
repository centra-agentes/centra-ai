import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { ApiKeyEntity } from './entities/api-key.entity';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(ApiKeyEntity)
    private readonly repo: Repository<ApiKeyEntity>,
  ) {}

  // ─── Crear key ────────────────────────────────────────────────────────────
  async createKey(
    dto: CreateApiKeyDto,
  ): Promise<{ apiKey: ApiKeyEntity; rawKey: string }> {
    // cv_<64 hex chars> — 67 characters total, url-safe
    const rawKey = `cv_${randomBytes(32).toString('hex')}`;
    const keyHash = this.hash(rawKey);
    // Keep first 12 chars ('cv_' + 9 random hex) as the visible prefix
    const keyPrefix = rawKey.slice(0, 12);

    const apiKey = this.repo.create({
      name: dto.name,
      keyHash,
      keyPrefix,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });

    await this.repo.save(apiKey);
    this.logger.log(`API key creada: "${dto.name}" [${keyPrefix}...]`);

    // rawKey is returned once and NEVER persisted in plaintext
    return { apiKey, rawKey };
  }

  // ─── Validar key entrante ─────────────────────────────────────────────────
  async validateKey(rawKey: string): Promise<ApiKeyEntity | null> {
    try {
      const keyHash = this.hash(rawKey);
      const apiKey = await this.repo.findOne({
        where: { keyHash, isActive: true },
      });

      if (!apiKey) return null;
      if (apiKey.expiresAt && new Date() > apiKey.expiresAt) return null;

      // Fire-and-forget usage stats — do not block the request
      this.repo
        .createQueryBuilder()
        .update(ApiKeyEntity)
        .set({ lastUsedAt: new Date(), requestsCount: () => 'requests_count + 1' })
        .where('id = :id', { id: apiKey.id })
        .execute()
        .catch((err) =>
          this.logger.warn(`No se pudo actualizar stats de API key: ${err.message}`),
        );

      return apiKey;
    } catch (err) {
      this.logger.error(`Error al validar API key: ${err.message}`);
      return null;
    }
  }

  // ─── Listar keys ──────────────────────────────────────────────────────────
  async listKeys(): Promise<ApiKeyEntity[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  // ─── Revocar key (desactivar) ─────────────────────────────────────────────
  async revokeKey(id: string): Promise<void> {
    const apiKey = await this.repo.findOne({ where: { id } });
    if (!apiKey) throw new NotFoundException(`API key "${id}" no encontrada`);

    await this.repo.update(id, { isActive: false });
    this.logger.log(`API key revocada: "${apiKey.name}" [${apiKey.keyPrefix}...]`);
  }

  // ─── Eliminar key (permanente) ────────────────────────────────────────────
  async deleteKey(id: string): Promise<void> {
    const apiKey = await this.repo.findOne({ where: { id } });
    if (!apiKey) throw new NotFoundException(`API key "${id}" no encontrada`);

    await this.repo.remove(apiKey);
    this.logger.log(`API key eliminada: "${apiKey.name}" [${apiKey.keyPrefix}...]`);
  }

  // ─── Hash SHA-256 (mismo mecanismo ya en uso en ProcesosService) ──────────
  private hash(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }
}
