import { PayoutStatusEnum } from '../entities/enums.enum';

export class PayoutState {
  private constructor(private readonly _value: PayoutStatusEnum) {}

  static pending(): PayoutState {
    return new PayoutState(PayoutStatusEnum.PENDING);
  }
  static paid(): PayoutState {
    return new PayoutState(PayoutStatusEnum.PAID);
  }
  static failed(): PayoutState {
    return new PayoutState(PayoutStatusEnum.FAILED);
  }

  get value(): PayoutStatusEnum {
    return this._value;
  }

  canTransitionTo(newState: PayoutState): boolean {
    const transitions: Record<PayoutStatusEnum, PayoutStatusEnum[]> = {
      [PayoutStatusEnum.PENDING]: [
        PayoutStatusEnum.PAID,
        PayoutStatusEnum.FAILED,
      ],
      [PayoutStatusEnum.PAID]: [],
      [PayoutStatusEnum.FAILED]: [PayoutStatusEnum.PENDING],
    };
    return transitions[this._value]?.includes(newState.value) || false;
  }

  equals(other: PayoutState): boolean {
    return other instanceof PayoutState && this._value === other._value;
  }
}
