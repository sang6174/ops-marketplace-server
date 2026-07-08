import {
  CreatePaymentInput,
  ProcessPaymentInput,
  FailPaymentInput,
  RefundPaymentInput,
  UpdatePaymentIntentInput,
  UpdatePaymentMetadataInput,
  GetPaymentsInput,
  PaymentResponse,
  PaymentListResponse,
} from '@modules/payment/interfaces/dtos/payment.dto';

export interface ICreatePaymentUseCase {
  execute(input: CreatePaymentInput): Promise<PaymentResponse>;
}

export interface IProcessPaymentUseCase {
  execute(input: ProcessPaymentInput): Promise<PaymentResponse>;
}

export interface IFailPaymentUseCase {
  execute(input: FailPaymentInput): Promise<PaymentResponse>;
}

export interface IRefundPaymentUseCase {
  execute(input: RefundPaymentInput): Promise<PaymentResponse>;
}

export interface IGetPaymentByIdUseCase {
  execute(paymentId: string): Promise<PaymentResponse>;
}

export interface IGetPaymentByOrderIdUseCase {
  execute(orderId: string): Promise<PaymentResponse>;
}

export interface IGetPaymentsUseCase {
  execute(input: GetPaymentsInput): Promise<PaymentListResponse>;
}

export interface IUpdatePaymentIntentUseCase {
  execute(input: UpdatePaymentIntentInput): Promise<PaymentResponse>;
}

export interface IUpdatePaymentMetadataUseCase {
  execute(input: UpdatePaymentMetadataInput): Promise<PaymentResponse>;
}

export interface PaymentWebhookInput {
  gateway: string;
  payload: Record<string, any>;
  signature: string;
}

export interface IPaymentWebhookHandlerUseCase {
  execute(input: PaymentWebhookInput): Promise<void>;
}
