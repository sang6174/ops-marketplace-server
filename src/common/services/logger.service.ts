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
