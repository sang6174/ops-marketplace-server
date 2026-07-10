export class DriverLicense {
  private constructor(private readonly _value: string) {
    const trimmed = _value.trim();
    if (!/^[A-Z0-9]{12}$/.test(trimmed)) {
      throw new Error(
        'Driver license must be exactly 12 alphanumeric characters',
      );
    }
    this._value = trimmed.toUpperCase();
  }

  static create(value: string): DriverLicense {
    return new DriverLicense(value);
  }

  get value(): string {
    return this._value;
  }

  equals(other: DriverLicense): boolean {
    return other instanceof DriverLicense && this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
