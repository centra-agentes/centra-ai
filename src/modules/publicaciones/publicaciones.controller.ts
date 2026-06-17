import {
  Controller,
  Get,
  Query,
  HttpCode,
  HttpStatus,
  ValidationPipe,
} from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { PublicacionesService } from "./publicaciones.service";
import {
  BuscarHistoricoDto,
  CategoriaPublicacion,
  FiltrarPublicacionesDto,
} from "./dto/filtrar-publicaciones.dto";
import { buildResponse } from "../../common/interfaces/api-response.interface";

const SOURCE = "publicacionesprocesales.ramajudicial.gov.co";

@ApiTags("Publicaciones Procesales")
@Controller("publicaciones")
export class PublicacionesController {
  constructor(private readonly publicacionesService: PublicacionesService) {}

  // ─── GET /publicaciones ──────────────────────────────────────────────────
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Filtrar publicaciones procesales",
    description:
      "Consulta publicaciones procesales diarias con múltiples filtros. " +
      "Cubre publicaciones desde el 14 de mayo de 2024 en adelante. " +
      `Fuente: ${SOURCE}`,
  })
  @ApiQuery({ name: "departamento", required: false, example: "05", description: "Código DANE del departamento" })
  @ApiQuery({ name: "municipio", required: false, example: "05001" })
  @ApiQuery({ name: "despacho", required: false })
  @ApiQuery({ name: "categoria", enum: CategoriaPublicacion, required: false })
  @ApiQuery({ name: "fechaInicio", required: false, example: "2026-01-01" })
  @ApiQuery({ name: "fechaFin", required: false, example: "2026-12-31" })
  @ApiQuery({ name: "pagina", required: false, example: 1 })
  @ApiQuery({ name: "cantRecords", required: false, example: 20, description: "Máx 100" })
  @ApiResponse({ status: 200, description: "Publicaciones encontradas" })
  @ApiResponse({ status: 503, description: "Portal no disponible" })
  async filtrarPublicaciones(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    dto: FiltrarPublicacionesDto,
  ) {
    const data = await this.publicacionesService.buscarPublicaciones(dto);
    return buildResponse(data, { source: SOURCE });
  }

  // ─── GET /publicaciones/hoy ──────────────────────────────────────────────
  @Get("hoy")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Publicaciones de hoy",
    description: "Retorna todas las publicaciones procesales del día actual",
  })
  @ApiQuery({ name: "departamento", required: false, example: "05" })
  async publicacionesHoy(@Query("departamento") departamento?: string) {
    const data = await this.publicacionesService.publicacionesHoy(departamento);
    return buildResponse(data, { source: SOURCE });
  }

  // ─── GET /publicaciones/historico ────────────────────────────────────────
  @Get("historico")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Directorio de despachos con datos históricos (pre-mayo 2024)",
    description: `Retorna el directorio paginado de despachos judiciales que publicaron Estados Electrónicos
antes del 10 de mayo de 2024. Cada resultado incluye una URL directa al portal histórico de ese despacho
en portalhistorico.ramajudicial.gov.co.

**Limitaciones importantes:**
- No es posible filtrar por fecha ni por categoría de publicación — los datos históricos están
  distribuidos en más de 6.500 portales independientes por despacho.
- Los filtros opcionales (departamento, municipio, entidad) se aplican sobre los resultados de
  la página solicitada (client-side), no a nivel del servidor.
- Para buscar publicaciones históricas de un despacho específico, use la urlHistorico del resultado.

**Radicado:** El portal de publicaciones (histórico y actual) no admite búsqueda por número de radicado.`,
  })
  @ApiQuery({ name: "departamento", required: false, description: "Texto parcial (ej: ANTIOQUIA)" })
  @ApiQuery({ name: "municipio", required: false })
  @ApiQuery({ name: "entidad", required: false })
  @ApiQuery({ name: "pagina", required: false, example: 1 })
  @ApiQuery({ name: "cantRecords", required: false, example: 20, description: "Máx 75 (5,10,20,30,50,75)" })
  @ApiResponse({ status: 200, description: "Directorio de despachos con datos históricos" })
  @ApiResponse({ status: 503, description: "Portal no disponible" })
  async buscarHistorico(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    dto: BuscarHistoricoDto,
  ) {
    const data = await this.publicacionesService.buscarHistorico(dto);
    return buildResponse(data, {
      source: `${SOURCE}/web/publicaciones-procesales/consulta-historica`,
    });
  }
}
