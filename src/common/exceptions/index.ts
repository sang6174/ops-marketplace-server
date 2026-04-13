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
    super('Email hoặc mật khẩu không hợp lệ');
  }
}

export class TokenExpiredException extends UnauthorizedException {
  constructor() {
    super('Hết phiên đăng nhập, làm ơn đăng nhập lại');
  }
}

export class AccountSuspendedException extends ForbiddenException {
  constructor() {
    super('Tài khoản đã bị khóa');
  }
}

export class AccountPendingException extends ForbiddenException {
  constructor() {
    super('Tài khoản của bạn chưa kích hoạt, làm ơn kiểm tra email');
  }
}

// ===== Resource =====

export class ResourceAlreadyExistsException extends ConflictException {
  constructor(resource: string, field?: string) {
    super(
      field ? `${resource} với ${field} đã tồn tại` : `${resource} đã tồn tại`,
    );
  }
}

export class ResourceNotFoundException extends NotFoundException {
  constructor(resource: string, id?: string) {
    super(
      id
        ? `${resource} với id: "${id}" không tồn tại`
        : `${resource} không tồn tại`,
    );
  }
}

// ===== Shop =====

export class ShopAlreadyExistsException extends ConflictException {
  constructor() {
    super(
      'Bạn đã có cửa hàng, mỗi người bán chỉ được tạo một cửa hàng duy nhất',
    );
  }
}

export class NotShopOwnerException extends ForbiddenException {
  constructor() {
    super('Bạn không có quyền thực hiện thao tác này trên cửa hàng');
  }
}
