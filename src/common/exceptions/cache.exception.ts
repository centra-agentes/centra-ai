import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';

export class CacheException extends BaseException {
  constructor(
    message: string,
    code: string = 'CACHE_ERROR',
    status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    details?: Record<string, unknown>,
    cause?: unknown,
  ) {
    super(message, status, code, details, cause);
  }
}

export class CacheUnavailableException extends CacheException {
  constructor(
    message: string = 'El servicio de caché no está disponible',
    details?: Record<string, unknown>,
    cause?: unknown,
  ) {
    super(message, 'CACHE_UNAVAILABLE', HttpStatus.SERVICE_UNAVAILABLE, details, cause);
  }
}

export class CacheMissException extends CacheException {
  constructor(
    message: string = 'El dato solicitado no se encuentra en caché',
    details?: Record<string, unknown>,
  ) {
    super(message, 'CACHE_MISS', HttpStatus.NOT_FOUND, details);
  }
}
