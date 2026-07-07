import {
  UpdateShopInput,
  ShopResponse,
} from '@modules/shop/interfaces/dtos/shop.dto';

export interface IUpdateShopUseCase {
  execute(input: UpdateShopInput): Promise<ShopResponse>;
}