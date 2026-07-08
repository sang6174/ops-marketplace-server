import { PaymentStatus, PaymentMethod } from '@/domain/entities/enums.enum';

export interface CreatePaymentInput {
  orderId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  paymentIntentId: string;
  gateway: string;
  metadata?: Record<string, any>;
}

export interface ProcessPaymentInput {
  paymentId: string;
  paidAt?: Date;
}

export interface FailPaymentInput {
  paymentId: string;
  errorMessage: string;
}

export interface RefundPaymentInput {
  paymentId: string;
  refundedAt?: Date;
  reason?: string;
}

export interface UpdatePaymentIntentInput {
  paymentId: string;
  newIntentId: string;
}

export interface UpdatePaymentMetadataInput {
  paymentId: string;
  metadata: Record<string, any>;
}

export interface GetPaymentsInput {
  orderId?: string;
  status?: PaymentStatus;
  gateway?: string;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

export interface PaymentResponse {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  paymentIntentId: string;
  gateway: string;
  metadata: Record<string, any>;
  paidAt?: Date;
  refundedAt?: Date;
  refundReason?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentListResponse {
  items: PaymentResponse[];
  total: number;
  limit: number;
  offset: number;
}
