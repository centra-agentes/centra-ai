import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  DefaultValuePipe,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { VigilanceService } from './vigilance.service';
import { WatchService } from './watch.service';
import { AlertService } from './alert.service';
import { MonitoringService } from './monitoring.service';
import { VigilarRadicadoDto } from './dto/vigilar-radicado.dto';
import { CreateWatchDto } from './dto/create-watch.dto';
import { UpdateWatchDto } from './dto/update-watch.dto';
import { QueryAlertsDto } from './dto/query-alerts.dto';
import { buildResponse } from '../../common/interfaces/api-response.interface';
import { GetApiKey } from '../../common/decorators/get-api-key.decorator';
import { ApiKeyEntity } from '../auth/entities/api-key.entity';

const SOURCE = 'consultaprocesos.ramajudicial.gov.co';

@ApiTags('Vigilance')
@Controller('vigilance')
export class VigilanceController {
  constructor(
    private readonly vigilanceService: VigilanceService,
    private readonly watchService: WatchService,
    private readonly alertService: AlertService,
    private readonly monitoringService: MonitoringService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // Watch CRUD
  // ═══════════════════════════════════════════════════════════════════════════

  @Post('watches')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear un watch de radicado' })
  @ApiResponse({ status: 201, description: 'Watch creado' })
  async createWatch(
    @GetApiKey() apiKey: ApiKeyEntity,
    @Body() dto: CreateWatchDto,
  ) {
    const data = await this.watchService.create(apiKey.id, dto);
    return buildResponse(data);
  }

  @Get('watches')
  @ApiOperation({ summary: 'Listar watches del API key actual' })
  async listWatches(@GetApiKey() apiKey: ApiKeyEntity) {
    const data = await this.watchService.findAll(apiKey.id);
    return buildResponse(data, { total: data.length });
  }

  @Get('watches/:id')
  @ApiOperation({ summary: 'Obtener un watch por ID' })
  @ApiParam({ name: 'id', description: 'UUID del watch' })
  async getWatch(@GetApiKey() apiKey: ApiKeyEntity, @Param('id') id: string) {
    const data = await this.watchService.findOne(id, apiKey.id);
    return buildResponse(data);
  }

  @Patch('watches/:id')
  @ApiOperation({ summary: 'Actualizar label o estado de un watch' })
  @ApiParam({ name: 'id', description: 'UUID del watch' })
  async updateWatch(
    @GetApiKey() apiKey: ApiKeyEntity,
    @Param('id') id: string,
    @Body() dto: UpdateWatchDto,
  ) {
    const data = await this.watchService.update(id, apiKey.id, dto);
    return buildResponse(data);
  }

  @Delete('watches/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar un watch' })
  @ApiParam({ name: 'id', description: 'UUID del watch' })
  async deleteWatch(@GetApiKey() apiKey: ApiKeyEntity, @Param('id') id: string) {
    await this.watchService.remove(id, apiKey.id);
    return buildResponse({ deleted: true });
  }

