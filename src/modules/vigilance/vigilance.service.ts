import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { VigilarRadicadoDto } from './dto/vigilar-radicado.dto';
import {
  RamaJudicialNotFoundException,
  RamaJudicialUnavailableException,
  RamaJudicialTimeoutException,
} from '../../common/exceptions/rama-judicial.exception';

export interface Sujeto {
  idRegSujeto: number;
  tipoSujeto: string;
  esEmplazado: boolean;
  identificacion: string | null;
  nombreRazonSocial: string;
}

export interface Actuacion {
  idRegActuacion: number;
  llaveProceso: string;
  consActuacion: number;
  fechaActuacion: string;
  actuacion: string;
  anotacion: string;
  fechaInicial: string;
  fechaFinal: string;
  fechaRegistro: string;
  conDocumentos: boolean;
}

export interface DetalleProceso {
  idRegProceso: number;
  llaveProceso: string;
  fechaProceso: string;
  despacho: string;
  ponente: string;
  tipoProceso: string;
  claseProceso: string;
  subclaseProceso: string;
  recurso: string | null;
  ubicacion: string;
  contenidoRadicacion: string;
  fechaConsulta: string;
  ultimaActualizacion: string;
}

export interface ProcesoCompleto {
  idProceso: number;
  llaveProceso: string;
  fechaProceso: string;
  fechaUltimaActuacion: string;
  despacho: string;
  departamento: string;
  sujetosProcesales: string;
  esPrivado: boolean;
  detalle: DetalleProceso | null;
  sujetos: Sujeto[];
  actuaciones: Actuacion[];
  paginacionActuaciones: any;
}

export interface ResultadoVigilancia {
  tipoConsulta: string;
  numero: string;
  procesos: ProcesoCompleto[];
  paginacion: any;
}

@Injectable()
export class VigilanceService {
  private readonly logger = new Logger(VigilanceService.name);
  private readonly client: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    const timeout = this.configService.get<number>('ramaJudicial.timeoutMs') ?? 20000;
    const v2BaseUrl = this.configService.get<string>('ramaJudicial.v2BaseUrl');

    this.client = axios.create({
      baseURL: v2BaseUrl,
      timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Accept-Language': 'es-419,es;q=0.9',
        'Origin': 'https://consultaprocesos.ramajudicial.gov.co',
        'Referer': 'https://consultaprocesos.ramajudicial.gov.co/',
        'sec-ch-ua': '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
        'priority': 'u=1, i',
      },
    });

    this.client.interceptors.response.use(
      (res) => { this.logger.debug(`✓ ${res.config.url} → ${res.status}`); return res; },
      (err) => { this.logger.warn(`✗ ${err.config?.url} → ${err.response?.status || err.message}`); return Promise.reject(err); },
    );
  }

  // ─── Consulta completa por radicado ─────────────────────────────────────
  async consultarRadicado(dto: VigilarRadicadoDto): Promise<ResultadoVigilancia> {
    const { numero, pagina = 1, paginaActuaciones = 1 } = dto;

    try {
      const busqueda = await this.client.get('/Procesos/Consulta/NumeroRadicacion', {
        params: { numero, SoloActivos: false, pagina },
      });

      const { procesos = [], paginacion } = busqueda.data;

      if (!procesos.length) {
        return { tipoConsulta: 'NumeroRadicacion', numero, procesos: [], paginacion };
      }

      const procesosCompletos: ProcesoCompleto[] = await Promise.all(
        procesos.map(async (proceso: any) => {
          const id = proceso.idProceso;

          const [detalle, sujetos, actuaciones] = await Promise.allSettled([
            this.client.get(`/Proceso/Detalle/${id}`),
            this.client.get(`/Proceso/Sujetos/${id}`, { params: { pagina: 1 } }),
            this.client.get(`/Proceso/Actuaciones/${id}`, { params: { pagina: paginaActuaciones } }),
          ]);

          return {
            ...proceso,
            detalle: detalle.status === 'fulfilled' ? detalle.value.data : null,
            sujetos: sujetos.status === 'fulfilled' ? (sujetos.value.data?.sujetos ?? []) : [],
            actuaciones: actuaciones.status === 'fulfilled' ? (actuaciones.value.data?.actuaciones ?? []) : [],
            paginacionActuaciones: actuaciones.status === 'fulfilled' ? actuaciones.value.data?.paginacion : null,
          };
        }),
      );

      return { tipoConsulta: 'NumeroRadicacion', numero, procesos: procesosCompletos, paginacion };
    } catch (error) {
      this.logger.error(`[consultarRadicado] ${error.message}`, error.stack);
      this.handleHttpError(error, { tipoConsulta: 'radicado', numero: dto.numero });
    }
  }

  // ─── Solo actuaciones de un proceso (paginadas) ──────────────────────────
  async obtenerActuaciones(idProceso: string, pagina = 1) {
    try {
      const res = await this.client.get(`/Proceso/Actuaciones/${idProceso}`, { params: { pagina } });
      return res.data;
    } catch (error) {
      this.logger.error(`[obtenerActuaciones] ${error.message}`, error.stack);
      this.handleHttpError(error, { idProceso });
    }
  }

  // ─── Solo sujetos de un proceso ──────────────────────────────────────────
  async obtenerSujetos(idProceso: string, pagina = 1) {
    try {
      const res = await this.client.get(`/Proceso/Sujetos/${idProceso}`, { params: { pagina } });
      return res.data;
    } catch (error) {
      this.logger.error(`[obtenerSujetos] ${error.message}`, error.stack);
      this.handleHttpError(error, { idProceso });
    }
  }

  // ─── Detalle de un proceso ───────────────────────────────────────────────
  async obtenerDetalle(idProceso: string) {
    try {
      const res = await this.client.get(`/Proceso/Detalle/${idProceso}`);
      return res.data;
    } catch (error) {
      this.logger.error(`[obtenerDetalle] ${error.message}`, error.stack);
      this.handleHttpError(error, { idProceso });
    }
  }

  private handleHttpError(error: any, context: Record<string, unknown>): never {
    if (!error.response) {
      throw new RamaJudicialUnavailableException(
        'El servicio de la Rama Judicial no está disponible',
        context,
        error,
      );
    }

    const status: number = error.response.status;

    if (status === 404 || status === 204) {
      throw new RamaJudicialNotFoundException(
        'No se encontraron resultados para la consulta',
        context,
        error,
      );
    }

    if (status === 408 || error.code === 'ECONNABORTED') {
      throw new RamaJudicialTimeoutException(
        'La solicitud excedió el tiempo de espera',
        context,
        error,
      );
    }

    if (status === 429) {
      throw new RamaJudicialUnavailableException(
        'Límite de solicitudes excedido. Espere unos momentos.',
        { ...context, rateLimit: true },
        error,
      );
    }

    throw new RamaJudicialUnavailableException(
      `Error al consultar la Rama Judicial (${status})`,
      { ...context, status },
      error,
    );
  }
}
