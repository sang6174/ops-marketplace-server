export class Currency {
  private constructor(public readonly code: string) {
    if (!/^[A-Z]{3}$/.test(code)) {
      throw new Error('Currency code must be a 3-letter ISO 4217 code');
    }
  }

  static VND = new Currency('VND');
  static USD = new Currency('USD');
  static EUR = new Currency('EUR');

  static fromCode(code: string): Currency {
    return new Currency(code.toUpperCase());
  }

  equals(other: Currency): boolean {
    return other instanceof Currency && this.code === other.code;
  }

  toString(): string {
    return this.code;
  }
}
