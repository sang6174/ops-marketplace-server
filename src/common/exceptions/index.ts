// src/common/exceptions/index.ts
import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

// ===== Base Exception =====
export class AppException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly errorCode?: string,
    public readonly details?: unknown,
  ) {
    const payload: Record<string, unknown> = {
      message,
      ...(errorCode && { errorCode }),
    };

    if (process.env.NODE_ENV === 'development' && details !== undefined) {
      payload.details = details;
    }

    super(payload, status);
  }
}

const developmentDetails = (details?: unknown): Record<string, unknown> =>
  process.env.NODE_ENV === 'development' && details ? { details } : {};

// ===== Auth Exceptions (401, 403) =====

export class InvalidCredentialsException extends UnauthorizedException {
  constructor(details?: unknown) {
    super({
      message: 'Invalid email or password',
      ...developmentDetails(details),
    });
  }
}

export class TokenExpiredException extends UnauthorizedException {
  constructor(details?: unknown) {
    super({
      message: 'Session expired, please log in again',
      ...developmentDetails(details),
    });
  }
}

export class AccountSuspendedException extends ForbiddenException {
  constructor(details?: unknown) {
    super({
      message: 'Account has been suspended',
      ...developmentDetails(details),
    });
  }
}

export class AccountPendingException extends ForbiddenException {
  constructor(details?: unknown) {
    super({
      message: 'Account is not activated, please check your email',
      ...developmentDetails(details),
    });
  }
}

//  ===== Resource Exceptions (404, 409) =====

export class ResourceNotFoundException extends NotFoundException {
  constructor(
    resource: string,
    identifier?: string | number,
    details?: unknown,
  ) {
    const message = identifier
      ? `${resource} with identifier "${identifier}" not found`
      : `${resource} not found`;

    super({
      message,
      ...developmentDetails(details),
    });
  }
}

export class ResourceAlreadyExistsException extends ConflictException {
  constructor(resource: string, field?: string, details?: unknown) {
    const message = field
      ? `${resource} with this ${field} already exists`
      : `${resource} already exists`;

    super({
      message,
      ...developmentDetails(details),
    });
  }
}

// ===== Shop Exceptions (409, 403) =====

export class ShopAlreadyExistsException extends ConflictException {
  constructor(details?: unknown) {
    super({
      message: 'You already have a shop. Each seller can only create one shop.',
      ...developmentDetails(details),
    });
  }
}

export class NotShopOwnerException extends ForbiddenException {
  constructor(details?: unknown) {
    super({
      message: 'You do not have permission to perform this action on this shop',
      ...developmentDetails(details),
    });
  }
}

// ===== Utilities =====
export const isDevelopment = (): boolean =>
  process.env.NODE_ENV === 'development';
