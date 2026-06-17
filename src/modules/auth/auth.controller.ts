import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { MasterKeyGuard } from './guards/master-key.guard';
import { Public } from '../../common/decorators/public.decorator';
import { buildResponse } from '../../common/interfaces/api-response.interface';

@ApiTags('Auth / API Keys')
@Controller('auth')
@Public()                       // bypass the global ApiKeyGuard
@UseGuards(MasterKeyGuard)      // but require the admin master key instead
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── POST /auth/keys ─────────────────────────────────────────────────────
  @Post('keys')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear una nueva API key',
    description:
      'Genera y almacena una nueva API key. **La clave completa se muestra únicamente en esta respuesta** y nunca se vuelve a exponer — guárdala de inmediato. Requiere el header `X-Master-Key`.',
  })
  @ApiHeader({ name: 'X-Master-Key', required: true, description: 'Clave maestra de administración (MASTER_API_KEY)' })
  @ApiResponse({ status: 201, description: 'API key creada exitosamente' })
  @ApiResponse({ status: 401, description: 'Master key inválida o ausente' })
  @ApiResponse({ status: 503, description: 'MASTER_API_KEY no configurada en el servidor' })
  async createKey(@Body() dto: CreateApiKeyDto) {
    const { apiKey, rawKey } = await this.authService.createKey(dto);
    return buildResponse({
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      apiKey: rawKey,       // ← ONLY shown here, never stored in plaintext
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
    });
  }

  // ─── GET /auth/keys ───────────────────────────────────────────────────────
  @Get('keys')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar todas las API keys',
    description:
      'Retorna metadatos de todas las keys registradas. La clave completa nunca se retorna. Requiere `X-Master-Key`.',
  })
  @ApiHeader({ name: 'X-Master-Key', required: true })
  @ApiResponse({ status: 200, description: 'Lista de API keys' })
  async listKeys() {
    const keys = await this.authService.listKeys();
    return buildResponse(
      keys.map((k) => ({
        id: k.id,
        name: k.name,
        keyPrefix: k.keyPrefix,
        isActive: k.isActive,
        expiresAt: k.expiresAt,
        lastUsedAt: k.lastUsedAt,
        requestsCount: k.requestsCount,
        createdAt: k.createdAt,
      })),
    );
  }

  // ─── DELETE /auth/keys/:id/revoke ─────────────────────────────────────────
  @Delete('keys/:id/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revocar una API key',
    description:
      'Desactiva la key sin eliminarla (isActive = false). Los requests con esta key serán rechazados de inmediato. Requiere `X-Master-Key`.',
  })
  @ApiHeader({ name: 'X-Master-Key', required: true })
  @ApiParam({ name: 'id', description: 'UUID de la API key a revocar' })
  @ApiResponse({ status: 200, description: 'Key revocada' })
  @ApiResponse({ status: 404, description: 'Key no encontrada' })
  async revokeKey(@Param('id') id: string) {
    await this.authService.revokeKey(id);
    return buildResponse({ revoked: true, id });
  }

  // ─── DELETE /auth/keys/:id ────────────────────────────────────────────────
  @Delete('keys/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Eliminar permanentemente una API key',
    description:
      'Elimina el registro de la base de datos. Operación irreversible. Requiere `X-Master-Key`.',
  })
  @ApiHeader({ name: 'X-Master-Key', required: true })
  @ApiParam({ name: 'id', description: 'UUID de la API key a eliminar' })
  @ApiResponse({ status: 200, description: 'Key eliminada' })
  @ApiResponse({ status: 404, description: 'Key no encontrada' })
  async deleteKey(@Param('id') id: string) {
    await this.authService.deleteKey(id);
    return buildResponse({ deleted: true, id });
  }
}
