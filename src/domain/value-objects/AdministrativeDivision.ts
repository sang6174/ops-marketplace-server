import { Country } from './Country';

export class AdministrativeDivision {
  constructor(
    public readonly country: Country,
    public readonly level: number,
    public readonly code: string,
    public readonly name: string,
    public readonly parentCode?: string,
  ) {
    if (![2, 3, 4].includes(level)) {
      throw new Error('AdministrativeDivision level must be 2, 3, or 4');
    }
    if (!code || code.trim().length === 0) {
      throw new Error('AdministrativeDivision code cannot be empty');
    }
    if (!name || name.trim().length === 0) {
      throw new Error('AdministrativeDivision name cannot be empty');
    }
    if (parentCode && parentCode === code) {
      throw new Error('Parent code cannot be the same as code');
    }
  }

  equals(other: AdministrativeDivision): boolean {
    return (
      other instanceof AdministrativeDivision &&
      this.country.equals(other.country) &&
      this.level === other.level &&
      this.code === other.code
    );
  }

  toString(): string {
    return `${this.country.code}-${this.code}`;
  }
}
