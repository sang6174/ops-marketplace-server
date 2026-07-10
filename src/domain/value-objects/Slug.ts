import { CategoryName } from './CategoryName';
export class Slug {
  private constructor(private readonly _value: string) {}

  static create(value: string): Slug {
    const trimmed = value.trim().toLowerCase();
    if (trimmed.length === 0) {
      throw new Error('Slug cannot be empty');
    }
    if (trimmed.length > 100) {
      throw new Error('Slug must not exceed 100 characters');
    }

    if (!/^[a-z0-9-]+$/.test(trimmed)) {
      throw new Error(
        'Slug can only contain lowercase letters, numbers, and hyphens',
      );
    }

    if (trimmed.includes('--')) {
      throw new Error('Slug cannot contain consecutive hyphens');
    }

    if (trimmed.startsWith('-') || trimmed.endsWith('-')) {
      throw new Error('Slug cannot start or end with a hyphen');
    }

    return new Slug(trimmed);
  }

  static generateFromName(name: CategoryName): Slug {
    const slug = name.value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    return Slug.create(slug);
  }

  get value(): string {
    return this._value;
  }

  equals(other: Slug): boolean {
    return other instanceof Slug && this._value === other._value;
  }
}
