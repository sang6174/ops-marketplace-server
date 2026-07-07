import {
  CreateOrderInput,
  OrderResponse,
  AddNoteInput,
} from '@modules/order/interfaces/dtos/order.dto';

export interface ICreateOrderUseCase {
  execute(input: CreateOrderInput): Promise<OrderResponse>;
}

export interface IAddNoteToOrderUseCase {
  execute(input: AddNoteInput): Promise<OrderResponse>;
}
