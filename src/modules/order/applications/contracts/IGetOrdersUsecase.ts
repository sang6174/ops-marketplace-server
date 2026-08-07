import {
  GetOrderByIdInput,
  GetOrdersInput,
  OrderResponse,
  OrderListResponse,
} from '@modules/order/interfaces/dtos/order.dto';
import { OrderStatus } from '@domain/entities/enums.enum';

export interface IGetOrderByIdUseCase {
  execute(input: GetOrderByIdInput): Promise<OrderResponse>;
}

export interface IGetOrdersUseCase {
  execute(input: GetOrdersInput): Promise<OrderListResponse>;
}

export interface GetOrdersByBuyerIdInput {
  buyerId: string;
  status?: OrderStatus;
  limit?: number;
  offset?: number;
}

export interface IGetOrdersByBuyerIdUseCase {
  execute(input: GetOrdersByBuyerIdInput): Promise<OrderListResponse>;
}

export interface GetOrdersBySellerIdInput {
  sellerId: string;
  status?: OrderStatus;
  limit?: number;
  offset?: number;
}

export interface IGetOrdersBySellerIdUseCase {
  execute(input: GetOrdersBySellerIdInput): Promise<OrderListResponse>;
}

export interface GetOrdersByShopIdInput {
  shopId: string;
  status?: OrderStatus;
  limit?: number;
  offset?: number;
}

export interface IGetOrdersByShopIdUseCase {
  execute(input: GetOrdersByShopIdInput): Promise<OrderListResponse>;
}

export interface GetOrdersByStatusInput {
  status: OrderStatus;
  limit?: number;
  offset?: number;
}

export interface IGetOrdersByStatusUseCase {
  execute(input: GetOrdersByStatusInput): Promise<OrderListResponse>;
}
