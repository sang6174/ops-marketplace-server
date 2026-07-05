import { BaseException, ExceptionSeverity } from './base.exception';
import {
  ErrorDevelopmentResponse,
  ErrorProductionResponse,
} from '@shared/dto/error-response.dto';

export class ServerException extends BaseException {
  constructor(
    message: string,
    code: string = 'INTERNAL_SERVER_ERROR',
    context?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(code, 500, ExceptionSeverity.CRITICAL, message, context, cause);
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
      500,
      this.code,
      path,
      'An unexpected error occurred. Our team has been notified.',
      new Date().toISOString(),
    );
  }
}

export class ConfigurationException extends ServerException {
  constructor(message: string, context?: Record<string, unknown>) {
    super(`Configuration error: ${message}`, 'CONFIGURATION_ERROR', context);
  }
}

export class SerializationException extends ServerException {
  constructor(message: string, context?: Record<string, unknown>) {
    super(`Serialization error: ${message}`, 'SERIALIZATION_ERROR', context);
  }
}
