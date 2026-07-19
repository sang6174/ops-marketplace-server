import { Inventory } from '../entities/products/Inventory';
import {
  RestockInventoryInput,
  OutboundInventoryInput,
  UpdateMinStockThresholdInput,
  GetLowStockInput,
  ReserveStockInput,
  UnreserveStockInput,
} from '@/modules/inventory/interfaces/dtos/inventory.dto';
export interface IGetInventoryByProductUseCase {
  execute(productId: string): Promise<Inventory | null>;
}

export interface IGetInventoryByIdUseCase {
  execute(id: string): Promise<Inventory | null>;
}

export interface IRestockInventoryUseCase {
  execute(input: RestockInventoryInput): Promise<Inventory>;
}

export interface IOutboundInventoryUseCase {
  execute(input: OutboundInventoryInput): Promise<Inventory>;
}

export interface IReserveInventoryUseCase {
  execute(input: ReserveStockInput): Promise<Inventory>;
}

export interface IUnreserveInventoryUseCase {
  execute(input: UnreserveStockInput): Promise<Inventory>;
}

export interface IUpdateMinStockThresholdUseCase {
  execute(input: UpdateMinStockThresholdInput): Promise<Inventory>;
}

export interface IGetLowStockInventoriesUseCase {
  execute(input?: GetLowStockInput): Promise<Inventory[]>;
}

export interface IDeleteInventoryUseCase {
  execute(id: string): Promise<void>;
}
