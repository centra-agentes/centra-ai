import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ProcesosService } from '../procesos/procesos.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(private readonly procesosService: ProcesosService) {}

  // Limpia el caché expirado cada hora
  @Cron(CronExpression.EVERY_HOUR)
  async limpiarCacheExpirado() {
    const eliminados = await this.procesosService.limpiarCacheExpirado();
    if (eliminados > 0) {
      this.logger.log(`Caché: ${eliminados} entradas expiradas eliminadas`);
    }
  }

  // Log de disponibilidad cada 6 horas
  @Cron('0 */6 * * *')
  async verificarDisponibilidad() {
    this.logger.log(
      `[${new Date().toISOString()}] Servicio activo - uptime: ${Math.floor(process.uptime())}s`,
    );
  }
}
