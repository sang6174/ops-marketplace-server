import { User } from '../entities/user';
import { Shop } from '../entities/shop';

export interface IShopDomainService {
  canCreateShop(
    user: User,
    maxShops?: number,
  ): Promise<{ allowed: boolean; reason?: string }>;
  canUpdateShop(shop: Shop, userId: string): boolean;
  canDeleteShop(shop: Shop, userId: string): boolean;
  isValidShopName(name: string): boolean;
  isShopOwner(shop: Shop, userId: string): boolean;
  getRemainingShopSlots(
    user: User,
    totalShops: number,
    maxShops?: number,
  ): number;
}
