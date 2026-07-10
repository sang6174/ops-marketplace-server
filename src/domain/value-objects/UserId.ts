export class UserId {
  private constructor(public readonly value: string) {
    if (!value || value.trim().length === 0)
      throw new Error('UserId cannot be empty');
  }

  static create(value: string): UserId {
    return new UserId(value);
  }

  static generate(): UserId {
    return new UserId(crypto.randomUUID());
  }

  equals(other: UserId): boolean {
    return this.value === other.value;
  }
}
