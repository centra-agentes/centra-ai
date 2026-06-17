import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import axios, { AxiosInstance } from "axios";
import * as cheerio from "cheerio";

import { FiltrarPublicacionesDto, BuscarHistoricoDto } from "./dto/filtrar-publicaciones.dto";
import { PublicacionLogEntity } from "./entities/publicacion-log.entity";
import {
  RamaJudicialUnavailableException,
  RamaJudicialTimeoutException,
} from "../../common/exceptions/rama-judicial.exception";

// ─── Portlet constants ───────────────────────────────────────────────────────

// Main publicaciones portlet — instance ID configurable via PUBLICACIONES_PORTLET_NS
const PORTLET_BASE =
  "co_com_avanti_efectosProcesales_PublicacionesEfectosProcesalesPortletV2_INSTANCE_";

// Consulta histórica — DDL portlet listing courts with pre-May-2024 data.
// Instance IDs for DDL portlets are stable; verified 2026-05-09.
const HIST_PORTLET_ID =
  "com_liferay_dynamic_data_lists_web_portlet_DDLDisplayPortlet_INSTANCE_HzvzcwxDwGAK";
const HIST_NS =
  "_com_liferay_dynamic_data_lists_web_portlet_DDLDisplayPortlet_INSTANCE_HzvzcwxDwGAK_";
const HIST_PATH = "/web/publicaciones-procesales/consulta-historica";

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface Publicacion {
  articleId: string;
  titulo: string;
  tipoPublicacion: string;
  departamento: string;
  municipio: string;
  entidad: string;
  especialidad: string;
  despacho: string;
  fechaPublicacion: string;
  urlDetalle: string;
}

export interface ResultadoPublicaciones {
  publicaciones: Publicacion[];
  total: number;
  pagina: number;
}

export interface DespachoHistorico {
  departamento: string;
  municipio: string;
  entidad: string;
  especialidad: string;
  codigo: string;
  descripcion: string;
  /** URL at portalhistorico.ramajudicial.gov.co for this court's historical publications */
  urlHistorico: string;
}

