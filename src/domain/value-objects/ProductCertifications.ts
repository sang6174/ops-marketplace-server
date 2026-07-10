import { ProductCertification } from './ProductCertification';

export class ProductCertifications {
  private constructor(private readonly _items: ProductCertification[]) {}

  static create(items: ProductCertification[]): ProductCertifications {
    const unique = items.filter(
      (cert, index, self) => self.findIndex((c) => c.equals(cert)) === index,
    );
    return new ProductCertifications(unique);
  }

  get items(): ProductCertification[] {
    return [...this._items];
  }

  add(cert: ProductCertification): ProductCertifications {
    if (this._items.some((c) => c.equals(cert))) return this;
    return new ProductCertifications([...this._items, cert]);
  }

  remove(cert: ProductCertification): ProductCertifications {
    return new ProductCertifications(
      this._items.filter((c) => !c.equals(cert)),
    );
  }

  equals(other: ProductCertifications): boolean {
    return (
      other instanceof ProductCertifications &&
      this._items.length === other._items.length &&
      this._items.every((c, i) => c.equals(other._items[i]))
    );
  }
}
