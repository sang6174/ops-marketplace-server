import { Country } from '../../value-objects/Country';
import { AdministrativeDivision } from '../../value-objects/AdministrativeDivision';
import { Address } from '../../value-objects/Address';

describe('Country', () => {
  it('should create valid country', () => {
    const country = new Country('VN', 'Vietnam');
    expect(country.code).toBe('VN');
    expect(country.name).toBe('Vietnam');
  });

  it('should throw if code not exactly 2 chars', () => {
    expect(() => new Country('V', 'Vietnam')).toThrow(
      'Country code must be exactly 2 characters',
    );
    expect(() => new Country('VNM', 'Vietnam')).toThrow(
      'Country code must be exactly 2 characters',
    );
  });

  it('should throw if name empty', () => {
    expect(() => new Country('VN', '')).toThrow('Country name cannot be empty');
  });

  it('equals should return true for same code', () => {
    const c1 = new Country('VN', 'Vietnam');
    const c2 = new Country('VN', 'Viet Nam');
    expect(c1.equals(c2)).toBe(true);
  });

  it('toString should return code', () => {
    const country = new Country('VN', 'Vietnam');
    expect(country.toString()).toBe('VN');
  });
});

describe('AdministrativeDivision', () => {
  const country = new Country('VN', 'Vietnam');

  it('should create valid division', () => {
    const div = new AdministrativeDivision(country, 2, 'VN-01', 'Hanoi');
    expect(div.country).toBe(country);
    expect(div.level).toBe(2);
    expect(div.code).toBe('VN-01');
    expect(div.name).toBe('Hanoi');
    expect(div.parentCode).toBeUndefined();
  });

  it('should throw if level invalid', () => {
    expect(
      () => new AdministrativeDivision(country, 1, 'VN-01', 'Invalid'),
    ).toThrow('AdministrativeDivision level must be 2, 3, or 4');
  });

  it('should throw if code empty', () => {
    expect(() => new AdministrativeDivision(country, 2, '', 'Name')).toThrow(
      'AdministrativeDivision code cannot be empty',
    );
  });

  it('should throw if name empty', () => {
    expect(() => new AdministrativeDivision(country, 2, 'VN-01', '')).toThrow(
      'AdministrativeDivision name cannot be empty',
    );
  });

  it('should throw if parentCode equals code', () => {
    expect(
      () => new AdministrativeDivision(country, 2, 'VN-01', 'Name', 'VN-01'),
    ).toThrow('Parent code cannot be the same as code');
  });

  it('equals should compare country, level, code', () => {
    const d1 = new AdministrativeDivision(country, 2, 'VN-01', 'Hanoi');
    const d2 = new AdministrativeDivision(country, 2, 'VN-01', 'Ha Noi');
    const d3 = new AdministrativeDivision(country, 3, 'VN-01-001', 'District');
    expect(d1.equals(d2)).toBe(true);
    expect(d1.equals(d3)).toBe(false);
  });

  it('toString should return country-code', () => {
    const div = new AdministrativeDivision(country, 2, 'VN-01', 'Hanoi');
    expect(div.toString()).toBe('VN-VN-01');
  });
});

