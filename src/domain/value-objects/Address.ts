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
    if (props.stateProvince.level !== 2) {
      throw new Error('stateProvince must be level 2');
    }
    if (props.district && props.district.level !== 3) {
      throw new Error('district must be level 3');
    }
    if (props.ward && props.ward.level !== 4) {
      throw new Error('ward must be level 4');
    }
    if (!props.stateProvince.country.equals(props.country)) {
      throw new Error('stateProvince must belong to the same country');
    }
    if (props.district && !props.district.country.equals(props.country)) {
      throw new Error('district must belong to the same country');
    }
    if (props.district && props.district.parentCode !== undefined && props.district.parentCode !== props.stateProvince.code) {
      throw new Error('district must belong to stateProvince (parentCode mismatch)');
    }
    if (props.ward && props.district && props.ward.parentCode !== undefined && props.ward.parentCode !== props.district.code) {
      throw new Error('ward must belong to district (parentCode mismatch)');
    }
    if (props.ward && !props.district && props.ward.parentCode !== undefined && props.ward.parentCode !== props.stateProvince.code) {
      throw new Error('ward must belong to stateProvince when district is null');
    }
    if (!props.street || props.street.trim().length === 0) {
      throw new Error('Street cannot be empty');
    }
    if (!props.postalCode || props.postalCode.trim().length === 0) {
      throw new Error('Postal code cannot be empty');
    }
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

  static reconstitute(props: {
    country: Country;
    stateProvince: AdministrativeDivision;
    district: AdministrativeDivision | null;
    ward: AdministrativeDivision | null;
    street: string;
    postalCode: string;
    detail: string | null;
  }): Address {
    return new Address(
      props.country,
      props.stateProvince,
      props.district,
      props.ward,
      props.street,
      props.postalCode,
      props.detail,
    );
  }

  static builder(): AddressBuilder {
    return new AddressBuilder();
  }

  withStreet(street: string): Address {
    return new Address(
      this.country,
      this.stateProvince,
      this.district,
      this.ward,
      street,
      this.postalCode,
      this.detail,
    );
  }

  withPostalCode(postalCode: string): Address {
    return new Address(
      this.country,
      this.stateProvince,
      this.district,
      this.ward,
      this.street,
      postalCode,
      this.detail,
    );
  }

  withDistrict(district: AdministrativeDivision | null): Address {
    return new Address(
      this.country,
      this.stateProvince,
      district,
      this.ward,
      this.street,
      this.postalCode,
      this.detail,
    );
  }

  withWard(ward: AdministrativeDivision | null): Address {
    return new Address(
      this.country,
      this.stateProvince,
      this.district,
      ward,
      this.street,
      this.postalCode,
      this.detail,
    );
  }

  withDetail(detail: string | null): Address {
    return new Address(
      this.country,
      this.stateProvince,
      this.district,
      this.ward,
      this.street,
      this.postalCode,
      detail,
    );
  }

  get fullAddress(): string {
    return this.toString();
  }

  equals(other: Address): boolean {
    if (!(other instanceof Address)) return false;
    return (
      this.country.equals(other.country) &&
      this.stateProvince.equals(other.stateProvince) &&
      ((this.district === null && other.district === null) ||
        (this.district !== null &&
          other.district !== null &&
          this.district.equals(other.district))) &&
      ((this.ward === null && other.ward === null) ||
        (this.ward !== null &&
          other.ward !== null &&
          this.ward.equals(other.ward))) &&
      this.street === other.street &&
      this.postalCode === other.postalCode &&
      ((this.detail === null && other.detail === null) ||
        (this.detail !== null &&
          other.detail !== null &&
          this.detail === other.detail))
    );
  }

  toString(): string {
    const parts = [this.street];
    if (this.ward) parts.push(this.ward.name);
    if (this.district) parts.push(this.district.name);
    parts.push(this.stateProvince.name);
    parts.push(this.country.name);
    parts.push(this.postalCode);
    return parts.join(', ');
  }
}

export class AddressBuilder {
  private country: Country | null = null;
  private stateProvince: AdministrativeDivision | null = null;
  private district: AdministrativeDivision | null = null;
  private ward: AdministrativeDivision | null = null;
  private street: string | null = null;
  private postalCode: string | null = null;
  private detail: string | null = null;

  setCountry(country: Country): this {
    this.country = country;
    return this;
  }

  setStateProvince(stateProvince: AdministrativeDivision): this {
    this.stateProvince = stateProvince;
    return this;
  }

  setDistrict(district: AdministrativeDivision | null): this {
    this.district = district;
    return this;
  }

  setWard(ward: AdministrativeDivision | null): this {
    this.ward = ward;
    return this;
  }

  setStreet(street: string): this {
    this.street = street;
    return this;
  }

  setPostalCode(postalCode: string): this {
    this.postalCode = postalCode;
    return this;
  }

  setDetail(detail: string | null): this {
    this.detail = detail;
    return this;
  }

  build(): Address {
    if (!this.country) throw new Error('Country is required');
    if (!this.stateProvince) throw new Error('State/Province is required');
    if (!this.street) throw new Error('Street is required');
    if (!this.postalCode) throw new Error('Postal code is required');
    return Address.create({
      country: this.country,
      stateProvince: this.stateProvince,
      district: this.district,
      ward: this.ward,
      street: this.street,
      postalCode: this.postalCode,
      detail: this.detail,
    });
  }
}
