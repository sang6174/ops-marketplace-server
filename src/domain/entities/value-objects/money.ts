import { Currency } from './Currency';

export class Money {
  private constructor(
    public readonly amount: number,
    public readonly currency: Currency,
  ) {
    this.validate();
  }

  private validate(): void {
    if (!Number.isFinite(this.amount)) {
      throw new Error('Amount must be a finite number');
    }
    if (Number.isNaN(this.amount)) {
      throw new Error('Amount cannot be NaN');
    }

    if (this.amount < 0) throw new Error('Amount must be non-negative');
  }

  static fromDecimal(amount: number, currency: Currency = Currency.VND): Money {
    return new Money(amount, currency);
  }

  static fromCents(cents: number, currency: Currency = Currency.VND): Money {
    return new Money(cents / 100, currency);
  }

  static zero(currency: Currency = Currency.VND): Money {
    return new Money(0, currency);
  }

  add(other: Money): Money {
    this.ensureSameCurrency(other);
    return new Money(this.amount + other.amount, this.currency);
  }

  subtract(other: Money): Money {
    this.ensureSameCurrency(other);
    return new Money(this.amount - other.amount, this.currency);
  }

  multiply(factor: number): Money {
    if (!Number.isFinite(factor))
      throw new Error('Factor must be a finite number');
    return new Money(this.amount * factor, this.currency);
  }

  divide(divisor: number): Money {
    if (!Number.isFinite(divisor) || divisor === 0) {
      throw new Error('Divisor must be non-zero finite number');
    }
    return new Money(this.amount / divisor, this.currency);
  }

  percentage(percent: number): Money {
    if (percent < 0 || percent > 100) {
      throw new Error('Percentage must be between 0 and 100');
    }
    return this.multiply(percent / 100);
  }

  allocate(ratios: number[]): Money[] {
    const totalRatio = ratios.reduce((a, b) => a + b, 0);
    if (totalRatio === 0) throw new Error('Total ratio must be > 0');

    const cents = Math.round(this.amount * 100);
    let remaining = cents;
    const results: number[] = [];

    for (let i = 0; i < ratios.length; i++) {
      const share = Math.round((cents * ratios[i]) / totalRatio);
      results.push(share);
      remaining -= share;
    }

    results[0] += remaining;

    return results.map((c) => Money.fromCents(c, this.currency));
  }

  equals(other: Money): boolean {
    if (!(other instanceof Money)) return false;
    return this.amount === other.amount && this.currency.equals(other.currency);
  }

  isZero(): boolean {
    return this.amount === 0;
  }

  isPositive(): boolean {
    return this.amount > 0;
  }

  isNegative(): boolean {
    return this.amount < 0;
  }

  greaterThan(other: Money): boolean {
    this.ensureSameCurrency(other);
    return this.amount > other.amount;
  }

  lessThan(other: Money): boolean {
    this.ensureSameCurrency(other);
    return this.amount < other.amount;
  }

  greaterThanOrEqual(other: Money): boolean {
    return this.greaterThan(other) || this.equals(other);
  }

  lessThanOrEqual(other: Money): boolean {
    return this.lessThan(other) || this.equals(other);
  }

  toString(): string {
    return `${this.amount.toFixed(2)} ${this.currency.code}`;
  }

  toCents(): number {
    return Math.round(this.amount * 100);
  }

  private ensureSameCurrency(other: Money): void {
    if (!this.currency.equals(other.currency)) {
      throw new Error(
        `Currency mismatch: ${this.currency.code} vs ${other.currency.code}`,
      );
    }
  }
}
