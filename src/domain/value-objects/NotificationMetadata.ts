export class NotificationMetadata {
  private constructor(private readonly _value: Record<string, any>) {}

  static create(value: Record<string, any> = {}): NotificationMetadata {
    return new NotificationMetadata({ ...value });
  }

  get value(): Record<string, any> {
    return { ...this._value };
  }

  equals(other: NotificationMetadata): boolean {
    return (
      other instanceof NotificationMetadata &&
      JSON.stringify(this._value) === JSON.stringify(other._value)
    );
  }
}
