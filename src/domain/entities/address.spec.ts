import {
  Country,
  AdministrativeDivision,
  Address,
} from './address';

describe('Country Value Object', () => {
  it('should create country', () => {
    const country = new Country('VN', 'Vietnam');

    expect(country.code).toBe('VN');
    expect(country.name).toBe('Vietnam');
  });

  describe('equals', () => {
    it('should return true for same code', () => {
      const country1 = new Country('VN', 'Vietnam');
      const country2 = new Country('VN', 'Việt Nam');

      expect(country1.equals(country2)).toBe(true);
    });

    it('should return false for different code', () => {
      const country1 = new Country('VN', 'Vietnam');
      const country2 = new Country('TH', 'Thailand');

      expect(country1.equals(country2)).toBe(false);
    });

    it('should return false for non-Country object', () => {
      const country = new Country('VN', 'Vietnam');

      expect(country.equals(null as any)).toBe(false);
      expect(country.equals({} as any)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return country code', () => {
      const country = new Country('VN', 'Vietnam');

      expect(country.toString()).toBe('VN');
    });
  });
});

describe('AdministrativeDivision Value Object', () => {
  let country: Country;

  beforeEach(() => {
    country = new Country('VN', 'Vietnam');
  });

  it('should create level 2 (province)', () => {
    const province = new AdministrativeDivision(
      country,
      2,
      'HCM',
      'Ho Chi Minh',
    );

    expect(province.level).toBe(2);
    expect(province.code).toBe('HCM');
    expect(province.name).toBe('Ho Chi Minh');
    expect(province.country).toBe(country);
  });

  it('should create level 3 (district)', () => {
    const district = new AdministrativeDivision(
      country,
      3,
      'Q1',
      'District 1',
      'HCM',
    );

    expect(district.level).toBe(3);
    expect(district.parentCode).toBe('HCM');
  });

  it('should create level 4 (ward)', () => {
    const ward = new AdministrativeDivision(
      country,
      4,
      'W1',
      'Ward 1',
      'Q1',
    );

    expect(ward.level).toBe(4);
    expect(ward.parentCode).toBe('Q1');
  });

  it('should throw error on invalid level', () => {
    expect(
      () =>
        new AdministrativeDivision(country, 1, 'INVALID', 'Invalid Level'),
    ).toThrow('AdministrativeDivision level must be 2, 3, or 4');

    expect(
      () =>
        new AdministrativeDivision(country, 5, 'INVALID', 'Invalid Level'),
    ).toThrow('AdministrativeDivision level must be 2, 3, or 4');
  });

  describe('equals', () => {
    let province1: AdministrativeDivision;
    let province2: AdministrativeDivision;

    beforeEach(() => {
      province1 = new AdministrativeDivision(
        country,
        2,
        'HCM',
        'Ho Chi Minh',
      );
      province2 = new AdministrativeDivision(
        country,
        2,
        'HCM',
        'Ho Chi Minh City',
      );
    });

    it('should return true for same code and level', () => {
      expect(province1.equals(province2)).toBe(true);
    });

    it('should return false for different code', () => {
      const other = new AdministrativeDivision(country, 2, 'DN', 'Da Nang');

      expect(province1.equals(other)).toBe(false);
    });

    it('should return false for different level', () => {
      const different = new AdministrativeDivision(
        country,
        3,
        'HCM',
        'Ho Chi Minh',
      );

      expect(province1.equals(different)).toBe(false);
    });

    it('should return false for different country', () => {
      const otherCountry = new Country('TH', 'Thailand');
      const different = new AdministrativeDivision(
        otherCountry,
        2,
        'HCM',
        'Ho Chi Minh',
      );

      expect(province1.equals(different)).toBe(false);
    });

    it('should return false for non-AdministrativeDivision', () => {
      expect(province1.equals(null as any)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return country code and division code', () => {
      const province = new AdministrativeDivision(
        country,
        2,
        'HCM',
        'Ho Chi Minh',
      );

      expect(province.toString()).toBe('VN-HCM');
    });
  });
});

describe('Address Value Object', () => {
  let country: Country;
  let province: AdministrativeDivision;
  let district: AdministrativeDivision;
  let ward: AdministrativeDivision;

  beforeEach(() => {
    country = new Country('VN', 'Vietnam');
    province = new AdministrativeDivision(country, 2, 'HCM', 'Ho Chi Minh');
    district = new AdministrativeDivision(country, 3, 'Q1', 'District 1', 'HCM');
    ward = new AdministrativeDivision(
      country,
      4,
      'W1',
      'Ward 1',
      'Q1',
    );
  });

  it('should create address with province only', () => {
    const address = new Address(
      country,
      province,
      null,
      null,
      '123 Main St',
      '70000',
    );

    expect(address.country).toBe(country);
    expect(address.stateProvince).toBe(province);
    expect(address.district).toBeNull();
    expect(address.ward).toBeNull();
    expect(address.street).toBe('123 Main St');
    expect(address.postalCode).toBe('70000');
    expect(address.detail).toBeUndefined();
  });

  it('should create address with all divisions', () => {
    const address = new Address(
      country,
      province,
      district,
      ward,
      '123 Main St',
      '70000',
      'Apt 5',
    );

    expect(address.stateProvince).toBe(province);
    expect(address.district).toBe(district);
    expect(address.ward).toBe(ward);
    expect(address.detail).toBe('Apt 5');
  });

  it('should throw error if state province level is not 2', () => {
    const badProvince = new AdministrativeDivision(
      country,
      3,
      'Q1',
      'District 1',
    );

    expect(
      () =>
        new Address(
          country,
          badProvince,
          null,
          null,
          '123 Main St',
          '70000',
        ),
    ).toThrow('stateProvince must be level 2');
  });

  it('should throw error if district level is not 3', () => {
    const badDistrict = new AdministrativeDivision(
      country,
      2,
      'HCM2',
      'Ho Chi Minh 2',
    );

    expect(
      () =>
        new Address(
          country,
          province,
          badDistrict,
          null,
          '123 Main St',
          '70000',
        ),
    ).toThrow('district must be level 3');
  });

  it('should throw error if ward level is not 4', () => {
    const badWard = new AdministrativeDivision(
      country,
      3,
      'Q1W',
      'Bad Ward',
    );

    expect(
      () =>
        new Address(
          country,
          province,
          district,
          badWard,
          '123 Main St',
          '70000',
        ),
    ).toThrow('ward must be level 4');
  });

  it('should throw error if country mismatch', () => {
    const otherCountry = new Country('TH', 'Thailand');
    const otherProvince = new AdministrativeDivision(
      otherCountry,
      2,
      'BKK',
      'Bangkok',
    );

    expect(
      () =>
        new Address(
          country,
          otherProvince,
          null,
          null,
          '123 Main St',
          '70000',
        ),
    ).toThrow('stateProvince must belong to the same country');
  });

  it('should throw error if district country mismatch', () => {
    const otherCountry = new Country('TH', 'Thailand');
    const otherDistrict = new AdministrativeDivision(
      otherCountry,
      3,
      'Q1',
      'District 1',
    );

    expect(
      () =>
        new Address(
          country,
          province,
          otherDistrict,
          null,
          '123 Main St',
          '70000',
        ),
    ).toThrow('district must belong to the same country');
  });

  it('should throw error if ward country mismatch', () => {
    const otherCountry = new Country('TH', 'Thailand');
    const otherWard = new AdministrativeDivision(
      otherCountry,
      4,
      'W1',
      'Ward 1',
    );

    expect(
      () =>
        new Address(
          country,
          province,
          district,
          otherWard,
          '123 Main St',
          '70000',
        ),
    ).toThrow('ward must belong to the same country');
  });

  describe('equals', () => {
    let address1: Address;
    let address2: Address;

    beforeEach(() => {
      address1 = new Address(
        country,
        province,
        district,
        ward,
        '123 Main St',
        '70000',
        'Apt 5',
      );
      address2 = new Address(
        country,
        province,
        district,
        ward,
        '123 Main St',
        '70000',
        'Apt 5',
      );
    });

    it('should return true for identical addresses', () => {
      expect(address1.equals(address2)).toBe(true);
    });

    it('should return false for different street', () => {
      const different = new Address(
        country,
        province,
        district,
        ward,
        '456 Oak Ave',
        '70000',
        'Apt 5',
      );

      expect(address1.equals(different)).toBe(false);
    });

    it('should return false for different postal code', () => {
      const different = new Address(
        country,
        province,
        district,
        ward,
        '123 Main St',
        '71000',
        'Apt 5',
      );

      expect(address1.equals(different)).toBe(false);
    });

    it('should return false for different detail', () => {
      const different = new Address(
        country,
        province,
        district,
        ward,
        '123 Main St',
        '70000',
        'Apt 6',
      );

      expect(address1.equals(different)).toBe(false);
    });

    it('should return false for different country', () => {
      const otherCountry = new Country('TH', 'Thailand');
      const different = new Address(
        otherCountry,
        province,
        district,
        ward,
        '123 Main St',
        '70000',
        'Apt 5',
      );

      expect(address1.equals(different)).toBe(false);
    });

    it('should return false for non-Address object', () => {
      expect(address1.equals(null as any)).toBe(false);
    });
  });

  describe('withStreet', () => {
    let address: Address;

    beforeEach(() => {
      address = new Address(
        country,
        province,
        district,
        ward,
        '123 Main St',
        '70000',
        'Apt 5',
      );
    });

    it('should create new address with updated street', () => {
      const updated = address.withStreet('456 Oak Ave');

      expect(updated.street).toBe('456 Oak Ave');
      expect(updated.postalCode).toBe('70000');
      expect(updated.detail).toBe('Apt 5');
      expect(updated.stateProvince).toBe(province);
    });

    it('should not modify original address', () => {
      const updated = address.withStreet('456 Oak Ave');

      expect(address.street).toBe('123 Main St');
      expect(updated.street).toBe('456 Oak Ave');
      expect(address).not.toBe(updated);
    });
  });

  describe('withPostalCode', () => {
    let address: Address;

    beforeEach(() => {
      address = new Address(
        country,
        province,
        district,
        ward,
        '123 Main St',
        '70000',
        'Apt 5',
      );
    });

    it('should create new address with updated postal code', () => {
      const updated = address.withPostalCode('71000');

      expect(updated.postalCode).toBe('71000');
      expect(updated.street).toBe('123 Main St');
      expect(updated.detail).toBe('Apt 5');
    });

    it('should not modify original address', () => {
      const updated = address.withPostalCode('71000');

      expect(address.postalCode).toBe('70000');
      expect(updated.postalCode).toBe('71000');
      expect(address).not.toBe(updated);
    });
  });
});
