import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThanOrEqual, Repository } from 'typeorm';
import { VigWatchEntity } from './entities/vig-watch.entity';
import { CreateWatchDto } from './dto/create-watch.dto';
import { UpdateWatchDto } from './dto/update-watch.dto';

const MAX_FAILURES = 5;
const POLL_INTERVAL_MS = 15 * 60 * 1000;

@Injectable()
export class WatchService {
  constructor(
    @InjectRepository(VigWatchEntity)
    private readonly repo: Repository<VigWatchEntity>,
  ) {}

  create(apiKeyId: string, dto: CreateWatchDto): Promise<VigWatchEntity> {
    const watch = this.repo.create({
      apiKeyId,
      numeroRadicado: dto.numeroRadicado,
      label: dto.label ?? null,
    });
    return this.repo.save(watch);
  }

  findAll(apiKeyId: string): Promise<VigWatchEntity[]> {
    return this.repo.find({
      where: { apiKeyId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, apiKeyId: string): Promise<VigWatchEntity> {
    const watch = await this.repo.findOne({ where: { id, apiKeyId } });
    if (!watch) throw new NotFoundException(`Watch ${id} not found`);
    return watch;
  }

  async update(id: string, apiKeyId: string, dto: UpdateWatchDto): Promise<VigWatchEntity> {
    const watch = await this.findOne(id, apiKeyId);
    Object.assign(watch, dto);
    return this.repo.save(watch);
  }

  async remove(id: string, apiKeyId: string): Promise<void> {
    const watch = await this.findOne(id, apiKeyId);
    await this.repo.remove(watch);
  }

  /** Returns active watches that are due for polling */
  findDueWatches(): Promise<VigWatchEntity[]> {
    return this.repo.find({
      where: [
        { isActive: true, lastCheckedAt: IsNull() },
        { isActive: true, nextCheckAt: LessThanOrEqual(new Date()) },
      ],
    });
  }

  /** Returns active watches with a scheduled check that is now due */
  findScheduledDue(): Promise<VigWatchEntity[]> {
    return this.repo.find({
      where: {
        isActive: true,
        scheduledCheckAt: LessThanOrEqual(new Date()),
      },
    });
  }

  /** Clears the scheduled check after it fires */
  clearScheduledCheck(id: string): Promise<void> {
    return this.repo.update(id, { scheduledCheckAt: null }).then(() => undefined);
  }

  /** Records a successful poll result and schedules the next check */
  async markChecked(id: string, lastKnownActuacionId: number | null): Promise<void> {
    await this.repo.update(id, {
      lastCheckedAt: new Date(),
      lastKnownActuacionId,
      consecutiveFailures: 0,
      nextCheckAt: new Date(Date.now() + POLL_INTERVAL_MS),
    });
  }

  /** Increments failure counter and auto-deactivates after MAX_FAILURES */
  async recordFailure(id: string): Promise<void> {
    const watch = await this.repo.findOne({ where: { id } });
    if (!watch) return;

    const failures = watch.consecutiveFailures + 1;
    const isActive = failures < MAX_FAILURES;

    await this.repo.update(id, {
      consecutiveFailures: failures,
      isActive,
      nextCheckAt: isActive ? new Date(Date.now() + POLL_INTERVAL_MS) : null,
    });
  }
}
