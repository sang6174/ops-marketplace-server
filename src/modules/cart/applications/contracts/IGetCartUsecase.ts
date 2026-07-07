import {
  AddItemToCartInput,
  CartResponse,
} from '@modules/cart/interfaces/dtos/cart.dto';

export interface IAddItemToCartUseCase {
  execute(input: AddItemToCartInput): Promise<CartResponse>;
}
