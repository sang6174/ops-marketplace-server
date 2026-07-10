import { Country } from './Country';
import { AdministrativeDivision } from './AdministrativeDivision';

export class Address {
  private constructor(
    public readonly country: Country,
    public readonly stateProvince: AdministrativeDivision,
    public readonly district: AdministrativeDivision | null,
    public readonly ward: AdministrativeDivision | null,
    public readonly street: string,
    public readonly postalCode: string,
    public readonly detail?: string,
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.country) throw new Error('Country is required');
    if (!this.stateProvince) throw new Error('State/Province is required');
    if (this.stateProvince.level !== 2) {
      throw new Error('stateProvince must be level 2');
    }
    if (this.district && this.district.level !== 3) {
      throw new Error('district must be level 3');
    }
    if (this.ward && this.ward.level !== 4) {
      throw new Error('ward must be level 4');
    }
    if (!this.stateProvince.country.equals(this.country)) {
      throw new Error('stateProvince must belong to the same country');
    }
    if (this.district && !this.district.country.equals(this.country)) {
      throw new Error('district must belong to the same country');
    }
    if (this.ward && !this.ward.country.equals(this.country)) {
      throw new Error('ward must belong to the same country');
    }
    if (this.district && this.district.parentCode !== undefined) {
      if (this.district.parentCode !== this.stateProvince.code) {
        throw new Error(
          'district must belong to stateProvince (parentCode mismatch)',
        );
      }
    }
    if (this.ward && this.ward.parentCode !== undefined) {
      if (this.district && this.ward.parentCode !== this.district.code) {
        throw new Error('ward must belong to district (parentCode mismatch)');
      }
      if (!this.district && this.ward.parentCode !== this.stateProvince.code) {
        throw new Error(
          'ward must belong to stateProvince when district is null',
        );
      }
    }
    if (!this.street || this.street.trim().length === 0) {
      throw new Error('Street cannot be empty');
    }
    if (!this.postalCode || this.postalCode.trim().length === 0) {
      throw new Error('Postal code cannot be empty');
    }
  }

  static create(props: {
    country: Country;
    stateProvince: AdministrativeDivision;
    district?: AdministrativeDivision | null;
    ward?: AdministrativeDivision | null;
    street: string;
    postalCode: string;
    detail?: string;
  }): Address {
    return new Address(
      props.country,
      props.stateProvince,
      props.district ?? null,
      props.ward ?? null,
      props.street,
      props.postalCode,
      props.detail,
    );
  }

  static reconstitute(props: {
    country: Country;
    stateProvince: AdministrativeDivision;
    district: AdministrativeDivision | null;
    ward: AdministrativeDivision | null;
    street: string;
    postalCode: string;
    detail?: string;
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

  withStreet(newStreet: string): Address {
    return new Address(
      this.country,
      this.stateProvince,
      this.district,
      this.ward,
      newStreet,
      this.postalCode,
      this.detail,
    );
  }

  withPostalCode(newPostalCode: string): Address {
    return new Address(
      this.country,
      this.stateProvince,
      this.district,
      this.ward,
      this.street,
      newPostalCode,
      this.detail,
    );
  }

  withDistrict(newDistrict: AdministrativeDivision | null): Address {
    return new Address(
      this.country,
      this.stateProvince,
      newDistrict,
      this.ward,
      this.street,
      this.postalCode,
      this.detail,
    );
  }

  withWard(newWard: AdministrativeDivision | null): Address {
    return new Address(
      this.country,
      this.stateProvince,
      this.district,
      newWard,
      this.street,
      this.postalCode,
      this.detail,
    );
  }

  withDetail(newDetail: string): Address {
    return new Address(
      this.country,
      this.stateProvince,
      this.district,
      this.ward,
      this.street,
      this.postalCode,
      newDetail,
    );
  }

  equals(other: Address): boolean {
    if (!(other instanceof Address)) return false;
    return (
      this.country.equals(other.country) &&
      this.stateProvince.equals(other.stateProvince) &&
      (this.district === null
        ? other.district === null
        : this.district.equals(other.district!)) &&
      (this.ward === null
        ? other.ward === null
        : this.ward.equals(other.ward!)) &&
      this.street === other.street &&
      this.postalCode === other.postalCode &&
      this.detail === other.detail
    );
  }

  toString(): string {
    const parts = [
      this.street,
      this.ward ? this.ward.name : '',
      this.district ? this.district.name : '',
      this.stateProvince.name,
      this.country.name,
      this.postalCode,
    ].filter((p) => p && p.trim().length > 0);
    return parts.join(', ');
  }

  get fullAddress(): string {
    return this.toString();
  }
}

class AddressBuilder {
  private country?: Country;
  private stateProvince?: AdministrativeDivision;
  private district: AdministrativeDivision | null = null;
  private ward: AdministrativeDivision | null = null;
  private street?: string;
  private postalCode?: string;
  private detail?: string;

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

  setDetail(detail: string): this {
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
      district: this.district ?? null,
      ward: this.ward ?? null,
      street: this.street,
      postalCode: this.postalCode,
      detail: this.detail,
    });
  }
}
