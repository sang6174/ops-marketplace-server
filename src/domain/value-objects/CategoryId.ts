export class CategoryId {
  private constructor(public readonly value: string) {}

  static create(value: string): CategoryId {
    if (!value || value.trim().length === 0) {
      throw new Error('CategoryId cannot be empty');
    }
    return new CategoryId(value);
  }

  static generate(): CategoryId {
    return new CategoryId(crypto.randomUUID());
  }

  equals(other: CategoryId): boolean {
    return other instanceof CategoryId && this.value === other.value;
  }
}
