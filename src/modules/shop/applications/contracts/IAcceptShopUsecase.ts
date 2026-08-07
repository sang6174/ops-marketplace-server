import {
  ShopResponse,
} from '@modules/shop/interfaces/dtos/shop.dto';

export interface IAcceptShopUseCase {
  execute(shopId: string): Promise<ShopResponse>;
}
