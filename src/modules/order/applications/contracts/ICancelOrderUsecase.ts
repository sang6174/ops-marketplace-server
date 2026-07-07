import {
  CancelOrderInput,
  OrderResponse,
} from '@modules/order/interfaces/dtos/order.dto';

export interface ICancelOrderUseCase {
  execute(input: CancelOrderInput): Promise<OrderResponse>;
}
