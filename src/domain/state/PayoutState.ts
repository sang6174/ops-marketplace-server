import { Payout } from '../entities/payouts/Payout';
import { PayoutState } from '../value-objects/PayoutState';

export interface IPayoutState {
  get status(): PayoutState;
  canMarkPaid(): boolean;
  canMarkFailed(): boolean;
  markPaid(payout: Payout, reference: string): void;
  markFailed(payout: Payout): void;
}

export abstract class BasePayoutState implements IPayoutState {
  abstract get status(): PayoutState;

  canMarkPaid(): boolean {
    return this.status.equals(PayoutState.pending());
  }

  canMarkFailed(): boolean {
    return this.status.equals(PayoutState.pending());
  }

  markPaid(payout: Payout, reference: string): void {
    if (!this.canMarkPaid()) {
      throw new Error(`Cannot mark as paid from state ${this.status.value}`);
    }
    payout.setState(PayoutState.paid());
  }

  markFailed(payout: Payout): void {
    if (!this.canMarkFailed()) {
      throw new Error(`Cannot mark as failed from state ${this.status.value}`);
    }
    payout.setState(PayoutState.failed());
  }
}

export class PendingPayoutState extends BasePayoutState {
  get status(): PayoutState {
    return PayoutState.pending();
  }
}

export class PaidPayoutState extends BasePayoutState {
  get status(): PayoutState {
    return PayoutState.paid();
  }
  override canMarkPaid(): boolean {
    return false;
  }
  override canMarkFailed(): boolean {
    return false;
  }
  override markPaid(payout: Payout, reference: string): void {
    throw new Error('Payout is already paid');
  }
  override markFailed(payout: Payout): void {
    throw new Error('Paid payout cannot be marked as failed');
  }
}

export class FailedPayoutState extends BasePayoutState {
  get status(): PayoutState {
    return PayoutState.failed();
  }
  override canMarkPaid(): boolean {
    return false;
  }
  override markPaid(payout: Payout, reference: string): void {
    throw new Error('Failed payout must be retried (mark as pending first)');
  }
}
