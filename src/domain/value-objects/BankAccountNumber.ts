export class BankAccountNumber {
  private constructor(private readonly _value: string) {
    const cleaned = _value.replace(/\s/g, '');
    if (!/^\d{8,14}$/.test(cleaned)) {
      throw new Error('AccountNumber must be between 8 and 14 digits only');
    }
    this._value = cleaned;
  }

  static create(value: string): BankAccountNumber {
    return new BankAccountNumber(value);
  }

  get value(): string {
    return this._value;
  }

  get masked(): string {
    return `****${this._value.slice(-4)}`;
  }

  equals(other: BankAccountNumber): boolean {
    if (!(other instanceof BankAccountNumber)) return false;
    return this._value === other._value;
  }
}
