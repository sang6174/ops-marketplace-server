import {
  MergeCartInput,
  CartResponse,
} from '@modules/cart/interfaces/dtos/cart.dto';

export interface IMergeCartUseCase {
  execute(input: MergeCartInput): Promise<CartResponse>;
}
