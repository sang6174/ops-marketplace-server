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
import { catchError, mergeMap, timeout } from 'rxjs/operators';
import { Prisma } from '@infrastructure/generated/prisma/client';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { SKIP_IDEMPOTENCY_KEY } from '@common/decorators';
import { Logger } from '@nestjs/common';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const IDEMPOTENCY_HEADER = 'idempotency-key';
const LOCK_TTL_MS = 2 * 60 * 1000; // 2 phút
const RETENTION_MS = 24 * 60 * 60 * 1000; // 1 ngày

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
	private readonly logger = new Logger(IdempotencyInterceptor.name);

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

		// Sử dụng transaction để đảm bảo atomicity
		return from(
			this.prisma.$transaction(async tx => {
				let record;
				try {
					record = await tx.idempotencyRequest.create({
						data: {
							key,
							scope,
							requestHash,
							method: request.method.toUpperCase(),
							path: request.originalUrl ?? request.url,
							userId: this.getUserId(request),
							status: 'IN_PROGRESS',
							lockedUntil: new Date(now.getTime() + LOCK_TTL_MS),
							expiresAt: new Date(now.getTime() + RETENTION_MS),
						},
					});
				} catch (error) {
					if (
						error instanceof Prisma.PrismaClientKnownRequestError &&
						error.code === 'P2002'
					) {
						const existing = await tx.idempotencyRequest.findUnique({
							where: { scope_key: { scope, key } },
						});
						if (!existing) {
							throw new ConflictException(
								'Idempotency request could not be reserved',
							);
						}

						if (existing.requestHash !== requestHash) {
							throw new ConflictException(
								'Idempotency-Key was already used with a different request payload',
							);
						}

						if (existing.status === 'COMPLETED') {
							return { action: 'replay', record: existing };
						}

						if (existing.lockedUntil > now) {
							throw new ConflictException(
								'Idempotent request is still in progress',
							);
						}

						const newLockedUntil = new Date(now.getTime() + LOCK_TTL_MS);
						const updateResult = await tx.idempotencyRequest.updateMany({
							where: {
								id: existing.id,
								lockedUntil: existing.lockedUntil,
								status: 'IN_PROGRESS', // chỉ cập nhật nếu vẫn IN_PROGRESS
							},
							data: {
								lockedUntil: newLockedUntil,
							},
						});

						if (updateResult.count === 0) {
							throw new ConflictException(
								'Another request has acquired the lock, please retry',
							);
						}

						const updated = await tx.idempotencyRequest.findUnique({
							where: { id: existing.id },
						});
						if (!updated) {
							throw new ConflictException(
								'Idempotency request could not be reserved',
							);
						}
						return { action: 'process', record: updated };
					}
					throw error;
				}

				return { action: 'process', record };
			}),
		).pipe(
			mergeMap(result => {
				if (result.action === 'replay') {
					if (result.record.responseStatus) {
						response.status(result.record.responseStatus);
					}
					response.setHeader('Idempotency-Replayed', 'true');
					return of(result.record.responseBody);
				}

				response.setHeader('Idempotency-Replayed', 'false');
				return next.handle().pipe(
					timeout(30000), // timeout 30s
					mergeMap(body => {
						return from(
							this.prisma.idempotencyRequest.update({
								where: { id: result.record.id },
								data: {
									status: 'COMPLETED',
									responseStatus: response.statusCode,
									responseBody: this.toJsonValue(body),
								},
							}),
						).pipe(mergeMap(() => of(body)));
					}),
					catchError(error => {
						this.prisma.idempotencyRequest
							.delete({ where: { id: result.record.id } })
							.catch(e => {
								this.logger.error('Failed to delete idempotency record', e);
							});
						return throwError(() => error);
					}),
				);
			}),
		);
	}

	// ========== Helper methods ==========
	private getIdempotencyKey(request: Request): string | undefined {
		const header = request.headers['idempotency-key'];
		const key = Array.isArray(header) ? header[0] : header;
		return typeof key === 'string' && key.trim() ? key.trim() : undefined;
	}

	private getScope(request: Request, userId?: string): string {
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

	private hashRequest(request: Request): string {
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
			return `[${value.map(item => this.stableStringify(item)).join(',')}]`;
		}
		const object = value as Record<string, unknown>;
		return `{${Object.keys(object)
			.sort()
			.map(key => `${JSON.stringify(key)}:${this.stableStringify(object[key])}`)
			.join(',')}}`;
	}

	private toJsonValue(value: unknown): Prisma.InputJsonValue {
		return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
	}

	private getUserId(request: Request): string | undefined {
		const user = (request as any).user as
			| { id?: string; sub?: string }
			| undefined;
		return user?.id ?? user?.sub;
	}
}
