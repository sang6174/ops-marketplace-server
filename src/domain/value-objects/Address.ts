import { Country } from './Country';
import { AdministrativeDivision } from './AdministrativeDivision';

export { Country, AdministrativeDivision };

export class Address {
  private constructor(
    public readonly country: Country,
    public readonly stateProvince: AdministrativeDivision,
    public readonly district: AdministrativeDivision | null,
    public readonly ward: AdministrativeDivision | null,
    public readonly street: string,
    public readonly postalCode: string,
    public readonly detail: string | null,
  ) {}

  static create(props: {
    country: Country;
    stateProvince: AdministrativeDivision;
    district?: AdministrativeDivision | null;
    ward?: AdministrativeDivision | null;
    street: string;
    postalCode: string;
    detail?: string | null;
  }): Address {
    return new Address(
      props.country,
      props.stateProvince,
      props.district ?? null,
      props.ward ?? null,
      props.street,
      props.postalCode,
      props.detail ?? null,
    );
  }
}
