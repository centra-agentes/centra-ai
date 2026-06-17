import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

const CENTRA_LICENSE_ENDPOINT = 'https://centra-agentes.com/api/v1/licenses/validate';

@Injectable()
export class LicenseService implements OnApplicationBootstrap {
  private readonly logger = new Logger(LicenseService.name);
  private isValid = false;

  constructor(private readonly configService: ConfigService) {}

  async onApplicationBootstrap() {
    const key = this.configService.get<string>('CENTRA_LICENSE_KEY', '');

    if (!key) {
      this.logger.warn(
        '⚠️  CENTRA_LICENSE_KEY no configurada — el agente funciona en modo sin licencia.',
      );
      this.logger.warn(
        '   Obtén una licencia en https://centra-agentes.com',
      );
      return;
    }

    if (!key.startsWith('clk_')) {
      this.logger.error(`✗ Formato de licencia inválido. Debe comenzar con "clk_"`);
      return;
    }

    await this.validateWithCentra(key);
  }

  private async validateWithCentra(key: string) {
    try {
      const res = await axios.post(
        CENTRA_LICENSE_ENDPOINT,
        { key },
        { timeout: 8000, headers: { 'Content-Type': 'application/json' } },
      );

      if (res.data?.valid) {
        this.isValid = true;
        const exp = res.data.expires_at
          ? ` · vence ${new Date(res.data.expires_at).toLocaleDateString('es-CO')}`
          : '';
        this.logger.log(`✓ Licencia activa${exp}`);
      } else {
        this.logger.error(
          `✗ Licencia inválida o expirada. Renueva en https://centra-agentes.com`,
        );
      }
    } catch {
      // El servidor de licencias no está disponible — modo offline
      this.isValid = true;
      this.logger.warn(
        '⚠️  No se pudo verificar la licencia con Centra (modo offline). El agente continúa.',
      );
    }
  }

  get valid() {
    return this.isValid;
  }
}
