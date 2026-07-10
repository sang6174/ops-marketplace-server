export class FarmName {
  private constructor(private readonly _value: string) {
    const trimmed = _value.trim();
    if (trimmed.length === 0) {
      throw new Error('Farm name cannot be empty');
    }
    if (trimmed.length > 200) {
      throw new Error('Farm name must not exceed 200 characters');
    }

    if (!/^[a-zA-Z0-9\p{L}\s\-'.,&()]+$/u.test(trimmed)) {
      throw new Error('Farm name contains invalid characters');
    }
    this._value = trimmed;
  }

  static create(value: string): FarmName {
    return new FarmName(value);
  }

  get value(): string {
    return this._value;
  }

  equals(other: FarmName): boolean {
    return other instanceof FarmName && this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
