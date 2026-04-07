// src/common/exceptions/index.ts
import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

// ===== Base Exception =====

export class AppException extends BadRequestException {
  constructor(
    message: string,
    public readonly errorCode?: string,
  ) {
    super(message);
  }
}

// ===== Auth =====
export class InvalidCredentialsException extends UnauthorizedException {
  constructor() {
    super('Invalid email or password');
  }
}

export class TokenExpiredException extends UnauthorizedException {
  constructor() {
    super('Token has expired, please login again');
  }
}

export class AccountSuspendedException extends ForbiddenException {
  constructor() {
    super('Account has been suspended');
  }
}

export class AccountPendingException extends ForbiddenException {
  constructor() {
    super('Account is pending activation, please verify your email');
  }
}

// ===== Resource =====

export class ResourceAlreadyExistsException extends ConflictException {
  constructor(resource: string, field?: string) {
    super(
      field
        ? `${resource} with ${field} already exists`
        : `${resource} already exists`,
    );
  }
}

export class ResourceNotFoundException extends NotFoundException {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} with id"${id}" not exists` : `${resource} not exists`,
    );
  }
}

// ===== Shop =====

export class ShopAlreadyExistsException extends ConflictException {
  constructor() {
    super('Bạn đã có shop, mỗi người dùng chỉ được tạo 1 shop');
  }
}

export class NotShopOwnerException extends ForbiddenException {
  constructor() {
    super('Bạn không có quyền thực hiện thao tác này trên shop');
  }
}
