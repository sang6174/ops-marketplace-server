import { Payout } from '@domain/entities/payouts/Payout';
import { Money } from '@/domain/value-objects/Money';

export interface PayoutValidationResult {
  valid: boolean;
  errors: string[];
}

export interface PayoutEligibilityResult {
  eligible: boolean;
  reason?: string;
}

export interface IPayoutDomainService {
  validatePayout(props: {
    userId: string;
    amount: Money;
    method?: string;
  }): PayoutValidationResult;

  canMarkAsPaid(payout: Payout): { allowed: boolean; reason?: string };
  canMarkAsFailed(payout: Payout): { allowed: boolean; reason?: string };

  calculatePendingTotal(payouts: Payout[]): Money;

  isEligibleForPayout(
    userId: string,
    amount: Money,
    bankAccounts: any[],
  ): PayoutEligibilityResult;

  generateReference(userId: string): string;

  groupPayoutsByUser(payouts: Payout[]): Map<string, Payout[]>;

  hasReachedPayoutLimit(
    userId: string,
    pendingPayouts: Payout[],
    maxPendingAmount: Money,
  ): { reached: boolean; reason?: string };
}
