// domain/state/PaymentState.ts
import { Payment } from '../entities/orders/Payment';
import { PaymentStatus } from '../entities/enums.enum';
import { RefundReason } from '../value-objects/RefundReason';
import { ErrorMessage } from '../value-objects/ErrorMessage';

export interface PaymentState {
  get status(): PaymentStatus;
  isPaid(): boolean;
  isPending(): boolean;
  isFailed(): boolean;
  isRefunded(): boolean;
  canMarkAsPaid(): boolean;
  canMarkAsFailed(): boolean;
  canRefund(): boolean;
  canUpdateIntentId(): boolean;
  markAsPaid(payment: Payment, paidAt: Date): void;
  markAsFailed(payment: Payment, errorMessage: ErrorMessage): void;
  refund(payment: Payment, refundedAt: Date, reason?: RefundReason): void;
}

// Base class để tránh duplicate
export abstract class BasePaymentState implements PaymentState {
  abstract get status(): PaymentStatus;

  isPaid(): boolean {
    return this.status === PaymentStatus.SUCCEEDED;
  }
  isPending(): boolean {
    return this.status === PaymentStatus.PENDING;
  }
  isFailed(): boolean {
    return this.status === PaymentStatus.FAILED;
  }
  isRefunded(): boolean {
    return this.status === PaymentStatus.REFUNDED;
  }

  canMarkAsPaid(): boolean {
    return this.isPending();
  }
  canMarkAsFailed(): boolean {
    return this.isPending();
  }
  canRefund(): boolean {
    return this.isPaid();
  }
  canUpdateIntentId(): boolean {
    return this.isPending() || this.isFailed();
  }

  markAsPaid(payment: Payment, paidAt: Date): void {
    if (!this.canMarkAsPaid())
      throw new Error(`Cannot mark as paid from state ${this.status}`);
    payment.markAsPaid(paidAt);
  }

  markAsFailed(payment: Payment, errorMessage: ErrorMessage): void {
    if (!this.canMarkAsFailed())
      throw new Error(`Cannot mark as failed from state ${this.status}`);
    payment.markAsFailed(errorMessage.value);
  }

  refund(payment: Payment, refundedAt: Date, reason?: RefundReason): void {
    if (!this.canRefund())
      throw new Error(`Cannot refund from state ${this.status}`);
    payment.refund(refundedAt, reason?.value);
  }
}

// Concrete States
export class PendingState extends BasePaymentState {
  get status(): PaymentStatus {
    return PaymentStatus.PENDING;
  }
}

export class SucceededState extends BasePaymentState {
  get status(): PaymentStatus {
    return PaymentStatus.SUCCEEDED;
  }
  override canMarkAsPaid(): boolean {
    return false;
  }
  override canMarkAsFailed(): boolean {
    return false;
  }
  override canRefund(): boolean {
    return true;
  }
}

export class FailedState extends BasePaymentState {
  get status(): PaymentStatus {
    return PaymentStatus.FAILED;
  }
  override canMarkAsPaid(): boolean {
    return false;
  }
  override canMarkAsFailed(): boolean {
    return false;
  }
  override canRefund(): boolean {
    return false;
  }
  override canUpdateIntentId(): boolean {
    return true;
  }
}

export class RefundedState extends BasePaymentState {
  get status(): PaymentStatus {
    return PaymentStatus.REFUNDED;
  }
  override canMarkAsPaid(): boolean {
    return false;
  }
  override canMarkAsFailed(): boolean {
    return false;
  }
  override canRefund(): boolean {
    return false;
  }
  override canUpdateIntentId(): boolean {
    return false;
  }
}
