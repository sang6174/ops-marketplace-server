import { Payment } from '../entities/orders/Payment';

export interface PaymentSpecification {
  isSatisfiedBy(payment: Payment): boolean;
}

export class RefundableSpecification implements PaymentSpecification {
  isSatisfiedBy(payment: Payment): boolean {
    return payment.isRefundable();
  }
}

export class PendingSpecification implements PaymentSpecification {
  isSatisfiedBy(payment: Payment): boolean {
    return payment.isPending();
  }
}

export class FailedSpecification implements PaymentSpecification {
  isSatisfiedBy(payment: Payment): boolean {
    return payment.isFailed();
  }
}

export class PaidSpecification implements PaymentSpecification {
  isSatisfiedBy(payment: Payment): boolean {
    return payment.isPaid();
  }
}

// Composite
export class AndSpecification implements PaymentSpecification {
  constructor(private specs: PaymentSpecification[]) {}
  isSatisfiedBy(payment: Payment): boolean {
    return this.specs.every((spec) => spec.isSatisfiedBy(payment));
  }
}