export interface ResultadoHistorico {
  despachos: DespachoHistorico[];
  total: number;
  pagina: number;
  nota: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class PublicacionesService {
  private readonly logger = new Logger(PublicacionesService.name);
  private readonly client: AxiosInstance;
  private readonly baseUrl: string;
  private readonly portletId: string;
  private readonly portletNs: string;
  private readonly maxRetries: number;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(PublicacionLogEntity)
    private readonly logRepo: Repository<PublicacionLogEntity>,
  ) {
    this.baseUrl = this.configService.get<string>("ramaJudicial.publicacionesUrl");

    // Instance ID: override via PUBLICACIONES_PORTLET_NS if Rama Judicial redeploys portlet
    const instanceId = this.configService.get<string>(
      "ramaJudicial.publicacionesPortletNs",
      "BIyXQFHVaYaq",
    );
    this.portletId = `${PORTLET_BASE}${instanceId}`;
    this.portletNs = `_${PORTLET_BASE}${instanceId}_`;

    this.maxRetries = this.configService.get<number>("ramaJudicial.maxRetries", 3);

    const timeout = this.configService.get<number>(
      "ramaJudicial.publicacionesTimeoutMs",
      30000,
    );

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout,
      maxRedirects: 5,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-CO,es;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        Referer: `${this.baseUrl}/web/publicaciones-procesales/inicio`,
        Connection: "keep-alive",
      },
    });

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

  // ─── buscarPublicaciones ──────────────────────────────────────────────────

  async buscarPublicaciones(
    dto: FiltrarPublicacionesDto,
  ): Promise<ResultadoPublicaciones> {
    const inicio = Date.now();
    try {
      const params: Record<string, any> = {
        p_p_id: this.portletId,
        p_p_lifecycle: "0",
        p_p_state: "normal",
        p_p_mode: "view",
        [`${this.portletNs}action`]: "busqueda",
        [`${this.portletNs}pagina`]: dto.pagina ?? 1,
        [`${this.portletNs}cantReg`]: dto.cantRecords ?? 20,
      };

      if (dto.fechaInicio) params[`${this.portletNs}fechaInicio`] = dto.fechaInicio;
      if (dto.fechaFin) params[`${this.portletNs}fechaFin`] = dto.fechaFin;
      if (dto.departamento) params[`${this.portletNs}idDepto`] = dto.departamento;
      if (dto.idDeptoIdCategory)
        params[`${this.portletNs}idDeptoIdCategory`] = dto.idDeptoIdCategory;
      if (dto.municipio) params[`${this.portletNs}idMuni`] = dto.municipio;
      if (dto.despacho) params[`${this.portletNs}idDespacho`] = dto.despacho;
      if (dto.categoria) params[`${this.portletNs}categoria`] = dto.categoria;
      if (dto.verTotales) params[`${this.portletNs}verTotales`] = "true";

      const html = await this.conRetry(
        () =>
          this.client
            .get("/web/publicaciones-procesales/inicio", {
              params,
              responseType: "text",
            })
            .then((r) =>
              typeof r.data === "string" ? r.data : JSON.stringify(r.data),
            ),
        { modulo: "publicaciones" },
      );

      const resultado = this.parsearResultados(html, dto.pagina ?? 1);
      await this.registrarConsulta(dto, resultado.total);
      return resultado;
    } finally {
      this.logger.debug(`buscarPublicaciones → ${Date.now() - inicio}ms`);
    }
  }

  // ─── publicacionesHoy ────────────────────────────────────────────────────

  async publicacionesHoy(departamento?: string): Promise<ResultadoPublicaciones> {
    const hoy = new Date().toISOString().split("T")[0];
    return this.buscarPublicaciones({
      fechaInicio: hoy,
      fechaFin: hoy,
      departamento,
      pagina: 1,
      cantRecords: 50,
    });
  }

  // ─── buscarHistorico ──────────────────────────────────────────────────────
  //
  // Returns a paginated directory of courts that published Estado Electrónico /
  // publicaciones before May 10, 2024. Each entry links to that court's dedicated
  // Liferay site at portalhistorico.ramajudicial.gov.co.
  //
  // NOTE: The consulta-historica Liferay DDL portlet does not expose a server-side
  // search filter — it is a plain paginated table. The optional departamento /
  // municipio / entidad params are applied client-side against the fetched page.
  // To browse all 6,500+ courts, paginate through without text filters.
  //
  // NOTE: Filtering historical publications by date or category is not possible
  // through this portal — each court maintains its own independent Liferay site.

  async buscarHistorico(dto: BuscarHistoricoDto): Promise<ResultadoHistorico> {
    const inicio = Date.now();
    try {
      const params: Record<string, any> = {
        p_p_id: HIST_PORTLET_ID,
        p_p_lifecycle: "0",
        p_p_state: "normal",
        p_p_mode: "view",
        [`${HIST_NS}delta`]: dto.cantRecords ?? 20,
        [`${HIST_NS}cur`]: dto.pagina ?? 1,
      };

      const html = await this.conRetry(
        () =>
          this.client
            .get(HIST_PATH, { params, responseType: "text" })
            .then((r) =>
              typeof r.data === "string" ? r.data : JSON.stringify(r.data),
            ),
        { modulo: "historico" },
      );

      return this.parsearHistorico(html, dto.pagina ?? 1, dto);
    } finally {
      this.logger.debug(`buscarHistorico → ${Date.now() - inicio}ms`);
    }
  }

  // ─── parsearResultados ────────────────────────────────────────────────────

  private parsearResultados(html: string, pagina: number): ResultadoPublicaciones {
    const $ = cheerio.load(html);
    const publicaciones: Publicacion[] = [];

    // Selector uses class-only (.tramites) instead of tag+class (tr.tramites) for
    // resilience against element-type changes. Verified live: <tr class=" col-xs-12 tramites ">
    $(".tramites").each((_, el) => {
      const efecto = $(el).find("div.efecto");
      if (!efecto.length) return;

      const tituloEl = efecto.find("div.titulo-publicacion a");
      const titulo = tituloEl.text().trim();
      const urlDetalle = tituloEl.attr("href") || "";

      // articleId appears as a portlet param in the detail URL: _...articleId=12345
      const articleIdMatch = urlDetalle.match(/articleId=(\d+)/);
      const articleId = articleIdMatch ? articleIdMatch[1] : "";

      // span.categoria-ep text format: "Clave:Valor" or "Clave: Valor"
      const categorias: Record<string, string> = {};
      efecto.find("span.categoria-ep").each((_, span) => {
        const texto = $(span).text().trim();
        const sep = texto.indexOf(":");
        if (sep > -1) {
          categorias[texto.substring(0, sep).trim().toLowerCase()] =
            texto.substring(sep + 1).trim();
        }
      });

      // p.publish-date contains <i>Fecha de Publicación:</i> prefix; regex extracts date
      const fechaTexto = efecto.find("p.publish-date").text().trim();
      const fechaMatch = fechaTexto.match(/(\d{4}-\d{2}-\d{2})/);
      const fechaPublicacion = fechaMatch ? fechaMatch[1] : "";

      publicaciones.push({
        articleId,
        titulo,
        tipoPublicacion: categorias["tipo de publicación"] || "",
        departamento: categorias["departamento"] || "",
        municipio: categorias["municipio"] || "",
        entidad: categorias["entidad"] || "",
        especialidad: categorias["especialidad"] || "",
        despacho: categorias["despacho"] || "",
        fechaPublicacion,
        urlDetalle,
      });
    });

    if (!publicaciones.length) {
      // Log HTML snippet to aid debugging if selectors drift on future portal updates
      const snippet = html.substring(0, 600).replace(/\s+/g, " ");
      this.logger.warn(
        `parsearResultados: 0 publicaciones encontradas. Posible drift de selectores. HTML[0:600]: ${snippet}`,
      );
    }

    // Extract total — handles periods as thousand separator (e.g. "1.234 Resultados")
    let total = publicaciones.length;
    const totalMatch = html.match(/(\d[\d.]*)\s*[Rr]esultado/);
    if (totalMatch) {
      total = parseInt(totalMatch[1].replace(/\./g, ""), 10);
    }

    this.logger.debug(
      `Parseadas ${publicaciones.length} publicaciones de ${total} totales (página ${pagina})`,
    );
    return { publicaciones, total, pagina };
  }

  // ─── parsearHistorico ─────────────────────────────────────────────────────

  private parsearHistorico(
    html: string,
    pagina: number,
    filtros: Pick<BuscarHistoricoDto, "departamento" | "municipio" | "entidad">,
  ): ResultadoHistorico {
    const $ = cheerio.load(html);
    const despachos: DespachoHistorico[] = [];

    // The DDL portlet renders a standard Bootstrap table (table.table-bordered)
    // Columns: Departamento | Municipio | Entidad | Especialidad | Código | Descripcion(link)
    $("table.table-bordered tbody tr").each((_, tr) => {
      const cells = $(tr).find("td");
      if (cells.length < 6) return;

      const row: DespachoHistorico = {
        departamento: $(cells[0]).text().trim(),
        municipio: $(cells[1]).text().trim(),
        entidad: $(cells[2]).text().trim(),
        especialidad: $(cells[3]).text().trim(),
        codigo: $(cells[4]).text().trim(),
        descripcion:
          $(cells[5]).find("a").text().trim() || $(cells[5]).text().trim(),
        urlHistorico: $(cells[5]).find("a").attr("href") || "",
      };

      // Client-side text filter (portlet has no server-side search parameter)
      const up = (s?: string) => (s ?? "").toUpperCase();
      if (
        filtros.departamento &&
        !up(row.departamento).includes(up(filtros.departamento))
      )
        return;
      if (
        filtros.municipio &&
        !up(row.municipio).includes(up(filtros.municipio))
      )
        return;
      if (filtros.entidad && !up(row.entidad).includes(up(filtros.entidad)))
        return;

      despachos.push(row);
    });

    if (!despachos.length) {
      this.logger.warn(
        "parsearHistorico: 0 despachos — posible drift de selectores en consulta-historica",
      );
    }

    // DDL pagination shows: "Mostrando el intervalo X - Y de 6.560 resultados"
    let total = 0;
    const totalMatch = html.match(/de\s+([\d.]+)\s+resultado/i);
    if (totalMatch) {
      total = parseInt(totalMatch[1].replace(/\./g, ""), 10);
    }

    return {
      despachos,
      total,
      pagina,
      nota:
        "Directorio de despachos con publicaciones anteriores al 10 de mayo de 2024. " +
        "Para consultar sus publicaciones históricas, acceda a la urlHistorico de cada despacho en portalhistorico.ramajudicial.gov.co. " +
        "No es posible filtrar por fecha o categoría — cada despacho mantiene su propio portal independiente.",
    };
  }

  // ─── Retry & error handling ───────────────────────────────────────────────

  private async conRetry<T>(
    fn: () => Promise<T>,
    context: Record<string, unknown>,
    retries = 0,
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries < this.maxRetries && this.esReintentable(error)) {
        const delay = Math.pow(2, retries) * 1000;
        this.logger.warn(
          `Reintentando publicaciones (${retries + 1}/${this.maxRetries}) en ${delay}ms...`,
        );
        await this.sleep(delay);
        return this.conRetry(fn, context, retries + 1);
      }
      return this.manejarError(error, context);
    }
  }

  private esReintentable(error: any): boolean {
    if (!error.response) return true; // timeout o red
    const s = error.response.status;
    return s === 429 || s === 503 || s === 504;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private manejarError(error: any, context: Record<string, unknown>): never {
    this.logger.error(`Error en publicaciones: ${error.message}`, error.stack);

    if (!error.response) {
      throw new RamaJudicialUnavailableException(
        "El portal de Publicaciones Procesales no está disponible",
        context,
        error,
      );
    }

    const status: number = error.response.status;

    if (status === 408 || error.code === "ECONNABORTED") {
      throw new RamaJudicialTimeoutException(
        "La solicitud excedió el tiempo de espera",
        context,
        error,
      );
    }

    if (status === 429) {
      throw new RamaJudicialUnavailableException(
        "Límite de solicitudes excedido. Espere unos momentos.",
        { ...context, rateLimit: true },
        error,
      );
    }

    throw new RamaJudicialUnavailableException(
      `Error al consultar publicaciones procesales (${status})`,
      { ...context, status },
      error,
    );
  }

  // ─── registrarConsulta ────────────────────────────────────────────────────

  private async registrarConsulta(
    dto: FiltrarPublicacionesDto,
    total: number,
  ): Promise<void> {
    try {
      const log = this.logRepo.create({
        departamento: dto.departamento,
        municipio: dto.municipio,
        despacho: dto.despacho,
        categoria: dto.categoria,
        fechaInicio: dto.fechaInicio,
        fechaFin: dto.fechaFin,
        totalResultados: total,
        fechaConsulta: new Date(),
      });
      await this.logRepo.save(log);
    } catch {
      // No rompemos por fallo de logging
    }
  }
}
