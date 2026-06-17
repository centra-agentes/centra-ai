import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { VigilanceService, ProcesoCompleto } from '../vigilance/vigilance.service';

export interface AgentAnalysis {
  resumen: string;
  alertLevel: 'normal' | 'warning' | 'critical';
  alertTitle: string;
  alertDesc: string;
  acciones: Array<{
    texto: string;
    nivel: 'critical' | 'warning' | 'normal';
    plazo: string;
  }>;
  proximoPaso: string;
  observaciones: string;
}

export interface AgentResult {
  radicado: string;
  proceso: ProcesoCompleto | null;
  analysis: AgentAnalysis;
  sources: Array<{ name: string; status: 'found' | 'empty'; count: number }>;
  processedAt: string;
}

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private readonly CLAUDE_MODEL = 'claude-haiku-4-5-20251001';

  constructor(
    private readonly configService: ConfigService,
    private readonly vigilanceService: VigilanceService,
  ) {}

  async analyzeRadicado(radicado: string): Promise<AgentResult> {
    this.logger.log(`[Agent] Iniciando análisis para radicado: ${radicado}`);

    // ─── Paso 1: Consultar fuentes ─────────────────────────────────────────
    const sources: AgentResult['sources'] = [];
    let proceso: ProcesoCompleto | null = null;

    try {
      const resultado = await this.vigilanceService.consultarRadicado({
        numero: radicado,
        pagina: 1,
        paginaActuaciones: 1,
      });

      if (resultado.procesos?.length) {
        proceso = resultado.procesos[0];
        sources.push({ name: 'Rama Judicial', status: 'found', count: resultado.procesos.length });
        this.logger.log(`[Agent] Rama Judicial: ${resultado.procesos.length} proceso(s) encontrado(s)`);
      } else {
        sources.push({ name: 'Rama Judicial', status: 'empty', count: 0 });
        this.logger.warn(`[Agent] Rama Judicial: sin resultados`);
      }
    } catch (err) {
      sources.push({ name: 'Rama Judicial', status: 'empty', count: 0 });
      this.logger.error(`[Agent] Error Rama Judicial: ${err.message}`);
    }


    // ─── Paso 2: Análisis Claude ───────────────────────────────────────────
    const analysis = await this.callClaude(radicado, proceso);

    return {
      radicado,
      proceso,
      analysis,
      sources,
      processedAt: new Date().toISOString(),
    };
  }

  private async callClaude(
    radicado: string,
    proceso: ProcesoCompleto | null,
  ): Promise<AgentAnalysis> {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) {
      this.logger.warn('[Agent] ANTHROPIC_API_KEY no configurada — retornando análisis básico');
      return this.fallbackAnalysis(proceso);
    }

    const actuacionesText = (proceso?.actuaciones ?? [])
      .slice(0, 15)
      .map(
        (a, i) =>
          `${i + 1}. [${(a.fechaActuacion ?? '').split('T')[0]}] ${a.actuacion}${a.anotacion ? ': ' + a.anotacion : ''}`,
      )
      .join('\n');

    const prompt = `Eres un asistente legal especializado en el sistema judicial colombiano. Analiza el siguiente proceso judicial y proporciona un análisis claro y accionable para el abogado.

INFORMACIÓN DEL PROCESO:
- Radicado: ${radicado}
- Tipo de proceso: ${proceso?.detalle?.tipoProceso ?? 'N/A'}
- Clase: ${proceso?.detalle?.claseProceso ?? 'N/A'}
- Despacho: ${proceso?.despacho ?? 'N/A'}
- Departamento: ${proceso?.departamento ?? 'N/A'}
- Partes: ${proceso?.sujetosProcesales ?? 'N/A'}
- Fecha última actuación: ${proceso?.fechaUltimaActuacion ?? 'N/A'}

ACTUACIONES RECIENTES (más recientes primero):
${actuacionesText || 'Sin actuaciones registradas'}

Responde EXCLUSIVAMENTE en este formato JSON (sin markdown, sin texto extra):
{
  "resumen": "Resumen ejecutivo del estado actual del proceso en 2-3 oraciones.",
  "alertLevel": "normal|warning|critical",
  "alertTitle": "Título corto de la alerta si aplica, vacío si alertLevel es normal",
  "alertDesc": "Descripción de la alerta si aplica, vacío si alertLevel es normal",
  "acciones": [
    {
      "texto": "Descripción concreta de la acción requerida",
      "nivel": "critical|warning|normal",
      "plazo": "Plazo específico si se puede determinar, o vacío"
    }
  ],
  "proximoPaso": "El paso más importante que debe tomar el abogado ahora mismo.",
  "observaciones": "Observaciones adicionales relevantes sobre el proceso."
}`;

    try {
      const res = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: this.CLAUDE_MODEL,
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          timeout: 30000,
        },
      );

      const rawText: string = res.data?.content?.[0]?.text ?? '{}';
      try {
        return JSON.parse(rawText) as AgentAnalysis;
      } catch {
        const match = rawText.match(/\{[\s\S]*\}/);
        return match ? (JSON.parse(match[0]) as AgentAnalysis) : this.fallbackAnalysis(proceso);
      }
    } catch (err) {
      this.logger.error(`[Agent] Error Claude API: ${err.message}`);
      return this.fallbackAnalysis(proceso);
    }
  }

  private fallbackAnalysis(proceso: ProcesoCompleto | null): AgentAnalysis {
    const total = proceso?.actuaciones?.length ?? 0;
    const ultima = proceso?.actuaciones?.[0]?.actuacion ?? '—';
    return {
      resumen: `Proceso con ${total} actuación${total !== 1 ? 'es' : ''} registradas. Última actuación: "${ultima}".`,
      alertLevel: 'normal',
      alertTitle: '',
      alertDesc: '',
      acciones: [],
      proximoPaso: 'Revisa las actuaciones recientes del proceso.',
      observaciones: '',
    };
  }
}
