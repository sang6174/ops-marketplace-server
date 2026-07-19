export class FullName {
  private constructor(public readonly value: string) {}

  static create(name: string): FullName {
    if (!name || name.trim().length === 0) {
      throw new Error('Full name cannot be empty');
    }
    return new FullName(name.trim());
  }

  toString(): string {
    return this.value;
  }

  equals(other: FullName): boolean {
    return this.value === other.value;
  }
}
