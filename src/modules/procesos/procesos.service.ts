import {
  BadRequestException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThan } from "typeorm";
import * as crypto from "crypto";

import { RamaJudicialHttpService } from "./rama-judicial-http.service";
import { ConsultaCacheEntity } from "./entities/consulta-cache.entity";
import {
  BuscarPorNombreDto,
  BuscarPorRadicadoDto,
  BuscarEmpresaDto,
  TipoPersona,
} from "./dto/buscar-proceso.dto";
import {
  RamaJudicialNotFoundException,
  RamaJudicialUnavailableException,
  RamaJudicialTimeoutException,
} from "../../common/exceptions/rama-judicial.exception";

@Injectable()
export class ProcesosService {
  private readonly logger = new Logger(ProcesosService.name);
  private readonly cacheTtl: number;

  constructor(
    private readonly httpService: RamaJudicialHttpService,
    private readonly configService: ConfigService,
    @InjectRepository(ConsultaCacheEntity)
    private readonly cacheRepo: Repository<ConsultaCacheEntity>,
  ) {
    this.cacheTtl = this.configService.get<number>(
      "ramaJudicial.cacheTtlSeconds",
    );
  }

  // ─── Búsqueda por nombre / apellido ─────────────────────────────────────
  async buscarPorNombre(dto: BuscarPorNombreDto) {
    if (
      dto.tipoPersona === TipoPersona.NATURAL &&
      (!dto.apellido || dto.apellido.trim() === "")
    ) {
      throw new BadRequestException(
        "El apellido es requerido para búsqueda de persona natural",
      );
    }

    const params = {
      tipoPersona: dto.tipoPersona,
      nombre: dto.nombre.toUpperCase().trim(),
      apellido: dto.apellido?.toUpperCase().trim() || "",
      pagina: dto.pagina,
      cantRecords: dto.cantRecords,
    };

    const cacheKey = this.generarCacheKey("nombre", params);
    const cached = await this.obtenerCache(cacheKey);
    if (cached) return { ...cached, _cached: true };

    try {
      const queryParams: Record<string, any> = {
        tipoPersona: params.tipoPersona,
        nombre: params.nombre,
        pagina: params.pagina,
        cantRecords: params.cantRecords,
      };
      if (params.apellido) queryParams.apellido = params.apellido;

      const data = await this.httpService.get("/NombreRazonSocial", {
        params: queryParams,
      });

      await this.guardarCache(cacheKey, data, "nombre", params);
      return data;
    } catch (error) {
      this.manejarError(error, "buscarPorNombre");
    }
  }

  // ─── Búsqueda por número de radicado ────────────────────────────────────
  async buscarPorRadicado(dto: BuscarPorRadicadoDto) {
    const cacheKey = this.generarCacheKey("radicado", { numero: dto.numero });
    const cached = await this.obtenerCache(cacheKey);
    if (cached) return { ...cached, _cached: true };

    try {
      const data = await this.httpService.get("/NumeroRadicacion", {
        params: { numero: dto.numero },
      });

      await this.guardarCache(
        cacheKey,
        data,
        "radicado",
        { numero: dto.numero },
        // radicados tienen TTL más largo porque no cambian tanto
        this.cacheTtl * 2,
      );
      return data;
    } catch (error) {
      this.manejarError(error, "buscarPorRadicado");
    }
  }

  // ─── Búsqueda por empresa / razón social ─────────────────────────────────
  async buscarEmpresa(dto: BuscarEmpresaDto) {
    const params = {
      tipoPersona: TipoPersona.JURIDICA,
      nombre: dto.razonSocial.toUpperCase().trim(),
      pagina: dto.pagina,
      cantRecords: dto.cantRecords,
    };

    const cacheKey = this.generarCacheKey("empresa", params);
    const cached = await this.obtenerCache(cacheKey);
    if (cached) return { ...cached, _cached: true };

    try {
      const data = await this.httpService.get("/NombreRazonSocial", {
        params: {
          tipoPersona: TipoPersona.JURIDICA,
          nombre: params.nombre,
          pagina: params.pagina,
          cantRecords: params.cantRecords,
        },
      });

      await this.guardarCache(cacheKey, data, "empresa", params);
      return data;
    } catch (error) {
      this.manejarError(error, "buscarEmpresa");
    }
  }

