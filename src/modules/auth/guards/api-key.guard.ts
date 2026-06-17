import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { AuthService } from '../auth.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Routes decorated with @Public() bypass this guard entirely
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const rawKey = this.extractKey(request);

    if (!rawKey) {
      throw new UnauthorizedException(
        'Se requiere una API key. Envíala en el header X-API-Key o como Authorization: Bearer <key>',
      );
    }

    const apiKey = await this.authService.validateKey(rawKey);
    if (!apiKey) {
      throw new UnauthorizedException('API key inválida, expirada o desactivada');
    }

    // Attach validated key metadata to the request for downstream use
    request['apiKey'] = apiKey;
    return true;
  }

  private extractKey(request: any): string | null {
    // Prefer X-API-Key header
    const xApiKey = request.headers['x-api-key'];
    if (xApiKey) return Array.isArray(xApiKey) ? xApiKey[0] : xApiKey;

    // Fallback: Authorization: Bearer <key>
    const auth: string | undefined = request.headers['authorization'];
    if (auth?.startsWith('Bearer ')) return auth.slice(7);

    return null;
  }
}
