import {
  GetOrderByIdInput,
  GetOrdersInput,
  OrderResponse,
  OrderListResponse,
} from '@modules/order/interfaces/dtos/order.dto';

export interface IGetOrderByIdUseCase {
  execute(input: GetOrderByIdInput): Promise<OrderResponse>;
}

export interface IGetOrdersUseCase {
  execute(input: GetOrdersInput): Promise<OrderListResponse>;
}
