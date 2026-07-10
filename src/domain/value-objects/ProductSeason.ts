// domain/value-objects/Season.ts
export class ProductSeason {
  private constructor(
    private readonly _start: Date,
    private readonly _end: Date,
  ) {
    if (this._start >= this._end)
      throw new Error('Season start must be before end');
  }

  static create(start: Date, end: Date): ProductSeason {
    return new ProductSeason(start, end);
  }

  get start(): Date {
    return this._start;
  }

  get end(): Date {
    return this._end;
  }

  isInSeason(date: Date = new Date()): boolean {
    return date >= this._start && date <= this._end;
  }

  equals(other: ProductSeason): boolean {
    return (
      other instanceof ProductSeason &&
      this._start === other._start &&
      this._end === other._end
    );
  }
}
