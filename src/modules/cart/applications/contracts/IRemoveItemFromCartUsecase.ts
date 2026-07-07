import {
  RemoveCartItemInput,
  CartResponse,
} from '@modules/cart/interfaces/dtos/cart.dto';

export interface IRemoveCartItemUseCase {
  execute(input: RemoveCartItemInput): Promise<CartResponse>;
}
