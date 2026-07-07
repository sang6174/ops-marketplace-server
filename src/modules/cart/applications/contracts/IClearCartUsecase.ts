import { CartResponse } from '@modules/cart/interfaces/dtos/cart.dto';

export interface ClearCartInput {
  userId?: string;
  sessionId?: string;
}

export interface IClearCartUseCase {
  execute(input: ClearCartInput): Promise<CartResponse>;
}
