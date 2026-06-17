import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VigAlertEntity } from './entities/vig-alert.entity';
import { QueryAlertsDto } from './dto/query-alerts.dto';
import { Actuacion } from './vigilance.service';

export interface AlertPayload {
  watchId: string;
  apiKeyId: string;
  numeroRadicado: string;
  idProceso: number;
  actuacion: Actuacion;
}

@Injectable()
export class AlertService {
  constructor(
    @InjectRepository(VigAlertEntity)
    private readonly repo: Repository<VigAlertEntity>,
  ) {}

  async createAlerts(payloads: AlertPayload[]): Promise<void> {
    if (!payloads.length) return;
    const entities = payloads.map((p) =>
      this.repo.create({
        watchId: p.watchId,
        apiKeyId: p.apiKeyId,
        numeroRadicado: p.numeroRadicado,
        idProceso: p.idProceso,
        actuacionId: p.actuacion.idRegActuacion,
        actuacionData: p.actuacion as unknown as Record<string, unknown>,
      }),
    );
    await this.repo.insert(entities);
  }

  async findAll(
    apiKeyId: string,
    dto: QueryAlertsDto,
  ): Promise<[VigAlertEntity[], number]> {
    const { isRead, numeroRadicado, page = 1, limit = 20 } = dto;

    const qb = this.repo
      .createQueryBuilder('a')
      .where('a.api_key_id = :apiKeyId', { apiKeyId })
      .orderBy('a.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (isRead !== undefined) {
      qb.andWhere('a.is_read = :isRead', { isRead });
    }
    if (numeroRadicado) {
      qb.andWhere('a.numero_radicado = :numeroRadicado', { numeroRadicado });
    }

    return qb.getManyAndCount();
  }

  async markRead(id: string, apiKeyId: string): Promise<VigAlertEntity> {
    const alert = await this.repo.findOne({ where: { id, apiKeyId } });
    if (!alert) throw new NotFoundException(`Alert ${id} not found`);
    alert.isRead = true;
    return this.repo.save(alert);
  }

  async markAllRead(apiKeyId: string): Promise<{ updated: number }> {
    const result = await this.repo.update(
      { apiKeyId, isRead: false },
      { isRead: true },
    );
    return { updated: result.affected ?? 0 };
  }

  async remove(id: string, apiKeyId: string): Promise<void> {
    const alert = await this.repo.findOne({ where: { id, apiKeyId } });
    if (!alert) throw new NotFoundException(`Alert ${id} not found`);
    await this.repo.remove(alert);
  }
}
