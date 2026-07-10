export class BusinessLicense {
  private constructor(private readonly _value: string) {
    const trimmed = _value.trim();
    if (trimmed.length === 0) {
      throw new Error('Business license cannot be empty');
    }
    if (trimmed.length > 50) {
      throw new Error('Business license must not exceed 50 characters');
    }

    if (!/^[a-zA-Z0-9\-_.\s]+$/.test(trimmed)) {
      throw new Error('Business license contains invalid characters');
    }
    this._value = trimmed;
  }

  static create(value: string): BusinessLicense {
    return new BusinessLicense(value);
  }

  get value(): string {
    return this._value;
  }

  equals(other: BusinessLicense): boolean {
    return other instanceof BusinessLicense && this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
