export class Country {
  constructor(
    public readonly code: string,
    public readonly name: string,
  ) {
    if (!code || code.length !== 2) {
      throw new Error('Country code must be exactly 2 characters');
    }
    if (!name || name.trim().length === 0) {
      throw new Error('Country name cannot be empty');
    }
  }

  equals(other: Country): boolean {
    return other instanceof Country && this.code === other.code;
  }

  toString(): string {
    return this.code;
  }
}
