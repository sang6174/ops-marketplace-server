import { Inventory } from '@domain/entities/inventory';
import { IBaseRepository } from './base-repository.interface';

export interface IInventoryRepository extends IBaseRepository<Inventory> {
  findByProductId(productId: string): Promise<Inventory | null>;
  findLowStock(thresholdPercent?: number): Promise<Inventory[]>;
}
