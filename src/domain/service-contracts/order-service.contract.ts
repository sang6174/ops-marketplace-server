// domain/use-case-contracts/order.use-cases.ts
import { Order } from '@domain/entities/order';
import { Address } from '@domain/entities/address';
import {
  OrderStatus,
  OrderType,
  PaymentStatus,
} from '@domain/entities/enums.enum';

export interface CreateOrderInput {
  buyerId: string;
  sellerId: string;
  orderType: OrderType;
  subtotal: number;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    wholesalePrice?: number;
  }>;
  shippingAddress: Address;
  paymentMethod: string;
  shippingFee?: number;
  notes?: string;
}

export interface UpdateOrderStatusInput {
  orderId: string;
  newStatus: OrderStatus;
}

export interface UpdatePaymentStatusInput {
  orderId: string;
  newStatus: PaymentStatus;
}

export interface SetPaymentIntentInput {
  orderId: string;
  paymentIntentId: string;
}

export interface CancelOrderInput {
  orderId: string;
  reason?: string;
}

export interface UpdateShippingAddressInput {
  orderId: string;
  newAddress: Address;
}

export interface AddNoteInput {
  orderId: string;
  note: string;
}

export interface UpdateShippingFeeInput {
  orderId: string;
  newFee: number;
}

export interface GetOrdersByBuyerInput {
  buyerId: string;
  status?: OrderStatus;
}

export interface GetOrdersBySellerInput {
  sellerId: string;
  status?: OrderStatus;
}

export interface GetOrdersByDateRangeInput {
  startDate: Date;
  endDate: Date;
  sellerId?: string;
  buyerId?: string;
}

export interface ICreateOrderUseCase {
  execute(input: CreateOrderInput): Promise<Order>;
}

export interface IUpdateOrderStatusUseCase {
  execute(input: UpdateOrderStatusInput): Promise<Order>;
}

export interface IUpdatePaymentStatusUseCase {
  execute(input: UpdatePaymentStatusInput): Promise<Order>;
}

export interface ISetPaymentIntentUseCase {
  execute(input: SetPaymentIntentInput): Promise<Order>;
}

export interface ICancelOrderUseCase {
  execute(input: CancelOrderInput): Promise<Order>;
}

export interface IGetOrderByIdUseCase {
  execute(id: string): Promise<Order | null>;
}

export interface IGetOrdersByBuyerUseCase {
  execute(input: GetOrdersByBuyerInput): Promise<Order[]>;
}

export interface IGetOrdersBySellerUseCase {
  execute(input: GetOrdersBySellerInput): Promise<Order[]>;
}

export interface IGetOrdersByDateRangeUseCase {
  execute(input: GetOrdersByDateRangeInput): Promise<Order[]>;
}

export interface IUpdateShippingAddressUseCase {
  execute(input: UpdateShippingAddressInput): Promise<Order>;
}

export interface IAddNoteToOrderUseCase {
  execute(input: AddNoteInput): Promise<Order>;
}

export interface IUpdateShippingFeeUseCase {
  execute(input: UpdateShippingFeeInput): Promise<Order>;
}

export interface IMarkOrderAsPaidUseCase {
  execute(orderId: string): Promise<Order>;
}

export interface IShipOrderUseCase {
  execute(orderId: string): Promise<Order>;
}

export interface IDeliverOrderUseCase {
  execute(orderId: string): Promise<Order>;
}

export interface IDeleteOrderUseCase {
  execute(id: string): Promise<void>;
}