  // ─── Detalle de un proceso ────────────────────────────────────────────────
  async obtenerDetalleProceso(idProceso: string) {
    const cacheKey = this.generarCacheKey("detalle", { idProceso });
    const cached = await this.obtenerCache(cacheKey);
    if (cached) return { ...cached, _cached: true };

    try {
      const data = await this.httpService.get(
        `/Proceso/${idProceso}/Actuaciones`,
      );
      await this.guardarCache(cacheKey, data, "detalle", { idProceso });
      return data;
    } catch (error) {
      this.manejarError(error, "obtenerDetalleProceso");
    }
  }

  // ─── Helpers de caché ─────────────────────────────────────────────────────
  private generarCacheKey(tipo: string, params: Record<string, any>): string {
    const str = `${tipo}:${JSON.stringify(params)}`;
    return crypto.createHash("sha256").update(str).digest("hex");
  }

  private async obtenerCache(cacheKey: string): Promise<any | null> {
    try {
      const entry = await this.cacheRepo.findOne({ where: { cacheKey } });
      if (!entry) return null;

      if (!entry.estaVigente) {
        await this.cacheRepo.remove(entry);
        return null;
      }

      // Incrementar hits
      await this.cacheRepo.increment({ cacheKey }, "hits", 1);
      this.logger.debug(`Cache HIT: ${cacheKey.substring(0, 16)}...`);
      return entry.resultado;
    } catch {
      return null;
    }
  }

  private async guardarCache(
    cacheKey: string,
    resultado: any,
    tipoConsulta: string,
    parametros: Record<string, any>,
    ttlSeconds?: number,
  ): Promise<void> {
    try {
      const expiraEn = new Date();
      expiraEn.setSeconds(
        expiraEn.getSeconds() + (ttlSeconds || this.cacheTtl),
      );

      const entry = this.cacheRepo.create({
        cacheKey,
        resultado,
        tipoConsulta,
        parametros,
        expiraEn,
      });

      await this.cacheRepo.save(entry);
    } catch (error) {
      // No rompemos si el caché falla
      this.logger.warn(`No se pudo guardar caché: ${error.message}`);
    }
  }

  // ─── Limpieza de caché expirado (llamado por scheduler) ──────────────────
  async limpiarCacheExpirado(): Promise<number> {
    const result = await this.cacheRepo.delete({
      expiraEn: LessThan(new Date()),
    });
    return result.affected || 0;
  }

  private manejarError(error: any, contexto: string): any {
    const status = error.response?.status;
    const mensaje = error.message || "Error desconocido";

    this.logger.error(`[${contexto}] ${mensaje}`, error.stack);

    if (status === 404 || status === 204) {
      throw new RamaJudicialNotFoundException(
        "No se encontraron resultados para la búsqueda realizada",
        { contexto, status },
      );
    }

    if (!error.response) {
      throw new RamaJudicialUnavailableException(
        "El servicio de la Rama Judicial no está disponible. Intente más tarde.",
        { contexto },
        error,
      );
    }

    if (status === 408 || error.code === 'ECONNABORTED') {
      throw new RamaJudicialTimeoutException(
        "La solicitud excedió el tiempo de espera",
        { contexto, timeout: this.configService.get('ramaJudicial.timeoutMs') },
        error,
      );
    }

    if (status === 429) {
      throw new RamaJudicialUnavailableException(
        "Se ha excedido el límite de solicitudes. Espere unos momentos.",
        { contexto, status, rateLimit: true },
        error,
      );
    }

    if (status >= 500) {
      throw new RamaJudicialUnavailableException(
        "Error interno del servicio de la Rama Judicial",
        { contexto, status },
        error,
      );
    }

    throw new RamaJudicialUnavailableException(
      `Error al consultar: ${mensaje}`,
      { contexto, status },
      error,
    );
  }
}
