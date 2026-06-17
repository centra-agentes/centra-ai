import { ErrorResponse } from '../exceptions/base.exception';

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  error?: never;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    cached?: boolean;
    source?: string;
    timestamp: string;
  };
}

export interface ApiErrorResponse {
  success: false;
  data?: never;
  error: {
    type: string;
    title: string;
    status: number;
    detail: string;
    instance: string;
    timestamp: string;
    method: string;
    code?: string;
    errors?: Record<string, unknown>;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export function buildResponse<T>(
  data: T,
  meta?: Partial<ApiSuccessResponse<T>['meta']>,
): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      source: 'rama-judicial',
      ...meta,
    },
  };
}

export function buildErrorResponse(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): ErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
    },
  };
}
