import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SKIP_TRANSFORM_KEY } from '@common/decorators';
import { getRequestId } from '@common/utils';

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message?: string;
  data: T;
  requestId: string;
  timestamp: string;
  path: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const skipTransform = this.reflector.getAllAndOverride<boolean>(
      SKIP_TRANSFORM_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipTransform) {
      return next.handle() as Observable<ApiResponse<T>>;
    }

    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const requestId = getRequestId(request);
    response.setHeader('x-request-id', requestId);

    return next.handle().pipe(
      map((data) => {
        let message: string | undefined;
        let responseData = data;

        if (data && typeof data === 'object' && 'message' in data) {
          message = (data as any).message;
          if (message) {
            const { message: _, ...rest } = data as any;
            responseData = rest;
          }
        }

        return {
          success: true,
          statusCode: response.statusCode,
          ...(message && { message }),
          data: responseData,
          requestId,
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }),
    );
  }
}