  @Post('watches/:id/check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verificación manual de un watch',
    description: 'Fuerza una consulta inmediata fuera del ciclo de cron.',
  })
  @ApiParam({ name: 'id', description: 'UUID del watch' })
  async manualCheck(@GetApiKey() apiKey: ApiKeyEntity, @Param('id') id: string) {
    const watch = await this.watchService.findOne(id, apiKey.id);
    if (!watch.isActive) {
      throw new UnprocessableEntityException(
        'El watch está desactivado. Reactívalo antes de verificar.',
      );
    }
    const result = await this.monitoringService.checkWatch(watch);
    return buildResponse(result);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Alert management
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('alerts')
  @ApiOperation({ summary: 'Listar alertas del API key actual' })
  @ApiQuery({ name: 'isRead', required: false, type: Boolean })
  @ApiQuery({ name: 'numeroRadicado', required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async listAlerts(
    @GetApiKey() apiKey: ApiKeyEntity,
    @Query() dto: QueryAlertsDto,
  ) {
    const [items, total] = await this.alertService.findAll(apiKey.id, dto);
    return buildResponse(items, { total, page: dto.page, limit: dto.limit });
  }

  @Post('alerts/read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar todas las alertas como leídas' })
  async markAllRead(@GetApiKey() apiKey: ApiKeyEntity) {
    const data = await this.alertService.markAllRead(apiKey.id);
    return buildResponse(data);
  }

  @Patch('alerts/:id/read')
  @ApiOperation({ summary: 'Marcar una alerta como leída' })
  @ApiParam({ name: 'id', description: 'UUID de la alerta' })
  async markRead(@GetApiKey() apiKey: ApiKeyEntity, @Param('id') id: string) {
    const data = await this.alertService.markRead(id, apiKey.id);
    return buildResponse(data);
  }

  @Delete('alerts/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar una alerta' })
  @ApiParam({ name: 'id', description: 'UUID de la alerta' })
  async deleteAlert(@GetApiKey() apiKey: ApiKeyEntity, @Param('id') id: string) {
    await this.alertService.remove(id, apiKey.id);
    return buildResponse({ deleted: true });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Proxy endpoints (Rama Judicial v2)
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('radicado/:numero')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Consulta completa por número de radicado',
    description:
      'Retorna todos los procesos asociados al radicado con su detalle, sujetos procesales y actuaciones en una sola llamada.',
  })
  @ApiParam({
    name: 'numero',
    example: '05088400300220240205200',
    description: 'Número de radicación (23 dígitos)',
  })
  @ApiQuery({ name: 'pagina', required: false, example: 1, description: 'Página de procesos' })
  @ApiQuery({ name: 'paginaActuaciones', required: false, example: 1, description: 'Página de actuaciones' })
  @ApiResponse({ status: 200, description: 'Consulta exitosa' })
  @ApiResponse({ status: 503, description: 'Servicio de Rama Judicial no disponible' })
  async consultarRadicado(
    @Param('numero') numero: string,
    @Query('pagina', new DefaultValuePipe(1), ParseIntPipe) pagina: number,
    @Query('paginaActuaciones', new DefaultValuePipe(1), ParseIntPipe) paginaActuaciones: number,
  ) {
    const data = await this.vigilanceService.consultarRadicado({ numero, pagina, paginaActuaciones });
    return buildResponse(data, { source: SOURCE });
  }

  @Get(':idProceso/detalle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener detalle de un proceso' })
  @ApiParam({ name: 'idProceso', example: '3168091471' })
  async obtenerDetalle(@Param('idProceso') idProceso: string) {
    const data = await this.vigilanceService.obtenerDetalle(idProceso);
    return buildResponse(data, { source: SOURCE });
  }

  @Get(':idProceso/actuaciones')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener actuaciones de un proceso' })
  @ApiParam({ name: 'idProceso', example: '3168091471' })
  @ApiQuery({ name: 'pagina', required: false, example: 1 })
  async obtenerActuaciones(
    @Param('idProceso') idProceso: string,
    @Query('pagina', new DefaultValuePipe(1), ParseIntPipe) pagina: number,
  ) {
    const data = await this.vigilanceService.obtenerActuaciones(idProceso, pagina);
    return buildResponse(data, { source: SOURCE });
  }

  @Get(':idProceso/sujetos')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener sujetos procesales de un proceso' })
  @ApiParam({ name: 'idProceso', example: '3168091471' })
  @ApiQuery({ name: 'pagina', required: false, example: 1 })
  async obtenerSujetos(
    @Param('idProceso') idProceso: string,
    @Query('pagina', new DefaultValuePipe(1), ParseIntPipe) pagina: number,
  ) {
    const data = await this.vigilanceService.obtenerSujetos(idProceso, pagina);
    return buildResponse(data, { source: SOURCE });
  }
}
