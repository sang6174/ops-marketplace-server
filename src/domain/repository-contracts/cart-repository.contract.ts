// domain/repository-contracts/cart-repository.interface.ts
import { Cart } from '@domain/entities/cart';
import { IBaseRepository } from './base-repository.interface';

export interface ICartRepository extends IBaseRepository<Cart> {
  findByUserId(userId: string): Promise<Cart | null>;
  findBySessionId(sessionId: string): Promise<Cart | null>;
  deleteByUserId(userId: string): Promise<void>;
  deleteBySessionId(sessionId: string): Promise<void>;
}
