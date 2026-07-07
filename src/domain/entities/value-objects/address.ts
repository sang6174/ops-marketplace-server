export class Country {
  constructor(
    public readonly code: string,
    public readonly name: string,
  ) {}

  equals(other: Country): boolean {
    return other instanceof Country && this.code === other.code;
  }

  toString(): string {
    return this.code;
  }
}

export class AdministrativeDivision {
  constructor(
    public readonly country: Country,
    public readonly level: number,
    public readonly code: string,
    public readonly name: string,
    public readonly parentCode?: string,
  ) {
    if (![2, 3, 4].includes(level)) {
      throw new Error('AdministrativeDivision level must be 2, 3, or 4');
    }
  }

  equals(other: AdministrativeDivision): boolean {
    return (
      other instanceof AdministrativeDivision &&
      this.country.equals(other.country) &&
      this.level === other.level &&
      this.code === other.code
    );
  }

  toString(): string {
    return `${this.country.code}-${this.code}`;
  }
}

export class Address {
  constructor(
    public readonly country: Country,
    public readonly stateProvince: AdministrativeDivision,
    public readonly district: AdministrativeDivision | null,
    public readonly ward: AdministrativeDivision | null,
    public readonly street: string,
    public readonly postalCode: string,
    public readonly detail?: string,
  ) {
    if (stateProvince.level !== 2) {
      throw new Error('stateProvince must be level 2');
    }
    if (district && district.level !== 3) {
      throw new Error('district must be level 3');
    }
    if (ward && ward.level !== 4) {
      throw new Error('ward must be level 4');
    }

    if (district && !district.country.equals(this.country)) {
      throw new Error('district must belong to the same country');
    }
    if (ward && !ward.country.equals(this.country)) {
      throw new Error('ward must belong to the same country');
    }
    if (!stateProvince.country.equals(this.country)) {
      throw new Error('stateProvince must belong to the same country');
    }
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
}
