export class OrderItemId {
  private constructor(public readonly value: string) {}

  static create(value: string): OrderItemId {
    if (!value || value.trim().length === 0)
      throw new Error('OrderItemId cannot be empty');
    return new OrderItemId(value);
  }

  static generate(): OrderItemId {
    return new OrderItemId(crypto.randomUUID());
  }

  equals(other: OrderItemId): boolean {
    return other instanceof OrderItemId && this.value === other.value;
  }
}
