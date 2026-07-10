export class InventoryId {
  private constructor(public readonly value: string) {}

  static create(value: string): InventoryId {
    if (!value || value.trim().length === 0)
      throw new Error('InventoryId cannot be empty');
    return new InventoryId(value);
  }

  static generate(): InventoryId {
    return new InventoryId(crypto.randomUUID());
  }

  equals(other: InventoryId): boolean {
    return other instanceof InventoryId && this.value === other.value;
  }
}
