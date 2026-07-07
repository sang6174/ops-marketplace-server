import { AddressResponse } from '../../interfaces/dtos/address.dto';

export interface IGetAddressesUseCase {
  execute(userId: string): Promise<AddressResponse[]>;
}

export interface IGetAddressByIdUseCase {
  execute(addressId: string, userId: string): Promise<AddressResponse>;
}
