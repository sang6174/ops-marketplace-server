import {
  ShopResponse,
  GetShopsByOwnerInput,
  GetShopsInput,
} from '@modules/shop/interfaces/dtos/shop.dto';

export interface IGetShopByIdUseCase {
  execute(shopId: string): Promise<ShopResponse>;
}

export interface IGetShopsByOwnerUseCase {
  execute(input: GetShopsByOwnerInput): Promise<ShopResponse[]>;
}

export interface IGetShopsUseCase {
  execute(input: GetShopsInput): Promise<ShopResponse[]>;
}
