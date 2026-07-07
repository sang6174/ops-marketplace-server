import {
  AdministrativeDivision,
  Country,
  Address,
} from '@domain/entities/value-objects/address';
import { IBaseRepository } from './base-repository.interface';

export interface ICountryRepository extends IBaseRepository<Country> {
  getAll(): Country[];
}

export interface IAdministrativeDivisionRepository extends IBaseRepository<AdministrativeDivision> {
  getByCountryAndLevel(
    countryCode: string,
    level: number,
  ): AdministrativeDivision[] | null;
}

export interface IAddressRepository extends IBaseRepository<Address> {
  findByUserId(userId: string): Promise<Address[]>;
  findDefaultByUserId(userId: string): Promise<Address | null>;
  setDefault(addressId: string, userId: string): Promise<void>;
}
