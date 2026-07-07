import {
  CreateAddressInput,
  AddressResponse,
} from '../../interfaces/dtos/address.dto';

export interface ICreateAddressUseCase {
  execute(input: CreateAddressInput): Promise<AddressResponse>;
}
