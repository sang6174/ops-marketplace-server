import {
  GetCartInput,
  CartResponse,
} from '@modules/cart/interfaces/dtos/cart.dto';

export interface IGetCartUseCase {
  execute(input: GetCartInput): Promise<CartResponse>;
}
