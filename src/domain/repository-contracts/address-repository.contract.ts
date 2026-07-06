import { AdministrativeDivision, Country } from '@domain/entities/address';

export interface ICountryRepository {
  getAll(): Country[];
}

export interface IAdministrativeDivisionRepository {
  getByCountryAndLevel(
    countryCode: string,
    level: number,
  ): AdministrativeDivision[] | null;
}
