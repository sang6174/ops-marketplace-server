import {
  CreateShopInput,
  ShopResponse,
} from '@modules/shop/interfaces/dtos/shop.dto';

export interface ICreateShopUseCase {
  execute(input: CreateShopInput): Promise<ShopResponse>;
}
