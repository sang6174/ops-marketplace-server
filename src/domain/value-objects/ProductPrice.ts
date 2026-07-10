export class ProductPrice {
  private constructor(private readonly _amount: number) {
    if (this._amount <= 0) throw new Error('Price must be greater than 0');
  }

  static fromNumber(amount: number): ProductPrice {
    return new ProductPrice(amount);
  }

  get amount(): number {
    return this._amount;
  }

  equals(other: ProductPrice): boolean {
    return other instanceof ProductPrice && this._amount === other._amount;
  }
}
