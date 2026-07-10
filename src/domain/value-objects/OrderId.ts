export class OrderId {
  private constructor(public readonly value: string) {}
  static create(value: string): OrderId {
    if (!value || value.trim().length === 0)
      throw new Error('OrderId cannot be empty');
    return new OrderId(value);
  }
  equals(other: OrderId): boolean {
    return other instanceof OrderId && this.value === other.value;
  }
}
