export class RefundReason {
  private constructor(private readonly _value: string) {}
  static create(value: string): RefundReason {
    const trimmed = value.trim();
    if (trimmed.length === 0) throw new Error('Refund reason cannot be empty');
    return new RefundReason(trimmed);
  }
  get value(): string {
    return this._value;
  }
  equals(other: RefundReason): boolean {
    return other instanceof RefundReason && this._value === other._value;
  }
}
