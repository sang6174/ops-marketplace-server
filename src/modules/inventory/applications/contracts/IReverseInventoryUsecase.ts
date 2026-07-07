import {
  ReserveStockInput,
  UnreserveStockInput,
  InventoryResponse,
} from '@modules/inventory/interfaces/dtos/inventory.dto';

export interface IReserveStockUseCase {
  execute(input: ReserveStockInput): Promise<InventoryResponse>;
}

export interface IUnreserveStockUseCase {
  execute(input: UnreserveStockInput): Promise<InventoryResponse>;
}
