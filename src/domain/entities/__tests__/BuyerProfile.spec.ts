import { describe, it, expect, beforeEach } from '@jest/globals';

import { BuyerProfile } from '../../entities/identities/BuyerProfile';
import { UserId } from '../../value-objects/UserId';
import { BuyerType } from '../enums.enum';
import { LoyaltyPoints } from '../../value-objects/LoyaltyPoint';
import { TaxId } from '../../value-objects/TaxId';
import { BusinessLicense } from '../../value-objects/BusinessLicense';
import { CompanyName } from '../../value-objects/CompanyName';
import { Country } from '../../value-objects/Country';
import { AdministrativeDivision } from '../../value-objects/AdministrativeDivision';
import { Address } from '../../value-objects/Address';

function createMockAddress(): Address {
  const country = new Country('VN', 'Vietnam');
  const province = new AdministrativeDivision(country, 2, 'VN-01', 'Hanoi');
  const district = new AdministrativeDivision(
    country,
    3,
    'VN-01-001',
    'Ba Dinh',
  );
  return Address.create({
    country,
    stateProvince: province,
    district,
    ward: null,
    street: '123 Test St',
    postalCode: '100000',
    detail: 'Apt 1',
  });
}

describe('BuyerProfile', () => {
  let buyerProfile: BuyerProfile;
  const mockUserId = UserId.create('user-123');
  const mockId = 'buyer-456';
  const mockAddress = createMockAddress();
  const mockCreatedAt = new Date('2025-01-01');
  const mockLoyaltyPoints = LoyaltyPoints.fromNumber(100);

  beforeEach(() => {
    buyerProfile = BuyerProfile.create({
      id: mockId,
      userId: mockUserId,
      buyerType: BuyerType.INDIVIDUAL,
      addresses: [mockAddress],
      loyaltyPoints: mockLoyaltyPoints,
      taxId: null,
      companyName: null,
      businessLicense: null,
      createdAt: mockCreatedAt,
    });
  });

  describe('create()', () => {
    it('should create buyer profile with default values', () => {
      expect(buyerProfile.id).toBe(mockId);
      expect(buyerProfile.userId).toBe(mockUserId);
      expect(buyerProfile.buyerType).toBe(BuyerType.INDIVIDUAL);
      expect(buyerProfile.loyaltyPoints).toEqual(mockLoyaltyPoints);
      expect(buyerProfile.taxId).toBeNull();
      expect(buyerProfile.companyName).toBeNull();
      expect(buyerProfile.businessLicense).toBeNull();
    });

    it('should set loyaltyPoints to zero if not provided', () => {
      const profile = BuyerProfile.create({
        id: 'new',
        userId: mockUserId,
        buyerType: BuyerType.BUSINESS,
        addresses: [],
        createdAt: mockCreatedAt,
      });
      expect(profile.loyaltyPoints).toEqual(LoyaltyPoints.zero());
    });
  });

  describe('reconstitute()', () => {
    it('should recreate buyer profile from persistence', () => {
      const reconstituted = BuyerProfile.reconstitute({
        id: mockId,
        userId: mockUserId,
        buyerType: BuyerType.BUSINESS,
        addresses: [],
        loyaltyPoints: LoyaltyPoints.fromNumber(200),
        taxId: TaxId.create('0123456789234'),
        companyName: CompanyName.create('ABC Corp'),
        businessLicense: BusinessLicense.create('LIC-001'),
        createdAt: mockCreatedAt,
        updatedAt: new Date('2025-02-01'),
      });
      expect(reconstituted.buyerType).toBe(BuyerType.BUSINESS);
      expect(reconstituted.loyaltyPoints).toEqual(
        LoyaltyPoints.fromNumber(200),
      );
      expect(reconstituted.taxId).toEqual(TaxId.create('0123456789234'));
    });
  });

  describe('behaviors', () => {
    it('should change buyer type', () => {
      buyerProfile.changeBuyerType(BuyerType.WHOLESALER);
      expect(buyerProfile.buyerType).toBe(BuyerType.WHOLESALER);
    });

    it('should update addresses', () => {
      const newAddress = createMockAddress();
      buyerProfile.updateAddresses([newAddress]);
      expect(buyerProfile.addresses).toEqual([newAddress]);
    });

    it('should add loyalty points', () => {
      const points = LoyaltyPoints.fromNumber(50);
      buyerProfile.addLoyaltyPoints(points);
      expect(buyerProfile.loyaltyPoints).toEqual(LoyaltyPoints.fromNumber(150));
    });

    it('should redeem loyalty points', () => {
      const points = LoyaltyPoints.fromNumber(30);
      buyerProfile.redeemLoyaltyPoints(points);
      expect(buyerProfile.loyaltyPoints).toEqual(LoyaltyPoints.fromNumber(70));
    });

    it('should throw error when redeeming more points than available', () => {
      const points = LoyaltyPoints.fromNumber(200);
      expect(() => buyerProfile.redeemLoyaltyPoints(points)).toThrow(
        'Insufficient points. Available: 100',
      );
    });

    it('should update tax ID', () => {
      const taxId = TaxId.create('9876543210123');
      buyerProfile.updateTaxId(taxId);
      expect(buyerProfile.taxId).toBe(taxId);
    });

    it('should update company name', () => {
      const name = CompanyName.create('XYZ Ltd');
      buyerProfile.updateCompanyName(name);
      expect(buyerProfile.companyName).toBe(name);
    });

    it('should update business license', () => {
      const license = BusinessLicense.create('LIC-999');
      buyerProfile.updateBusinessLicense(license);
      expect(buyerProfile.businessLicense).toBe(license);
    });
  });
});
