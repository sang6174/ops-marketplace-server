import { BaseException, ExceptionSeverity } from './base.exception';
import {
  ErrorDevelopmentResponse,
  ErrorProductionResponse,
} from '@/shared/dto/error-response.dto';

export class ClientException extends BaseException {
  constructor(
    message: string,
    code: string,
    status: number = 400,
    context?: Record<string, unknown>,
  ) {
    super(code, status, ExceptionSeverity.LOW, message, context);
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
      this.message,
      new Date().toISOString(),
    );
  }
}

export class ValidationException extends ClientException {
  constructor(errors: Record<string, string[]>) {
    super('Validation failed', 'VALIDATION_FAILED', 400, { errors });
  }
}

export class InvalidCredentialsException extends ClientException {
  constructor() {
    super('Invalid credentials', 'INVALID_CREDENTIALS', 401);
  }
}

export class TokenExpiredException extends ClientException {
  constructor() {
    super('Token has expired', 'TOKEN_EXPIRED', 401);
  }
}

export class RateLimitExceededException extends ClientException {
  constructor(limit: number, window: string) {
    super(
      `Rate limit exceeded. Limit: ${limit} requests per ${window}`,
      'RATE_LIMIT_EXCEEDED',
      429,
      { limit, window },
    );
  }
}
