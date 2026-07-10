import { PayoutId } from '../value-objects/PayoutId';
import { UserId } from '../value-objects/UserId';
import { Money } from '../value-objects/Money';
import { PayoutReference } from '../value-objects/PayoutReference';

export abstract class PayoutEvent {
  constructor(
    public readonly payoutId: PayoutId,
    public readonly userId: UserId,
    public readonly timestamp: Date,
  ) {}
}

export class PayoutCreated extends PayoutEvent {
  constructor(
    payoutId: PayoutId,
    userId: UserId,
    public readonly amount: Money,
    timestamp: Date,
  ) {
    super(payoutId, userId, timestamp);
  }
}

export class PayoutPaid extends PayoutEvent {
  constructor(
    payoutId: PayoutId,
    userId: UserId,
    public readonly amount: Money,
    public readonly reference: PayoutReference,
    timestamp: Date,
  ) {
    super(payoutId, userId, timestamp);
  }
}

export class PayoutFailed extends PayoutEvent {
  constructor(
    payoutId: PayoutId,
    userId: UserId,
    public readonly amount: Money,
    timestamp: Date,
  ) {
    super(payoutId, userId, timestamp);
  }
}
