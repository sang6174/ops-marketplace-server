export class TaxId {
  private constructor(public readonly value: string) {
    if (!/^\d{13}$/.test(value)) throw new Error('Tax ID must be 13 digits');
  }

  static create(value: string): TaxId {
    return new TaxId(value);
  }

  equals(other: TaxId): boolean {
    return this.value === other.value;
  }
}
