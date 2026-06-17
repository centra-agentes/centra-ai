import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { RamaJudicialTimeoutException, RamaJudicialUnavailableException } from '../../common/exceptions/rama-judicial.exception';

@Injectable()
export class RamaJudicialHttpService {
  private readonly logger = new Logger(RamaJudicialHttpService.name);
  private readonly client: AxiosInstance;
  private readonly maxRetries: number;

  constructor(private readonly configService: ConfigService) {
    const baseURL = this.configService.get<string>('ramaJudicial.baseUrl');
    const timeout = this.configService.get<number>('ramaJudicial.timeoutMs');
    this.maxRetries = this.configService.get<number>('ramaJudicial.maxRetries');

    this.client = axios.create({
      baseURL,
      timeout,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'es-CO,es;q=0.9',
        Referer: 'https://consultaprocesos.ramajudicial.gov.co/',
        Origin: 'https://consultaprocesos.ramajudicial.gov.co',
        Connection: 'keep-alive',
      },
    });

    // Interceptor de respuesta para logging
    this.client.interceptors.response.use(
      (res) => {
        this.logger.debug(`✓ ${res.config.url} → ${res.status}`);
        return res;
      },
      (err) => {
        this.logger.warn(
          `✗ ${err.config?.url} → ${err.response?.status || err.message}`,
        );
        return Promise.reject(err);
      },
    );
  }

  async get<T>(
    url: string,
    config?: AxiosRequestConfig,
    retries = 0,
  ): Promise<T> {
    try {
      const response = await this.client.get<T>(url, config);
      return response.data;
    } catch (error) {
      if (retries < this.maxRetries && this.esReintentable(error)) {
        const delay = Math.pow(2, retries) * 1000;
        this.logger.warn(
          `Reintentando (${retries + 1}/${this.maxRetries}) en ${delay}ms...`,
        );
        await this.sleep(delay);
        return this.get<T>(url, config, retries + 1);
      }

      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        throw new RamaJudicialTimeoutException(
          `Timeout al conectar con ${url}`,
          { url, retries },
          error,
        );
      }

      if (!error.response) {
        throw new RamaJudicialUnavailableException(
          'No se pudo conectar con el servicio de la Rama Judicial',
          { url, retries },
          error,
        );
      }

      throw error;
    }
  }

  private esReintentable(error: any): boolean {
    if (!error.response) return true; // timeout o red
    const status = error.response.status;
    return status === 429 || status === 503 || status === 504;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
