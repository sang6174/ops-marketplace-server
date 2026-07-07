import {
  CreateShopInput,
  ShopResponse,
} from '@modules/shop/interfaces/dtos/shop.dto';

export interface RestoreShopInput {
  shopId: string;
  ownerId: string;
}

export interface IRestoreShopUseCase {
  execute(input: RestoreShopInput): Promise<ShopResponse>;
}
