import { registerAs } from '@nestjs/config';

export default registerAs('ramaJudicial', () => ({
  baseUrl:
    process.env.RAMA_BASE_URL ||
    'https://consultaprocesos.ramajudicial.gov.co/api/Procesos',
  v2BaseUrl:
    process.env.RAMA_V2_BASE_URL ||
    'https://consultaprocesos.ramajudicial.gov.co:448/api/v2',
  publicacionesUrl:
    process.env.RAMA_PUBLICACIONES_URL ||
    'https://publicacionesprocesales.ramajudicial.gov.co',
  timeoutMs: parseInt(process.env.RAMA_TIMEOUT_MS, 10) || 15000,
  maxRetries: parseInt(process.env.RAMA_MAX_RETRIES, 10) || 3,
  cacheTtlSeconds: parseInt(process.env.CACHE_TTL_SECONDS, 10) || 300,
  // Publicaciones-specific overrides
  publicacionesTimeoutMs: parseInt(process.env.PUBLICACIONES_TIMEOUT_MS, 10) || 30000,
  // Override the Liferay portlet instance ID if Rama Judicial redeploys the portlet
  publicacionesPortletNs: process.env.PUBLICACIONES_PORTLET_NS || 'BIyXQFHVaYaq',
}));
