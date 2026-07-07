import {
  UpdateCartItemInput,
  CartResponse,
} from '@modules/cart/interfaces/dtos/cart.dto';

export interface IUpdateCartItemUseCase {
  execute(input: UpdateCartItemInput): Promise<CartResponse>;
}
