import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { getRequestId } from '@common/utils';

const SENSITIVE_FIELDS = [
  'password',
  'passwordConfirmation',
  'token',
  'refreshToken',
  'secret',
  'authorization',
];

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const requestId = getRequestId(req);
    const { method, url } = req;
    const startTime = Date.now();
    const user = (req as any).user;

    const safeBody = this.sanitize(req.body);
    const safeQuery = this.sanitize(req.query);

    this.logger.debug(
      `REQUEST: ${method} ${url} - ${requestId} | User: ${user?.id ?? 'anonymous'} | Body: ${JSON.stringify(safeBody)} | Query: ${JSON.stringify(safeQuery)}`,
    );

    return next.handle().pipe(
      tap({
        next: (responseBody) => {
          const duration = Date.now() - startTime;
          const statusCode = res.statusCode;

          const safeResponse = this.sanitize(responseBody);

          const logMessage = `${method} ${url} - ${statusCode} - ${duration}ms - ${requestId}`;

          if (statusCode >= 500) {
            this.logger.error(logMessage);
          } else if (statusCode >= 400) {
            this.logger.warn(logMessage);
          } else {
            this.logger.log(logMessage);
          }

          if (statusCode >= 400 || process.env.LOG_RESPONSE_BODY === 'true') {
            this.logger.debug(`RESPONSE BODY: ${JSON.stringify(safeResponse)}`);
          }
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error?.status ?? error?.statusCode ?? 500;

          this.logger.error(
            `ERROR: ${method} ${url} - ${statusCode} - ${duration}ms - ${requestId}`,
            error.stack,
          );
        },
      }),
    );
  }

  private sanitize(data: unknown): unknown {
    if (data === null || data === undefined) return data;

    if (typeof data === 'string') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitize(item));
    }

    if (typeof data === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(
        data as Record<string, unknown>,
      )) {
        const lowerKey = key.toLowerCase();
        if (SENSITIVE_FIELDS.some((field) => lowerKey.includes(field))) {
          sanitized[key] = '[FILTERED]';
        } else {
          sanitized[key] = this.sanitize(value);
        }
      }
      return sanitized;
    }

    return data;
  }
}
