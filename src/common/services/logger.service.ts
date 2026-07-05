import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

export interface LogContext {
  [key: string]: unknown;
}

@Injectable()
export class LoggerService {
  constructor(private readonly pinoLogger: PinoLogger) {}

  debug(message: string, context?: LogContext): void {
    this.pinoLogger.debug(context || {}, message);
  }

  log(message: string, context?: LogContext): void {
    this.pinoLogger.info(context || {}, message);
  }

  info(message: string, context?: LogContext): void {
    this.pinoLogger.info(context || {}, message);
  }

  warn(message: string, context?: LogContext): void {
    this.pinoLogger.warn(context || {}, message);
  }

  error(message: string, trace?: string, context?: LogContext): void {
    this.pinoLogger.error({ ...context, trace }, message);
  }

  fatal(message: string, context?: LogContext): void {
    this.pinoLogger.fatal(context || {}, message);
  }

  trace(message: string, context?: LogContext): void {
    this.pinoLogger.trace(context || {}, message);
  }

  // Structured logging for HTTP requests
  logRequest(
    method: string,
    url: string,
    context?: LogContext,
  ): void {
    this.pinoLogger.debug({ method, url, ...context }, 'HTTP_REQUEST');
  }

  // Structured logging for HTTP responses
  logResponse(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    context?: LogContext,
  ): void {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    this.pinoLogger[level](
      { method, url, statusCode, duration, ...context },
      'HTTP_RESPONSE',
    );
  }

  // Structured logging for HTTP errors
  logHttpError(
    method: string,
    url: string,
    duration: number,
    error: Error,
    context?: LogContext,
  ): void {
    this.pinoLogger.error(
      { method, url, duration, errorMessage: error.message, ...context },
      `HTTP_ERROR: ${error.message}`,
    );
  }

  // Structured logging for exceptions
  logException(
    code: string,
    message: string,
    severity: string,
    context?: LogContext,
  ): void {
    const level = severity === 'CRITICAL' || severity === 'HIGH' ? 50 : 40; // error (50) or warn (40)
    this.pinoLogger[level === 50 ? 'error' : 'warn'](
      { code, severity, ...context },
      message,
    );
  }
}
