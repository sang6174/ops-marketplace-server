export class BankName {
  private constructor(private readonly _value: string) {
    const trimmed = _value.trim();
    if (trimmed.length < 2 || trimmed.length > 100) {
      throw new Error('BankName must be between 2 and 100 characters');
    }
    this._value = trimmed.replace(/\b\w/g, (char) => char.toUpperCase());
  }

  static create(value: string): BankName {
    return new BankName(value);
  }

  get value(): string {
    return this._value;
  }

  equals(other: BankName): boolean {
    if (!(other instanceof BankName)) return false;
    return this._value === other._value;
  }
}
