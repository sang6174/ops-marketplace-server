import {
  UpdateAddressInput,
  AddressResponse,
} from '../../interfaces/dtos/address.dto';

export interface IUpdateAddressUseCase {
  execute(input: UpdateAddressInput): Promise<AddressResponse>;
}
