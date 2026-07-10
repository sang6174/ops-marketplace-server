export class LicensePlate {
  private constructor(private readonly _value: string) {
    const trimmed = _value.trim();
    const regex = /^[A-Z0-9]{2,3}-[0-9]{4,6}$/;
    if (!regex.test(trimmed)) {
      throw new Error('Invalid license plate format. Expected: XX-1234');
    }
    this._value = trimmed.toUpperCase();
  }

  static create(value: string): LicensePlate {
    return new LicensePlate(value);
  }

  get value(): string {
    return this._value;
  }

  equals(other: LicensePlate): boolean {
    return other instanceof LicensePlate && this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
