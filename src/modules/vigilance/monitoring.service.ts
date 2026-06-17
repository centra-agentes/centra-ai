import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { WatchService } from './watch.service';
import { AlertService, AlertPayload } from './alert.service';
import { VigilanceService } from './vigilance.service';
import { VigWatchEntity } from './entities/vig-watch.entity';

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private isRunning = false;

  constructor(
    private readonly watchService: WatchService,
    private readonly alertService: AlertService,
    private readonly vigilanceService: VigilanceService,
  ) {}

  @Cron('*/15 * * * *')
  async runPollingCycle(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Polling cycle already running — skipping');
      return;
    }

    this.isRunning = true;
    try {
      const watches = await this.watchService.findDueWatches();
      this.logger.log(`Polling cycle started — ${watches.length} watch(es) due`);

      for (const watch of watches) {
        await this.checkWatch(watch);
        // Pace requests to avoid overwhelming Rama Judicial
        await new Promise((r) => setTimeout(r, 2000));
      }
    } finally {
      this.isRunning = false;
      this.logger.log('Polling cycle complete');
    }
  }

  /** Polls a single watch. Returns number of new alerts created. */
  async checkWatch(watch: VigWatchEntity): Promise<{ newAlerts: number }> {
    try {
      const result = await this.vigilanceService.consultarRadicado({
        numero: watch.numeroRadicado,
        pagina: 1,
        paginaActuaciones: 1,
      });

      const allActuaciones = result.procesos.flatMap((p) =>
        p.actuaciones.map((a) => ({ ...a, idProceso: p.idProceso })),
      );

      const maxActuacionId = allActuaciones.length
        ? Math.max(...allActuaciones.map((a) => a.idRegActuacion))
        : null;

      if (watch.lastCheckedAt === null) {
        // First check — establish baseline, generate no alerts
        await this.watchService.markChecked(watch.id, maxActuacionId);
        this.logger.debug(`[${watch.id}] Baseline set (maxId=${maxActuacionId})`);
        return { newAlerts: 0 };
      }

      const newActuaciones =
        watch.lastKnownActuacionId !== null
          ? allActuaciones.filter((a) => a.idRegActuacion > watch.lastKnownActuacionId!)
          : [];

      if (newActuaciones.length) {
        const payloads: AlertPayload[] = newActuaciones.map((a) => ({
          watchId: watch.id,
          apiKeyId: watch.apiKeyId,
          numeroRadicado: watch.numeroRadicado,
          idProceso: a.idProceso,
          actuacion: a,
        }));
        await this.alertService.createAlerts(payloads);
        this.logger.log(
          `[${watch.id}] ${newActuaciones.length} new actuacion(s) — alerts created`,
        );
      }

      await this.watchService.markChecked(
        watch.id,
        maxActuacionId ?? watch.lastKnownActuacionId,
      );
      return { newAlerts: newActuaciones.length };
    } catch (error) {
      this.logger.error(`[${watch.id}] Poll failed: ${error.message}`);
      await this.watchService.recordFailure(watch.id);
      throw error;
    }
  }
}
