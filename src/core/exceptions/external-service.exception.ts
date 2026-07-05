// core/exceptions/external-service.exception.ts
import { BaseException, ExceptionSeverity } from './base.exception';
import {
  ErrorDevelopmentResponse,
  ErrorProductionResponse,
} from '@/shared/dto/error-response.dto';

export class ExternalServiceException extends BaseException {
  constructor(
    message: string,
    service: string,
    operation: string,
    statusCode: number = 502,
    context?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(
      `EXTERNAL_${service.toUpperCase()}`,
      statusCode,
      ExceptionSeverity.HIGH,
      message,
      { service, operation, ...context },
      cause,
    );
  }

  toErrorDevelopmentResponse(path: string): ErrorDevelopmentResponse {
    return new ErrorDevelopmentResponse(
      this.status,
      this.code,
      path,
      this.message,
      new Date().toISOString(),
      this.context,
      this.cause,
    );
  }

  toErrorProductionResponse(path: string): ErrorProductionResponse {
    return new ErrorProductionResponse(
      this.status,
      this.code,
      path,
      `External service (${this.context?.service}) is temporarily unavailable. Please try again later.`,
      new Date().toISOString(),
    );
  }

  isRetryable(): boolean {
    return true;
  }
}

export class StripeException extends ExternalServiceException {
  constructor(
    operation: string,
    message: string,
    context?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(`Stripe error: ${message}`, 'STRIPE', operation, 502, context, cause);
  }
}

export class EmailServiceException extends ExternalServiceException {
  constructor(
    operation: string,
    message: string,
    context?: Record<string, unknown>,
  ) {
    super(`Email service error: ${message}`, 'EMAIL', operation, 502, context);
  }
}
