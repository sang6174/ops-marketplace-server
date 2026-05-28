import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { getRequestId } from '@common/utils';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const requestId = getRequestId(req);
    const { method, url } = req;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;

          this.logger.log(
            `RESPONSE: ${method} ${url} - ${duration}ms - ${requestId}`,
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;

          this.logger.error(
            `ERROR: ${method} ${url} - ${duration}ms - ${requestId}`,
            error.stack,
          );
        },
      }),
    );
  }
}
