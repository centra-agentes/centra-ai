import {
  Controller,
  Get,
  Query,
  Param,
  HttpCode,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ProcesosService } from './procesos.service';
import {
  BuscarPorNombreDto,
  BuscarPorRadicadoDto,
  BuscarEmpresaDto,
  TipoPersona,
  TipoSujeto,
} from './dto/buscar-proceso.dto';
import { buildResponse } from '../../common/interfaces/api-response.interface';

@ApiTags('Procesos Judiciales')
@Controller('procesos')
export class ProcesosController {
  constructor(private readonly procesosService: ProcesosService) {}

  // ─── GET /procesos/nombre ────────────────────────────────────────────────
  @Get('nombre')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Buscar procesos por nombre y apellido',
    description:
      'Consulta procesos judiciales por nombre del sujeto procesal. Fuente: consultaprocesos.ramajudicial.gov.co',
  })
  @ApiQuery({ name: 'nombre', required: true, example: 'JUAN' })
  @ApiQuery({ name: 'apellido', required: false, example: 'PEREZ' })
  @ApiQuery({ name: 'tipoPersona', enum: TipoPersona, required: false })
  @ApiQuery({ name: 'tipoSujeto', enum: TipoSujeto, required: false })
  @ApiQuery({ name: 'pagina', required: false, example: 1 })
  @ApiQuery({ name: 'cantRecords', required: false, example: 10 })
  @ApiResponse({ status: 200, description: 'Resultados encontrados' })
  @ApiResponse({ status: 400, description: 'Parámetros inválidos' })
  @ApiResponse({ status: 503, description: 'Servicio de Rama Judicial no disponible' })
  async buscarPorNombre(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    dto: BuscarPorNombreDto,
  ) {
    const data = await this.procesosService.buscarPorNombre(dto);
    return buildResponse(data, {
      cached: (data as any)?._cached === true,
      source: 'consultaprocesos.ramajudicial.gov.co',
    });
  }

  // ─── GET /procesos/radicado/:numero ──────────────────────────────────────
  @Get('radicado/:numero')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Buscar proceso por número de radicado',
    description: 'Consulta un proceso por su número de radicación de 23 dígitos',
  })
  @ApiParam({
    name: 'numero',
    example: '11001310300120200001200',
    description: 'Número de radicación de 23 dígitos',
  })
  @ApiResponse({ status: 200, description: 'Proceso encontrado' })
  @ApiResponse({ status: 400, description: 'Número de radicación inválido' })
  async buscarPorRadicado(@Param() params: BuscarPorRadicadoDto) {
    const data = await this.procesosService.buscarPorRadicado(params);
    return buildResponse(data, {
      cached: (data as any)?._cached === true,
      source: 'consultaprocesos.ramajudicial.gov.co',
    });
  }

  // ─── GET /procesos/empresa ───────────────────────────────────────────────
  @Get('empresa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Buscar procesos por razón social de empresa',
    description: 'Consulta procesos judiciales de personas jurídicas',
  })
  @ApiQuery({ name: 'razonSocial', required: true, example: 'BANCOLOMBIA' })
  @ApiQuery({ name: 'tipoSujeto', enum: TipoSujeto, required: false })
  @ApiQuery({ name: 'pagina', required: false, example: 1 })
  @ApiQuery({ name: 'cantRecords', required: false, example: 10 })
  @ApiResponse({ status: 200, description: 'Resultados encontrados' })
  async buscarEmpresa(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    dto: BuscarEmpresaDto,
  ) {
    const data = await this.procesosService.buscarEmpresa(dto);
    return buildResponse(data, {
      cached: (data as any)?._cached === true,
      source: 'consultaprocesos.ramajudicial.gov.co',
    });
  }

  // ─── GET /procesos/:idProceso/actuaciones ────────────────────────────────
  @Get(':idProceso/actuaciones')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener actuaciones de un proceso',
    description: 'Retorna el historial de actuaciones de un proceso judicial',
  })
  @ApiParam({ name: 'idProceso', description: 'ID interno del proceso' })
  async obtenerActuaciones(@Param('idProceso') idProceso: string) {
    const data = await this.procesosService.obtenerDetalleProceso(idProceso);
    return buildResponse(data, {
      cached: (data as any)?._cached === true,
    });
  }
}
