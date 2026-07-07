// src/modules/order/application/dtos/order.dto.ts
import {
  OrderStatus,
  OrderType,
  PaymentStatus,
} from '@domain/entities/enums.enum';
import { Address } from '@/domain/value-objects/address';

export interface CreateOrderInput {
  buyerId: string;
  sellerId: string;
  orderType: OrderType;
  items: CreateOrderItemInput[];
  shippingAddress: Address;
  paymentMethod: string;
  notes?: string;
}

export interface CreateOrderItemInput {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  wholesalePrice?: number;
}

export interface UpdateOrderStatusInput {
  orderId: string;
  status: OrderStatus;
  userId: string; // để kiểm tra quyền
}

export interface CancelOrderInput {
  orderId: string;
  userId: string;
  reason?: string;
}

export interface UpdateShippingAddressInput {
  orderId: string;
  userId: string;
  newAddress: Address;
}

export interface AddNoteInput {
  orderId: string;
  userId: string;
  note: string;
}

export interface GetOrdersInput {
  userId: string;
  status?: OrderStatus;
  orderType?: OrderType;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

export interface GetOrderByIdInput {
  orderId: string;
  userId: string;
}

export interface OrderItemResponse {
  productId: string;
  productName: string;
  quantity: number;
  retailPrice: number;
  wholesalePrice?: number;
  totalPrice: number;
  effectivePrice: number;
}

export interface OrderResponse {
  id: string;
  buyerId: string;
  sellerId: string;
  orderType: OrderType;
  items: OrderItemResponse[];
  subtotal: number;
  shippingFee: number;
  grandTotal: number;
  shippingAddress: Address;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  paymentIntentId?: string;
  shippedAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderListResponse {
  items: OrderResponse[];
  total: number;
  limit: number;
  offset: number;
}
