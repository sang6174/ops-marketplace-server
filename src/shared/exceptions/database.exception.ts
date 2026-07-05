import { BaseException, ExceptionSeverity } from './base.exception';
import {
  ErrorDevelopmentResponse,
  ErrorProductionResponse,
} from '@shared/dto/error-response.dto';

export class DatabaseException extends BaseException {
  constructor(
    message: string,
    operation: string,
    entity?: string,
    context?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(
      'DATABASE_ERROR',
      500,
      ExceptionSeverity.HIGH,
      message,
      { operation, entity, ...context },
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
      500,
      'DATABASE_ERROR',
      path,
      'Database operation failed. Please try again later.',
      new Date().toISOString(),
    );
  }

  isRetryable(): boolean {
    return true;
  }
}

export class RecordNotFoundException extends DatabaseException {
  constructor(entity: string, id: string) {
    super(`Record not found: ${entity} with id ${id}`, 'FIND_ONE', entity, {
      id,
    });
  }
}

export class DuplicateRecordException extends DatabaseException {
  constructor(entity: string, field: string, value: string) {
    super(
      `Duplicate record: ${entity} with ${field}=${value} already exists`,
      'CREATE',
      entity,
      { field, value },
    );
  }
}

export class DatabaseConnectionException extends DatabaseException {
  constructor(cause?: Error) {
    super('Database connection failed', 'CONNECT', undefined, undefined, cause);
  }

  isRetryable(): boolean {
    return true;
  }
}
