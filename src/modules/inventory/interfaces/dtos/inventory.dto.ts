export interface CreateInventoryInput {
  productId: string;
  quantity: number;
  minThreshold?: number;
}

export interface InventoryResponse {
  id: string;
  productId: string;
  quantity: number;
  reserved: number;
  minThreshold: number;
  lastRestockedAt: Date | null;
  updatedAt: Date;
  createdAt: Date;
}

export interface RestockInventoryInput {
  productId: string;
  quantity: number;
}

export interface OutboundInventoryInput {
  productId: string;
  quantity: number;
}

export interface ReserveStockInput {
  productId: string;
  quantity: number;
}

export interface UnreserveStockInput {
  productId: string;
  quantity: number;
}

export interface UpdateMinStockThresholdInput {
  productId: string;
  minThreshold: number;
}

export interface GetLowStockInput {
  thresholdPercent?: number;
  limit?: number;
}

export interface CheckAvailabilityInput {
  productId: string;
  quantity: number;
}

export interface InventoryAvailabilityResponse {
  available: boolean;
  currentStock: number;
  reserved: number;
}
