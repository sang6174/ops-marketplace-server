import { BaseException, ExceptionSeverity } from './base.exception';
import {
  ErrorDevelopmentResponse,
  ErrorProductionResponse,
} from '@shared/dto/error-response.dto';

export class DomainException extends BaseException {
  constructor(
    message: string,
    code: string,
    status: number = 400,
    context?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(code, status, ExceptionSeverity.MEDIUM, message, context, cause);
  }

  toErrorDevelopmentResponse(path: string): ErrorDevelopmentResponse {
    return new ErrorDevelopmentResponse(
      this.status,
      this.code,
      path,
      this.message,
      new Date().toISOString(),
      this.context,
      this.cause,
    );
  }

  toErrorProductionResponse(path: string): ErrorProductionResponse {
    return new ErrorProductionResponse(
      this.status,
      this.code,
      path,
      this.message,
      new Date().toISOString(),
    );
  }
}

export class InsufficientStockException extends DomainException {
  constructor(productId: string, available: number, requested: number) {
    super(
      `Insufficient stock for product ${productId}. Available: ${available}, Requested: ${requested}`,
      'INSUFFICIENT_STOCK',
      400,
      { productId, available, requested },
    );
  }
}

export class InvalidOrderStatusException extends DomainException {
  constructor(currentStatus: string, expectedStatus: string) {
    super(
      `Invalid order status transition from ${currentStatus} to ${expectedStatus}`,
      'INVALID_ORDER_STATUS',
      400,
      { currentStatus, expectedStatus },
    );
  }
}

export class CartEmptyException extends DomainException {
  constructor() {
    super('Cart is empty', 'CART_EMPTY', 400);
  }
}

export class ProductNotAvailableException extends DomainException {
  constructor(productId: string) {
    super(
      `Product ${productId} is not available for purchase`,
      'PRODUCT_NOT_AVAILABLE',
      400,
      { productId },
    );
  }
}

export class DuplicateEmailException extends DomainException {
  constructor(email: string) {
    super(`Email ${email} already exists`, 'DUPLICATE_EMAIL', 409, { email });
  }
}
