import { User } from '@/domain/entities/identities/User';
import {
  CreateAdminInput,
  CreateBuyerInput,
  CreateSellerInput,
  CreateShipperInput,
} from '@modules/user/interfaces/dto/user.dto';
export interface ICreateSellerUseCase {
  execute(input: CreateSellerInput): Promise<User>;
}

export interface ICreateBuyerUseCase {
  execute(input: CreateBuyerInput): Promise<User>;
}

export interface ICreateAdminUseCase {
  execute(input: CreateAdminInput): Promise<User>;
}

export interface ICreateShipperUseCase {
  execute(input: CreateShipperInput): Promise<User>;
}
