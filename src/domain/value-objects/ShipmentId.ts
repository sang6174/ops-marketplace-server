export class ShipmentId {
  private constructor(public readonly value: string) {}

  static create(value: string): ShipmentId {
    if (!value || value.trim().length === 0)
      throw new Error('ShipmentId cannot be empty');
    return new ShipmentId(value);
  }

  static generate(): ShipmentId {
    return new ShipmentId(crypto.randomUUID());
  }

  equals(other: ShipmentId): boolean {
    return other instanceof ShipmentId && this.value === other.value;
  }
}
