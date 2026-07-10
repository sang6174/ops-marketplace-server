export class CategoryName {
  private constructor(private readonly _value: string) {}

  static create(value: string): CategoryName {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new Error('Category name cannot be empty');
    }
    if (trimmed.length > 100) {
      throw new Error('Category name must not exceed 100 characters');
    }
    if (!/^[a-zA-Z0-9\p{L}\s\-']+$/u.test(trimmed)) {
      throw new Error('Category name contains invalid characters');
    }
    return new CategoryName(trimmed);
  }

  get value(): string {
    return this._value;
  }

  equals(other: CategoryName): boolean {
    return other instanceof CategoryName && this._value === other._value;
  }
}
