import {
  ErrorDevelopmentResponse,
  ErrorProductionResponse,
} from '@shared/dto/error-response.dto';

export enum ExceptionSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export abstract class BaseException extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    public readonly severity: ExceptionSeverity,
    public readonly message: string,
    public readonly context?: Record<string, unknown>,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);

    if (cause?.stack) {
      this.stack = cause.stack;
    }
  }

  abstract toErrorDevelopmentResponse(path: string): ErrorDevelopmentResponse;
  abstract toErrorProductionResponse(path: string): ErrorProductionResponse;

  shouldLog(): boolean {
    return this.severity !== ExceptionSeverity.LOW;
  }

  isRetryable(): boolean {
    return false;
  }
}
