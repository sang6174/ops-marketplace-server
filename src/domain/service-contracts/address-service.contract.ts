import {
  Address,
  AdministrativeDivision,
  Country,
} from '@domain/entities/value-objects/address';

export interface IAddressValidationService {
  validate(address: Address): boolean;
  validateHierarchy(
    province: AdministrativeDivision,
    district?: AdministrativeDivision,
    ward?: AdministrativeDivision,
  ): boolean;
  isComplete(address: Address): boolean;
}

export interface AddressInput {
  countryCode: string;
  provinceCode: string;
  districtCode?: string;
  wardCode?: string;
  street: string;
  postalCode: string;
  detail?: string;
}

export interface ICreateAddress {
  execute(input: AddressInput): Address;
}

export interface IValidateAddress {
  execute(address: Address): boolean;
}

export interface IGetAllCountry {
  execute(): Country[];
}

export interface IGetAdministrativeDivision {
  execute(parentCode: string): AdministrativeDivision;
}
