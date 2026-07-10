export class CompanyName {
  private constructor(private readonly _value: string) {
    const trimmed = _value.trim();
    if (trimmed.length === 0) {
      throw new Error('Company name cannot be empty');
    }
    if (trimmed.length > 100) {
      throw new Error('Company name must not exceed 100 characters');
    }
    this._value = trimmed;
  }

  static create(value: string): CompanyName {
    return new CompanyName(value);
  }

  get value(): string {
    return this._value;
  }

  equals(other: CompanyName): boolean {
    return other instanceof CompanyName && this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
