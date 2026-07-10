import { PayoutId } from '../../value-objects/PayoutId';
import { UserId } from '../../value-objects/UserId';
import { Money } from '../../value-objects/Money';
import { PayoutMethod } from '../../value-objects/PayoutMethod';
import { PayoutReference } from '../../value-objects/PayoutReference';
import { PayoutState } from '../../value-objects/PayoutState';
import {
  IPayoutState,
  PendingPayoutState,
  PaidPayoutState,
  FailedPayoutState,
} from '../../state/PayoutState';
import {
  PayoutCreated,
  PayoutPaid,
  PayoutFailed,
} from '../../events/PayoutEvents';

export class Payout {
  private _state: IPayoutState;
  private _events: any[] = [];

  private constructor(
    public readonly id: PayoutId,
    public readonly userId: UserId,
    private _amount: Money,
    private _method: PayoutMethod | null,
    private _reference: PayoutReference | null,
    public readonly createdAt: Date,
    private _paidAt: Date | null,
    initialState?: IPayoutState,
  ) {
    this._state = initialState || new PendingPayoutState();
  }

  // ===== Factory Methods =====
  static create(props: {
    id: PayoutId;
    userId: UserId;
    amount: Money;
    method?: PayoutMethod;
    createdAt?: Date;
  }): Payout {
    const now = props.createdAt || new Date();
    const payout = new Payout(
      props.id,
      props.userId,
      props.amount,
      props.method ?? null,
      null,
      now,
      null,
      new PendingPayoutState(),
    );
    payout.addEvent(
      new PayoutCreated(props.id, props.userId, props.amount, now),
    );
    return payout;
  }

  static reconstitute(props: {
    id: PayoutId;
    userId: UserId;
    amount: Money;
    method: PayoutMethod | null;
    reference: PayoutReference | null;
    status: PayoutState;
    createdAt: Date;
    paidAt: Date | null;
  }): Payout {
    const state = Payout.createStateFromStatus(props.status);
    return new Payout(
      props.id,
      props.userId,
      props.amount,
      props.method,
      props.reference,
      props.createdAt,
      props.paidAt,
      state,
    );
  }

  private static createStateFromStatus(status: PayoutState): IPayoutState {
    if (status.equals(PayoutState.pending())) return new PendingPayoutState();
    if (status.equals(PayoutState.paid())) return new PaidPayoutState();
    if (status.equals(PayoutState.failed())) return new FailedPayoutState();
    throw new Error(`Unknown status: ${status.value}`);
  }

  // ===== Getters =====
  get amount(): Money {
    return this._amount;
  }
  get method(): PayoutMethod | null {
    return this._method;
  }
  get reference(): PayoutReference | null {
    return this._reference;
  }
  get paidAt(): Date | null {
    return this._paidAt;
  }
  get status(): PayoutState {
    return this._state.status;
  }
  get events(): any[] {
    return [...this._events];
  }

  // ===== Behaviors =====
  markPaid(reference: PayoutReference, timestamp: Date = new Date()): void {
    this._state.markPaid(this, reference.value);
    this._reference = reference;
    this._paidAt = timestamp;
    this.addEvent(
      new PayoutPaid(this.id, this.userId, this._amount, reference, timestamp),
    );
  }

  markFailed(timestamp: Date = new Date()): void {
    this._state.markFailed(this);
    this.addEvent(
      new PayoutFailed(this.id, this.userId, this._amount, timestamp),
    );
  }

  setState(status: PayoutState): void {
    this._state = Payout.createStateFromStatus(status);
  }

  private addEvent(event: any): void {
    this._events.push(event);
  }

  clearEvents(): void {
    this._events = [];
  }

  equals(other: Payout): boolean {
    return this.id.equals(other.id);
  }
}
