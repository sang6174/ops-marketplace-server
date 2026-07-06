// domain/use-case-contracts/inventory.use-cases.ts
import { Inventory } from '@domain/entities/inventory';

export interface RestockInventoryInput {
  productId: string;
  quantity: number;
}

export interface OutboundInventoryInput {
  productId: string;
  quantity: number;
}

export interface ReserveInventoryInput {
  productId: string;
  quantity: number;
}

export interface UnreserveInventoryInput {
  productId: string;
  quantity: number;
}

export interface UpdateMinStockThresholdInput {
  productId: string;
  minStockThreshold: number;
}

export interface GetLowStockInventoriesInput {
  thresholdPercent?: number;
}

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
  execute(input: ReserveInventoryInput): Promise<Inventory>;
}

export interface IUnreserveInventoryUseCase {
  execute(input: UnreserveInventoryInput): Promise<Inventory>;
}

export interface IUpdateMinStockThresholdUseCase {
  execute(input: UpdateMinStockThresholdInput): Promise<Inventory>;
}

export interface IGetLowStockInventoriesUseCase {
  execute(input?: GetLowStockInventoriesInput): Promise<Inventory[]>;
}

export interface IDeleteInventoryUseCase {
  execute(id: string): Promise<void>;
}
