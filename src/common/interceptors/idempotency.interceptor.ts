import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { createHash } from 'crypto';
import { Observable, from, of, throwError } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';
import { IdempotencyStatus } from '@infrastructure/generated/prisma/enums';
import { Prisma } from '@infrastructure/generated/prisma/client';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { SKIP_IDEMPOTENCY_KEY } from '@common/decorators';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const IDEMPOTENCY_HEADER = 'idempotency-key';
const LOCK_TTL_MS = 2 * 60 * 1000;
const RETENTION_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const shouldSkip = this.reflector.getAllAndOverride<boolean>(
      SKIP_IDEMPOTENCY_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (shouldSkip) return next.handle();

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const method = request.method.toUpperCase();
    if (!MUTATING_METHODS.has(method)) return next.handle();

    const key = this.getIdempotencyKey(request);
    if (!key) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    const now = new Date();
    const userId = this.getUserId(request);
    const scope = this.getScope(request, userId);
    const requestHash = this.hashRequest(request);

    return from(
      this.reserveRequest(key, scope, requestHash, request, now),
    ).pipe(
      mergeMap((reserved) => {
        if (reserved.status === IdempotencyStatus.COMPLETED) {
          if (reserved.responseStatus) response.status(reserved.responseStatus);
          response.setHeader('Idempotency-Replayed', 'true');
          return of(reserved.responseBody);
        }

        response.setHeader('Idempotency-Replayed', 'false');
        return next.handle().pipe(
          mergeMap((body) =>
            from(
              this.completeRequest(
                reserved.id,
                response.statusCode,
                this.toJsonValue(body),
              ),
            ).pipe(mergeMap(() => of(body))),
          ),
          catchError((error) =>
            from(this.releaseRequest(reserved.id)).pipe(
              mergeMap(() => throwError(() => error)),
            ),
          ),
        );
      }),
    );
  }

  private async reserveRequest(
    key: string,
    scope: string,
    requestHash: string,
    request: Request,
    now: Date,
  ) {
    const lockedUntil = new Date(now.getTime() + LOCK_TTL_MS);
    const expiresAt = new Date(now.getTime() + RETENTION_MS);

    try {
      return await this.prisma.idempotencyRequest.create({
        data: {
          key,
          scope,
          requestHash,
          method: request.method.toUpperCase(),
          path: request.originalUrl ?? request.url,
          userId: this.getUserId(request),
          status: IdempotencyStatus.IN_PROGRESS,
          lockedUntil,
          expiresAt,
        },
      });
    } catch (error) {
      if (!this.isUniqueViolation(error)) throw error;
    }

    const existing = await this.prisma.idempotencyRequest.findUnique({
      where: { scope_key: { scope, key } },
    });
    if (!existing) {
      throw new ConflictException('Idempotency request could not be reserved');
    }
    if (existing.requestHash !== requestHash) {
      throw new ConflictException(
        'Idempotency-Key was already used with a different request payload',
      );
    }
    if (existing.status === IdempotencyStatus.COMPLETED) return existing;
    if (existing.lockedUntil > now) {
      throw new ConflictException('Idempotent request is still in progress');
    }

    return this.prisma.idempotencyRequest.update({
      where: { id: existing.id },
      data: { lockedUntil },
    });
  }

  private async completeRequest(
    id: string,
    responseStatus: number,
    responseBody: Prisma.InputJsonValue,
  ) {
    await this.prisma.idempotencyRequest.update({
      where: { id },
      data: {
        status: IdempotencyStatus.COMPLETED,
        responseStatus,
        responseBody,
      },
    });
  }

  private async releaseRequest(id: string) {
    await this.prisma.idempotencyRequest.delete({ where: { id } }).catch(() => {
      return undefined;
    });
  }

  private getIdempotencyKey(request: Request) {
    const header = request.headers[IDEMPOTENCY_HEADER];
    const key = Array.isArray(header) ? header[0] : header;
    return typeof key === 'string' && key.trim() ? key.trim() : undefined;
  }

  private getScope(request: Request, userId?: string) {
    const routePath =
      typeof request.route?.path === 'string'
        ? request.route.path
        : request.path;
    return [
      request.method.toUpperCase(),
      request.baseUrl,
      routePath,
      userId ?? 'anonymous',
    ].join(':');
  }

  private hashRequest(request: Request) {
    return createHash('sha256')
      .update(
        this.stableStringify({
          body: request.body ?? null,
          params: request.params ?? null,
          query: request.query ?? null,
        }),
      )
      .digest('hex');
  }

  private stableStringify(value: unknown): string {
    if (value === null || typeof value !== 'object')
      return JSON.stringify(value);
    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableStringify(item)).join(',')}]`;
    }

    const object = value as Record<string, unknown>;
    return `{${Object.keys(object)
      .sort()
      .map(
        (key) => `${JSON.stringify(key)}:${this.stableStringify(object[key])}`,
      )
      .join(',')}}`;
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
  }

  private getUserId(request: Request) {
    const user = request.user as { id?: string; sub?: string } | undefined;
    return user?.id ?? user?.sub;
  }

  private isUniqueViolation(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
