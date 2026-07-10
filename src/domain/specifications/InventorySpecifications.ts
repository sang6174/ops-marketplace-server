// domain/specifications/InventorySpecifications.ts
import { Inventory } from '../entities/products/inventory';

export interface InventorySpecification {
  isSatisfiedBy(inventory: Inventory): boolean;
}

export class LowStockSpecification implements InventorySpecification {
  constructor(private readonly thresholdPercent: number = 100) {
    if (thresholdPercent <= 0 || thresholdPercent > 100) {
      throw new Error('Threshold percent must be between 1 and 100');
    }
  }

  isSatisfiedBy(inventory: Inventory): boolean {
    const available = inventory.getAvailableQuantity();
    const min = inventory.minStockThreshold.value;
    return available < (min * this.thresholdPercent) / 100;
  }
}

export class AndSpecification implements InventorySpecification {
  constructor(private readonly specs: InventorySpecification[]) {}

  isSatisfiedBy(inventory: Inventory): boolean {
    return this.specs.every((spec) => spec.isSatisfiedBy(inventory));
  }
}
