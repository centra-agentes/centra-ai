import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Protects key-management endpoints.
 * Reads MASTER_API_KEY from config and compares it to the X-Master-Key request header.
 * This guard is applied per-controller, not globally.
 */
@Injectable()
export class MasterKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const masterKey = this.configService.get<string>('app.masterApiKey');

    if (!masterKey) {
      throw new ServiceUnavailableException(
        'La gestión de API keys no está habilitada. Define la variable de entorno MASTER_API_KEY.',
      );
    }

    const request = context.switchToHttp().getRequest();
    const provided: string | string[] | undefined = request.headers['x-master-key'];
    const providedStr = Array.isArray(provided) ? provided[0] : provided;

    if (!providedStr || providedStr !== masterKey) {
      throw new UnauthorizedException('Master key inválida o ausente');
    }

    return true;
  }
}
