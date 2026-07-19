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
import { Observable, of, throwError } from 'rxjs';
import { catchError, mergeMap, timeout } from 'rxjs/operators';
import { SKIP_IDEMPOTENCY_KEY } from '@common/decorators';
import { Logger } from '@nestjs/common';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const IDEMPOTENCY_HEADER = 'idempotency-key';
const LOCK_TTL_MS = 2 * 60 * 1000; // 2 phút
const RETENTION_MS = 24 * 60 * 60 * 1000; // 1 ngày

interface IdempotencyRecord {
	key: string;
	scope: string;
	requestHash: string;
	status: 'IN_PROGRESS' | 'COMPLETED';
	lockedUntil: number;
	responseStatus?: number;
	responseBody?: unknown;
	createdAt: number;
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
	private readonly logger = new Logger(IdempotencyInterceptor.name);
	private readonly cache = new Map<string, IdempotencyRecord>();

	constructor(private readonly reflector: Reflector) {}

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

		const now = Date.now();
		const scope = this.getScope(request);
		const requestHash = this.hashRequest(request);
		const cacheKey = `${scope}:${key}`;

		const existing = this.cache.get(cacheKey);
		if (existing) {
			if (existing.requestHash !== requestHash) {
				throw new ConflictException(
					'Idempotency-Key was already used with a different request payload',
				);
			}

			if (existing.status === 'COMPLETED') {
				if (existing.responseStatus) {
					response.status(existing.responseStatus);
				}
				response.setHeader('Idempotency-Replayed', 'true');
				return of(existing.responseBody);
			}

			if (existing.lockedUntil > now) {
				throw new ConflictException(
					'Idempotent request is still in progress',
				);
			}

			// Lock expired, retake lock
			existing.lockedUntil = now + LOCK_TTL_MS;
			response.setHeader('Idempotency-Replayed', 'false');
			return next.handle().pipe(
				timeout(30000),
				mergeMap((body) => {
					existing.status = 'COMPLETED';
					existing.responseStatus = response.statusCode;
					existing.responseBody = body;
					return of(body);
				}),
				catchError((error) => {
					this.cache.delete(cacheKey);
					return throwError(() => error);
				}),
			);
		}

		// New request
		const record: IdempotencyRecord = {
			key,
			scope,
			requestHash,
			status: 'IN_PROGRESS',
			lockedUntil: now + LOCK_TTL_MS,
			createdAt: now,
		};
		this.cache.set(cacheKey, record);

		// Auto cleanup after retention period
		setTimeout(() => {
			this.cache.delete(cacheKey);
		}, RETENTION_MS);

		response.setHeader('Idempotency-Replayed', 'false');
		return next.handle().pipe(
			timeout(30000),
			mergeMap((body) => {
				record.status = 'COMPLETED';
				record.responseStatus = response.statusCode;
				record.responseBody = body;
				return of(body);
			}),
			catchError((error) => {
				this.cache.delete(cacheKey);
				return throwError(() => error);
			}),
		);
	}

	// ========== Helper methods ==========
	private getIdempotencyKey(request: Request): string | undefined {
		const header = request.headers['idempotency-key'];
		const key = Array.isArray(header) ? header[0] : header;
		return typeof key === 'string' && key.trim() ? key.trim() : undefined;
	}

	private getScope(request: Request): string {
		const routePath =
			typeof request.route?.path === 'string'
				? request.route.path
				: request.path;
		return [
			request.method.toUpperCase(),
			request.baseUrl,
			routePath,
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
			return `[${value.map((item) => this.stableStringify(item)).join(',')}]`;
		}
		const object = value as Record<string, unknown>;
		return `{${Object.keys(object)
			.sort()
			.map(
				(key) =>
					`${JSON.stringify(key)}:${this.stableStringify(object[key])}`,
			)
			.join(',')}}`;
	}
}
