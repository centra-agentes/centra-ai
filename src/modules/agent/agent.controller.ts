import { Controller, Post, Param, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AgentService } from './agent.service';
import { buildResponse } from '../../common/interfaces/api-response.interface';

@ApiTags('Agent')
@Controller('agent')
export class AgentController {
  private readonly logger = new Logger(AgentController.name);

  constructor(private readonly agentService: AgentService) {}

  @Post('analyze/:radicado')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Análisis inteligente de un proceso judicial',
    description: `Consulta el proceso en todas las fuentes disponibles y usa Claude para generar:
- Resumen ejecutivo del estado actual
- Nivel de alerta (normal / warning / critical)
- Acciones concretas con plazos
- Próximo paso recomendado
- Observaciones adicionales`,
  })
  @ApiParam({
    name: 'radicado',
    example: '05001418900720240095600',
    description: 'Número de radicación (23 dígitos)',
  })
  @ApiResponse({ status: 200, description: 'Análisis completado' })
  @ApiResponse({ status: 404, description: 'Proceso no encontrado' })
  async analyze(@Param('radicado') radicado: string) {
    this.logger.log(`[AgentController] analyze → ${radicado}`);
    const result = await this.agentService.analyzeRadicado(radicado);
    return buildResponse(result, { source: 'centravigia-agent' });
  }
}