describe('Address', () => {
  const country = new Country('VN', 'Vietnam');
  const province = new AdministrativeDivision(country, 2, 'VN-01', 'Hanoi');
  const district = new AdministrativeDivision(
    country,
    3,
    'VN-01-001',
    'Ba Dinh',
  );
  const ward = new AdministrativeDivision(
    country,
    4,
    'VN-01-001-001',
    'Phuc Xa',
  );

  describe('create()', () => {
    it('should create valid address', () => {
      const address = Address.create({
        country,
        stateProvince: province,
        district,
        ward,
        street: '123 Nguyen Trai',
        postalCode: '100000',
        detail: 'Apt 5',
      });
      expect(address.country).toBe(country);
      expect(address.stateProvince).toBe(province);
      expect(address.district).toBe(district);
      expect(address.ward).toBe(ward);
      expect(address.street).toBe('123 Nguyen Trai');
      expect(address.postalCode).toBe('100000');
      expect(address.detail).toBe('Apt 5');
    });

    it('should allow null district and ward', () => {
      const address = Address.create({
        country,
        stateProvince: province,
        district: null,
        ward: null,
        street: '123 Nguyen Trai',
        postalCode: '100000',
      });
      expect(address.district).toBeNull();
      expect(address.ward).toBeNull();
    });

    it('should throw if stateProvince not level 2', () => {
      const invalid = new AdministrativeDivision(
        country,
        3,
        'VN-01-001',
        'District',
      );
      expect(() =>
        Address.create({
          country,
          stateProvince: invalid,
          district: null,
          ward: null,
          street: '123',
          postalCode: '100000',
        }),
      ).toThrow('stateProvince must be level 2');
    });

    it('should throw if district not level 3', () => {
      const invalid = new AdministrativeDivision(country, 2, 'VN-02', 'City');
      expect(() =>
        Address.create({
          country,
          stateProvince: province,
          district: invalid,
          ward: null,
          street: '123',
          postalCode: '100000',
        }),
      ).toThrow('district must be level 3');
    });

    it('should throw if ward not level 4', () => {
      const invalid = new AdministrativeDivision(
        country,
        3,
        'VN-01-001',
        'District',
      );
      expect(() =>
        Address.create({
          country,
          stateProvince: province,
          district: null,
          ward: invalid,
          street: '123',
          postalCode: '100000',
        }),
      ).toThrow('ward must be level 4');
    });

    it('should throw if administrative divisions belong to different country', () => {
      const otherCountry = new Country('US', 'USA');
      const otherProvince = new AdministrativeDivision(
        otherCountry,
        2,
        'US-CA',
        'California',
      );
      expect(() =>
        Address.create({
          country,
          stateProvince: otherProvince,
          district: null,
          ward: null,
          street: '123',
          postalCode: '100000',
        }),
      ).toThrow('stateProvince must belong to the same country');

      const otherDistrict = new AdministrativeDivision(
        otherCountry,
        3,
        'US-CA-001',
        'LA',
      );
      expect(() =>
        Address.create({
          country,
          stateProvince: province,
          district: otherDistrict,
          ward: null,
          street: '123',
          postalCode: '100000',
        }),
      ).toThrow('district must belong to the same country');
    });

    it('should throw if street empty', () => {
      expect(() =>
        Address.create({
          country,
          stateProvince: province,
          district: null,
          ward: null,
          street: '',
          postalCode: '100000',
        }),
      ).toThrow('Street cannot be empty');
    });

    it('should throw if postalCode empty', () => {
      expect(() =>
        Address.create({
          country,
          stateProvince: province,
          district: null,
          ward: null,
          street: '123',
          postalCode: '',
        }),
      ).toThrow('Postal code cannot be empty');
    });
  });

  describe('reconstitute()', () => {
    it('should recreate address from persistence', () => {
      const address = Address.reconstitute({
        country,
        stateProvince: province,
        district,
        ward,
        street: '123 Nguyen Trai',
        postalCode: '100000',
        detail: 'Apt 5',
      });
      expect(address.country).toBe(country);
      expect(address.stateProvince).toBe(province);
      expect(address.district).toBe(district);
      expect(address.ward).toBe(ward);
      expect(address.street).toBe('123 Nguyen Trai');
      expect(address.postalCode).toBe('100000');
      expect(address.detail).toBe('Apt 5');
    });
  });

  describe('builder()', () => {
    it('should build address with fluent API', () => {
      const address = Address.builder()
        .setCountry(country)
        .setStateProvince(province)
        .setDistrict(district)
        .setWard(ward)
        .setStreet('123 Nguyen Trai')
        .setPostalCode('100000')
        .setDetail('Apt 5')
        .build();
      expect(address.street).toBe('123 Nguyen Trai');
      expect(address.postalCode).toBe('100000');
    });

    it('should throw if missing required fields', () => {
      expect(() => Address.builder().build()).toThrow('Country is required');
      expect(() => Address.builder().setCountry(country).build()).toThrow(
        'State/Province is required',
      );
      expect(() =>
        Address.builder()
          .setCountry(country)
          .setStateProvince(province)
          .build(),
      ).toThrow('Street is required');
      expect(() =>
        Address.builder()
          .setCountry(country)
          .setStateProvince(province)
          .setStreet('123')
          .build(),
      ).toThrow('Postal code is required');
    });
  });

  describe('immutable update methods', () => {
    let address: Address;
    beforeEach(() => {
      address = Address.create({
        country,
        stateProvince: province,
        district,
        ward,
        street: '123 Nguyen Trai',
        postalCode: '100000',
        detail: 'Apt 5',
      });
    });

    it('withStreet should return new address with new street', () => {
      const newAddr = address.withStreet('456 Le Loi');
      expect(newAddr).not.toBe(address);
      expect(newAddr.street).toBe('456 Le Loi');
      expect(address.street).toBe('123 Nguyen Trai');
    });

    it('withPostalCode should return new address with new postal code', () => {
      const newAddr = address.withPostalCode('700000');
      expect(newAddr.postalCode).toBe('700000');
      expect(address.postalCode).toBe('100000');
    });

    it('withDistrict should return new address with new district', () => {
      const newDistrict = new AdministrativeDivision(
        country,
        3,
        'VN-01-002',
        'Hoan Kiem',
      );
      const newAddr = address.withDistrict(newDistrict);
      expect(newAddr.district).toBe(newDistrict);
      expect(address.district).toBe(district);
    });

    it('withWard should return new address with new ward', () => {
      const newWard = new AdministrativeDivision(
        country,
        4,
        'VN-01-001-002',
        'Trang Tien',
      );
      const newAddr = address.withWard(newWard);
      expect(newAddr.ward).toBe(newWard);
      expect(address.ward).toBe(ward);
    });

    it('withDetail should return new address with new detail', () => {
      const newAddr = address.withDetail('Floor 10');
      expect(newAddr.detail).toBe('Floor 10');
      expect(address.detail).toBe('Apt 5');
    });
  });

  describe('equals()', () => {
    it('should return true for identical addresses', () => {
      const addr1 = Address.create({
        country,
        stateProvince: province,
        district,
        ward,
        street: '123 Nguyen Trai',
        postalCode: '100000',
        detail: 'Apt 5',
      });
      const addr2 = Address.create({
        country,
        stateProvince: province,
        district,
        ward,
        street: '123 Nguyen Trai',
        postalCode: '100000',
        detail: 'Apt 5',
      });
      expect(addr1.equals(addr2)).toBe(true);
    });

    it('should return false if any field differs', () => {
      const addr1 = Address.create({
        country,
        stateProvince: province,
        district,
        ward,
        street: '123 Nguyen Trai',
        postalCode: '100000',
      });
      const addr2 = Address.create({
        country,
        stateProvince: province,
        district,
        ward,
        street: '456 Le Loi',
        postalCode: '100000',
      });
      expect(addr1.equals(addr2)).toBe(false);
    });
  });

  describe('toString and fullAddress', () => {
    it('should return full address string', () => {
      const address = Address.create({
        country,
        stateProvince: province,
        district,
        ward,
        street: '123 Nguyen Trai',
        postalCode: '100000',
        detail: 'Apt 5',
      });
      expect(address.toString()).toBe(
        '123 Nguyen Trai, Phuc Xa, Ba Dinh, Hanoi, Vietnam, 100000',
      );
      expect(address.fullAddress).toBe(address.toString());
    });

    it('should handle missing ward and district', () => {
      const address = Address.create({
        country,
        stateProvince: province,
        district: null,
        ward: null,
        street: '123 Nguyen Trai',
        postalCode: '100000',
      });
      expect(address.toString()).toBe(
        '123 Nguyen Trai, Hanoi, Vietnam, 100000',
      );
    });
  });

  describe('validation hierarchy', () => {
    it('should throw if district parentCode does not match stateProvince code', () => {
      const districtWrongParent = new AdministrativeDivision(
        country,
        3,
        'VN-01-001',
        'District',
        'VN-02',
      );
      expect(() =>
        Address.create({
          country,
          stateProvince: province,
          district: districtWrongParent,
          ward: null,
          street: '123',
          postalCode: '100000',
        }),
      ).toThrow('district must belong to stateProvince (parentCode mismatch)');
    });

    it('should throw if ward parentCode does not match district code when district provided', () => {
      const wardWrongParent = new AdministrativeDivision(
        country,
        4,
        'VN-01-001-001',
        'Ward',
        'VN-01-002',
      );
      expect(() =>
        Address.create({
          country,
          stateProvince: province,
          district,
          ward: wardWrongParent,
          street: '123',
          postalCode: '100000',
        }),
      ).toThrow('ward must belong to district (parentCode mismatch)');
    });

    it('should throw if ward parentCode does not match stateProvince code when district null', () => {
      const wardWrongParent = new AdministrativeDivision(
        country,
        4,
        'VN-01-001-001',
        'Ward',
        'VN-02',
      );
      expect(() =>
        Address.create({
          country,
          stateProvince: province,
          district: null,
          ward: wardWrongParent,
          street: '123',
          postalCode: '100000',
        }),
      ).toThrow('ward must belong to stateProvince when district is null');
    });
  });
});
