export class NotificationId {
  private constructor(public readonly value: string) {}

  static create(value: string): NotificationId {
    if (!value || value.trim().length === 0) {
      throw new Error('NotificationId cannot be empty');
    }
    return new NotificationId(value);
  }

  static generate(): NotificationId {
    return new NotificationId(crypto.randomUUID());
  }

  equals(other: NotificationId): boolean {
    return other instanceof NotificationId && this.value === other.value;
  }
}
