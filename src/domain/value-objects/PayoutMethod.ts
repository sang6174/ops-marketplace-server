import { PayoutMethodEnum } from '../entities/enums.enum';

export class PayoutMethod {
  private constructor(private readonly _value: PayoutMethodEnum) {}

  static bankTransfer(): PayoutMethod {
    return new PayoutMethod(PayoutMethodEnum.BANK_TRANSFER);
  }
  static stripe(): PayoutMethod {
    return new PayoutMethod(PayoutMethodEnum.STRIPE);
  }
  static momo(): PayoutMethod {
    return new PayoutMethod(PayoutMethodEnum.MOMO);
  }
  static cash(): PayoutMethod {
    return new PayoutMethod(PayoutMethodEnum.CASH);
  }
  static fromString(value: string): PayoutMethod {
    const normalized = value.toLowerCase().trim();
    switch (normalized) {
      case 'BANK_TRANSFER':
        return PayoutMethod.bankTransfer();
      case 'STRIPE':
        return PayoutMethod.stripe();
      case 'MOMO':
        return PayoutMethod.momo();
      case 'CASH':
        return PayoutMethod.cash();
      default:
        throw new Error(`Invalid payout method: ${value}`);
    }
  }

  get value(): PayoutMethodEnum {
    return this._value;
  }

  equals(other: PayoutMethod): boolean {
    return other instanceof PayoutMethod && this._value === other._value;
  }
}
