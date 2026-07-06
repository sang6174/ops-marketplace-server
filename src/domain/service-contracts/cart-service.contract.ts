// domain/use-case-contracts/cart.use-cases.ts
import { Cart } from '@domain/entities/cart';

export interface AddItemToCartInput {
  userId?: string;
  sessionId?: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  wholesalePrice?: number;
}

export interface UpdateCartItemInput {
  userId?: string;
  sessionId?: string;
  productId: string;
  quantity: number;
}

export interface RemoveItemFromCartInput {
  userId?: string;
  sessionId?: string;
  productId: string;
}

export interface ClearCartInput {
  userId?: string;
  sessionId?: string;
}

export interface MergeGuestCartInput {
  userId: string;
  sessionId: string;
}

export interface GetCartInput {
  userId?: string;
  sessionId?: string;
}

export interface IGetCartUseCase {
  execute(input: GetCartInput): Promise<Cart>;
}

export interface IAddItemToCartUseCase {
  execute(input: AddItemToCartInput): Promise<Cart>;
}

export interface IUpdateCartItemUseCase {
  execute(input: UpdateCartItemInput): Promise<Cart>;
}

export interface IRemoveItemFromCartUseCase {
  execute(input: RemoveItemFromCartInput): Promise<Cart>;
}

export interface IClearCartUseCase {
  execute(input: ClearCartInput): Promise<void>;
}

export interface IMergeGuestCartUseCase {
  execute(input: MergeGuestCartInput): Promise<Cart>;
}

export interface IDeleteCartUseCase {
  execute(cartId: string, hardDelete?: boolean): Promise<void>;
}
