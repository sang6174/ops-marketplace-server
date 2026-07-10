// domain/entities/payout.ts
import { Money } from '../value-objects/money';
import { PayoutStatus } from './enums.enum';

export class Payout {
  private constructor(
    public readonly id: string,
    public readonly userId: string,
    private _amount: Money,
    private _status: PayoutStatus,
    private _method: string | null,
    private _reference: string | null,
    public readonly createdAt: Date,
    private _paidAt: Date | null,
  ) {}

  static create(props: {
    userId: string;
    amount: Money;
    method?: string;
  }): Payout {
    return new Payout(
      crypto.randomUUID(),
      props.userId,
      props.amount,
      PayoutStatus.PENDING,
      props.method ?? null,
      null,
      new Date(),
      null,
    );
  }

  get amount(): Money {
    return this._amount;
  }
  get status(): PayoutStatus {
    return this._status;
  }
  get method(): string | null {
    return this._method;
  }
  get reference(): string | null {
    return this._reference;
  }
  get paidAt(): Date | null {
    return this._paidAt;
  }

  markPaid(reference: string): void {
    if (this._status !== PayoutStatus.PENDING)
      throw new Error('Payout is not pending');
    this._status = PayoutStatus.PAID;
    this._reference = reference;
    this._paidAt = new Date();
  }

  markFailed(): void {
    if (this._status !== PayoutStatus.PENDING)
      throw new Error('Payout is not pending');
    this._status = PayoutStatus.FAILED;
  }

  equals(other: Payout): boolean {
    if (!(other instanceof Payout)) {
      return false;
    }
    return this.id === other.id;
  }
}
