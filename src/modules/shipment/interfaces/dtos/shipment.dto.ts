import { ShipmentStatus } from '@domain/entities/enums.enum';

export interface CreateShipmentInput {
  orderId: string;
  shopId: string;
  pickupAddress: string;
  deliveryAddress: string;
  estimatedDeliveryAt?: Date;
}

export interface AssignShipperInput {
  shipmentId: string;
  shipperId: string;
  trackingNumber?: string;
}

export interface UpdateTrackingInput {
  shipmentId: string;
  trackingNumber: string;
}

export interface CancelShipmentInput {
  shipmentId: string;
  userId: string;
  reason?: string;
}

export interface GetShipmentsInput {
  shopId?: string;
  shipperId?: string;
  status?: ShipmentStatus;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

export interface ShipmentResponse {
  id: string;
  orderId: string;
  shopId: string;
  shipperId: string | null;
  status: ShipmentStatus;
  trackingNumber: string | null;
  pickupAddress: string;
  deliveryAddress: string;
  estimatedDeliveryAt: Date | null;
  deliveredAt: Date | null;
  failedAt: Date | null;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShipmentListResponse {
  items: ShipmentResponse[];
  total: number;
  limit: number;
  offset: number;
}
