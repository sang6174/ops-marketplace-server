import { User } from '@/domain/entities/user';
import {
  UpdateBuyerProfileInput,
  UpdateProfileInput,
  UpdateSellerProfileInput,
  UpdateShipperProfileInput,
} from '@modules/user/interfaces/dto/user.dto';

export interface IUpdateProfileUseCase {
  execute(input: UpdateProfileInput): Promise<User>;
}

export interface IUpdateSellerProfileUseCase {
  execute(input: UpdateSellerProfileInput): Promise<User>;
}

export interface IUpdateBuyerProfileUseCase {
  execute(input: UpdateBuyerProfileInput): Promise<User>;
}

export interface IUpdateShipperProfileUseCase {
  execute(input: UpdateShipperProfileInput): Promise<User>;
}
