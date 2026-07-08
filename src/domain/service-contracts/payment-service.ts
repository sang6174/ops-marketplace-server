// domain/service-contract/payment-domain.service.ts

import { Payment } from '@domain/entities/payment';
import { PaymentMethod, PaymentStatus } from '@domain/entities/enums.enum';

export interface PaymentGatewayValidationResult {
  valid: boolean;
  errors: string[];
}

export interface RefundEligibilityResult {
  eligible: boolean;
  reason?: string;
}

export interface IPaymentDomainService {
  validatePaymentData(props: {
    amount: number;
    currency: string;
    method: PaymentMethod;
    gateway: string;
    paymentIntentId: string;
  }): PaymentGatewayValidationResult;

  isEligibleForRefund(
    payment: Payment,
    refundWindowDays?: number,
  ): RefundEligibilityResult;

  canProcessPayment(payment: Payment): { allowed: boolean; reason?: string };
  canFailPayment(payment: Payment): { allowed: boolean; reason?: string };

  formatGatewayError(rawError: any): string;

  isDuplicatePaymentIntent(
    existingPayments: Payment[],
    intentId: string,
  ): boolean;

  calculateRefundableAmount(payment: Payment): number;
}
