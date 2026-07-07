import {
  GetLowStockInput,
  InventoryResponse,
} from '@modules/inventory/interfaces/dtos/inventory.dto';

export interface IGetInventoryByProductIdUseCase {
  execute(productId: string): Promise<InventoryResponse>;
}

export interface IGetInventoryByIdUseCase {
  execute(inventoryId: string): Promise<InventoryResponse>;
}

export interface IGetLowStockInventoryUseCase {
  execute(input: GetLowStockInput): Promise<InventoryResponse[]>;
}
