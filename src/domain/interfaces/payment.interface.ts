import { PaymentMethod, PaymentStatus } from '../entities/enums.enum';

export interface IPayment {
  readonly id: string;
  readonly orderId: string;
  readonly amount: number;
  readonly currency: string;
  readonly method: PaymentMethod;
  readonly status: PaymentStatus;
  readonly paymentIntentId: string;
  readonly gateway: string;
  readonly metadata: Record<string, unknown>;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly refundedAt?: Date;
  readonly errorMessage?: string;
  readonly paidAt?: Date;
}
