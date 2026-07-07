import { InventoryResponse } from '@modules/inventory/interfaces/dtos/inventory.dto';

export interface BulkRestockInput {
  items: { productId: string; quantity: number }[];
}

export interface IBulkRestockInventoryUseCase {
  execute(input: BulkRestockInput): Promise<InventoryResponse[]>;
}
