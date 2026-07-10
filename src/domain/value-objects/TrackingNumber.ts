export class TrackingNumber {
  private constructor(private readonly _value: string) {}

  static create(value: string): TrackingNumber {
    const trimmed = value.trim();
    if (trimmed.length === 0)
      throw new Error('Tracking number cannot be empty');

    if (!/^[a-zA-Z0-9-]+$/.test(trimmed)) {
      throw new Error('Tracking number contains invalid characters');
    }
    return new TrackingNumber(trimmed);
  }

  get value(): string {
    return this._value;
  }

  equals(other: TrackingNumber): boolean {
    return other instanceof TrackingNumber && this._value === other._value;
  }
}
