import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';

export class RamaJudicialException extends BaseException {
  constructor(
    message: string,
    code: string = 'RAMA_JUDICIAL_ERROR',
    status: HttpStatus = HttpStatus.BAD_GATEWAY,
    details?: Record<string, unknown>,
    cause?: unknown,
  ) {
    super(message, status, code, details, cause);
  }
}

export class RamaJudicialUnavailableException extends RamaJudicialException {
  constructor(
    message: string = 'El servicio de la Rama Judicial no está disponible',
    details?: Record<string, unknown>,
    cause?: unknown,
  ) {
    super(message, 'RAMA_JUDICIAL_UNAVAILABLE', HttpStatus.SERVICE_UNAVAILABLE, details, cause);
  }
}

export class RamaJudicialTimeoutException extends RamaJudicialException {
  constructor(
    message: string = 'La solicitud a la Rama Judicial ha excedido el tiempo de espera',
    details?: Record<string, unknown>,
    cause?: unknown,
  ) {
    super(message, 'RAMA_JUDICIAL_TIMEOUT', HttpStatus.GATEWAY_TIMEOUT, details, cause);
  }
}

export class RamaJudicialNotFoundException extends RamaJudicialException {
  constructor(
    message: string = 'El recurso solicitado no existe en la Rama Judicial',
    details?: Record<string, unknown>,
    cause?: unknown,
  ) {
    super(message, 'RAMA_JUDICIAL_NOT_FOUND', HttpStatus.NOT_FOUND, details, cause);
  }
}

export class RamaJudicialValidationException extends RamaJudicialException {
  constructor(
    message: string,
    details?: Record<string, unknown>,
    cause?: unknown,
  ) {
    super(message, 'RAMA_JUDICIAL_VALIDATION_ERROR', HttpStatus.BAD_REQUEST, details, cause);
  }
}
