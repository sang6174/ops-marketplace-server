export class AccountNumber {
  private constructor(private readonly _value: string) {
    const cleaned = _value.replace(/\s/g, '');
    if (!/^\d{8,20}$/.test(cleaned)) {
      throw new Error('AccountNumber must be between 8 and 20 digits only');
    }
    this._value = cleaned;
  }

  static create(value: string): AccountNumber {
    return new AccountNumber(value);
  }

  get value(): string {
    return this._value;
  }

  get masked(): string {
    return `****${this._value.slice(-4)}`;
  }

  equals(other: AccountNumber): boolean {
    if (!(other instanceof AccountNumber)) return false;
    return this._value === other._value;
  }
}
