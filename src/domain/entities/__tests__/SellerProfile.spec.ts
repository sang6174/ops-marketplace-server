import { describe, it, expect, beforeEach } from '@jest/globals';

import { SellerProfile } from '../../entities/identities/SellerProfile';
import { UserId } from '../../value-objects/UserId';
import { FarmName } from '../../value-objects/FarmName';
import { TaxId } from '../../value-objects/TaxId';
import { BusinessLicense } from '../../value-objects/BusinessLicense';
import { BankAccountNumber } from '../../value-objects/BankAccountNumber';
import { Rating } from '../../value-objects/Rating';
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

describe('SellerProfile', () => {
  let sellerProfile: SellerProfile;
  const mockUserId = UserId.create('user-123');
  const mockId = 'seller-456';
  const mockFarmName = FarmName.create('Green Farm');
  const mockTaxId = TaxId.create('0123456789123');
  const mockLicense = BusinessLicense.create('LIC-001');
  const mockBankAccount = BankAccountNumber.create('1234567890');
  const mockAddress = createMockAddress();
  const mockCreatedAt = new Date('2025-01-01T00:00:00.000Z');

  beforeEach(() => {
    sellerProfile = SellerProfile.create({
      id: mockId,
      userId: mockUserId,
      farmName: mockFarmName,
      addresses: [mockAddress],
      taxId: mockTaxId,
      businessLicense: mockLicense,
      bankAccount: mockBankAccount,
      isVerified: false,
      rating: Rating.fromNumber(4.5),
      createdAt: mockCreatedAt,
    });
  });

  describe('create()', () => {
    it('should create a seller profile with all required fields', () => {
      expect(sellerProfile.id).toBe(mockId);
      expect(sellerProfile.userId).toBe(mockUserId);
      expect(sellerProfile.farmName).toBe(mockFarmName);
      expect(sellerProfile.addresses).toEqual([mockAddress]);
      expect(sellerProfile.taxId).toBe(mockTaxId);
      expect(sellerProfile.businessLicense).toBe(mockLicense);
      expect(sellerProfile.bankAccount).toBe(mockBankAccount);
      expect(sellerProfile.isVerified).toBe(false);
      expect(sellerProfile.rating).toEqual(Rating.fromNumber(4.5));
      expect(sellerProfile.createdAt).toBe(mockCreatedAt);
      expect(sellerProfile.updatedAt).toBe(mockCreatedAt);
    });

    it('should default isVerified to false and rating to 0 if not provided', () => {
      const profile = SellerProfile.create({
        id: 'new',
        userId: mockUserId,
        farmName: mockFarmName,
        addresses: [],
        taxId: mockTaxId,
        businessLicense: mockLicense,
        bankAccount: mockBankAccount,
        createdAt: mockCreatedAt,
      });
      expect(profile.isVerified).toBe(false);
      expect(profile.rating).toEqual(Rating.fromNumber(0));
    });
  });

  describe('reconstitute()', () => {
    it('should recreate a seller profile from persistence data', () => {
      const reconstituted = SellerProfile.reconstitute({
        id: mockId,
        userId: mockUserId,
        farmName: mockFarmName,
        addresses: [mockAddress],
        taxId: mockTaxId,
        businessLicense: mockLicense,
        bankAccount: mockBankAccount,
        isVerified: true,
        rating: Rating.fromNumber(3.0),
        createdAt: mockCreatedAt,
        updatedAt: new Date('2025-02-01'),
      });

      expect(reconstituted.id).toBe(mockId);
      expect(reconstituted.isVerified).toBe(true);
      expect(reconstituted.rating).toEqual(Rating.fromNumber(3.0));
      expect(reconstituted.updatedAt).toEqual(new Date('2025-02-01'));
    });
  });

  describe('behaviors', () => {
    it('should change farm name', () => {
      const newName = FarmName.create('New Farm');
      sellerProfile.changeFarmName(newName);
      expect(sellerProfile.farmName).toBe(newName);
      expect(sellerProfile.updatedAt).not.toBe(mockCreatedAt);
    });

    it('should update addresses', () => {
      const newAddress = createMockAddress();
      sellerProfile.updateAddresses([newAddress]);
      expect(sellerProfile.addresses).toEqual([newAddress]);
    });

    it('should change tax ID', () => {
      const newTaxId = TaxId.create('0123456789123');
      sellerProfile.changeTaxId(newTaxId);
      expect(sellerProfile.taxId).toBe(newTaxId);
    });

    it('should change business license', () => {
      const newLicense = BusinessLicense.create('LIC-002');
      sellerProfile.changeBusinessLicense(newLicense);
      expect(sellerProfile.businessLicense).toBe(newLicense);
    });

    it('should change bank account', () => {
      const newBank = BankAccountNumber.create('0987654321');
      sellerProfile.changeBankAccount(newBank);
      expect(sellerProfile.bankAccount).toBe(newBank);
    });

    it('should verify seller', () => {
      expect(sellerProfile.isVerified).toBe(false);
      sellerProfile.verify();
      expect(sellerProfile.isVerified).toBe(true);
    });

    it('should unverify seller', () => {
      sellerProfile.verify();
      expect(sellerProfile.isVerified).toBe(true);
      sellerProfile.unverify();
      expect(sellerProfile.isVerified).toBe(false);
    });

    it('should update rating', () => {
      const newRating = Rating.fromNumber(5);
      sellerProfile.updateRating(newRating);
      expect(sellerProfile.rating).toBe(newRating);
    });
  });
});
