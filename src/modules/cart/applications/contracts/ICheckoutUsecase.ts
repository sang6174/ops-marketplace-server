import { OrderResponse } from '@modules/order/interfaces/dtos/order.dto';

export interface CheckoutInput {
  userId: string;
  cartId: string;
  shippingAddressId: string;
  paymentMethod: string;
}

export interface ICheckoutUseCase {
  execute(input: CheckoutInput): Promise<OrderResponse>;
}
