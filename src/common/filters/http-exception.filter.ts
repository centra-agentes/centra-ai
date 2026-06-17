import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseException } from '../exceptions/base.exception';

interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  timestamp: string;
  method: string;
  code?: string;
  errors?: Record<string, unknown>;
  stack?: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = this.getStatusCode(exception);
    const problemDetail = this.buildProblemDetail(exception, status, request);

    this.logException(exception, status, request);

    response.status(status).json(problemDetail);
  }

  private getStatusCode(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private buildProblemDetail(
    exception: unknown,
    status: number,
    request: Request,
  ): ProblemDetail {
    const isDev = process.env.NODE_ENV === 'development';
    const baseDetail: ProblemDetail = {
      type: this.getErrorType(exception),
      title: this.getErrorTitle(exception, status),
      status,
      detail: this.getDetail(exception),
      instance: request.url,
      timestamp: new Date().toISOString(),
      method: request.method,
    };

    if (exception instanceof BaseException) {
      baseDetail.code = exception.code;
      baseDetail.errors = exception.details;
    }

    if (exception instanceof BadRequestException) {
      const res = (exception as any).getResponse() as any;
      if (res && typeof res === 'object') {
        baseDetail.errors = res.errors || res.message;
      }
    }

    if (isDev && exception instanceof Error) {
      baseDetail.stack = exception.stack;
    }

    return baseDetail;
  }

  private getErrorType(exception: unknown): string {
    if (exception instanceof BaseException) {
      return `https://api.ramajudicial.gov.co/errors/${exception.code.toLowerCase()}`;
    }

    if (exception instanceof BadRequestException) {
      return 'https://api.ramajudicial.gov.co/errors/validation-error';
    }

    if (exception instanceof HttpException) {
      return `https://api.ramajudicial.gov.co/errors/http-${exception.getStatus()}`;
    }

    return 'https://api.ramajudicial.gov.co/errors/internal-server-error';
  }

  private getErrorTitle(exception: unknown, status: number): string {
    if (exception instanceof BaseException) {
      return exception.message;
    }

    if (exception instanceof HttpException) {
      return exception.message;
    }

    return HttpStatus[status] || 'Error interno del servidor';
  }

  private getDetail(exception: unknown): string {
    if (exception instanceof BaseException) {
      return exception.message;
    }

    if (exception instanceof HttpException) {
      const response = (exception as any).getResponse();
      if (typeof response === 'string') {
        return response;
      }
      return (response as any)?.message || exception;
    }

    return String(exception);
  }

  private logException(exception: unknown, status: number, request: Request) {
    const message = `[${request.method}] ${request.url} → ${status}`;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        message,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else if (status >= HttpStatus.BAD_REQUEST) {
      this.logger.warn(message);
    }
  }
}
