// domain/value-objects/WholesaleInfo.ts
import { ProductPrice } from './ProductPrice';

export class WholesaleInfo {
  private constructor(
    private readonly _wholesalePrice: ProductPrice,
    private readonly _minQuantity: number,
  ) {
    if (this._minQuantity <= 0)
      throw new Error('Minimum wholesale quantity must be > 0');
  }

  static create(
    wholesalePrice: ProductPrice,
    minQuantity: number,
  ): WholesaleInfo {
    return new WholesaleInfo(wholesalePrice, minQuantity);
  }

  get wholesalePrice(): ProductPrice {
    return this._wholesalePrice;
  }

  get minQuantity(): number {
    return this._minQuantity;
  }

  equals(other: WholesaleInfo): boolean {
    return (
      other instanceof WholesaleInfo &&
      this._wholesalePrice.equals(other._wholesalePrice) &&
      this._minQuantity === other._minQuantity
    );
  }
}
