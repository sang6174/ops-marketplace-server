// domain/use-case-contracts/payment.use-cases.ts
import { Payment } from '@domain/entities/payment';
import { PaymentMethod, PaymentStatus } from '@domain/entities/enums.enum';

export interface CreatePaymentInput {
  orderId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  paymentIntentId: string;
  gateway: string;
  metadata?: Record<string, any>;
}

export interface HandlePaymentWebhookInput {
  gateway: string;
  paymentIntentId: string;
  event: 'succeeded' | 'failed' | 'refunded';
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface UpdatePaymentStatusInput {
  paymentId: string;
  status: PaymentStatus;
  errorMessage?: string;
}

export interface RefundPaymentInput {
  paymentId: string;
  reason?: string;
}

export interface UpdatePaymentIntentInput {
  paymentId: string;
  newIntentId: string;
}

export interface GetPaymentByOrderInput {
  orderId: string;
}

export interface ICreatePaymentUseCase {
  execute(input: CreatePaymentInput): Promise<Payment>;
}

export interface IHandlePaymentWebhookUseCase {
  execute(input: HandlePaymentWebhookInput): Promise<Payment>;
}

export interface IGetPaymentByIdUseCase {
  execute(id: string): Promise<Payment | null>;
}

export interface IGetPaymentByOrderUseCase {
  execute(input: GetPaymentByOrderInput): Promise<Payment | null>;
}

export interface IUpdatePaymentStatusUseCase {
  execute(input: UpdatePaymentStatusInput): Promise<Payment>;
}

export interface IRefundPaymentUseCase {
  execute(input: RefundPaymentInput): Promise<Payment>;
}

export interface IUpdatePaymentIntentUseCase {
  execute(input: UpdatePaymentIntentInput): Promise<Payment>;
}

export interface IRetryFailedPaymentUseCase {
  execute(paymentId: string, newIntentId: string): Promise<Payment>;
}

export interface IDeletePaymentUseCase {
  execute(id: string): Promise<void>;
}
