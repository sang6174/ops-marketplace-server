export class AccountHolderName {
  private constructor(private readonly _value: string) {
    const trimmed = _value.trim();
    if (trimmed.length < 2 || trimmed.length > 100) {
      throw new Error('AccountHolderName must be between 2 and 100 characters');
    }
    if (!/^[a-zA-ZÀ-ỹ\s]+$/.test(trimmed)) {
      throw new Error('AccountHolderName contains invalid special characters');
    }
    this._value = trimmed;
  }

  static create(value: string): AccountHolderName {
    return new AccountHolderName(value);
  }

  get value(): string {
    return this._value;
  }

  equals(other: AccountHolderName): boolean {
    if (!(other instanceof AccountHolderName)) return false;
    return this._value === other._value;
  }
}
