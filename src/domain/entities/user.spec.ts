import { Seller, Buyer, Admin } from './user';
import { UserRole, SubAdminRole, BuyerType } from './enums.enum';
import { Country, AdministrativeDivision, Address } from './address';

describe('User Domain Entity', () => {
  let testCountry: Country;
  let testProvince: AdministrativeDivision;
  let testAddress: Address;

  beforeEach(() => {
    testCountry = new Country('VN', 'Vietnam');
    testProvince = new AdministrativeDivision(
      testCountry,
      2,
      'HCM',
      'Ho Chi Minh',
    );
    testAddress = new Address(
      testCountry,
      testProvince,
      null,
      null,
      '123 Main St',
      '70000',
    );
  });

  describe('Seller', () => {
    let seller: Seller;

    beforeEach(() => {
      seller = new Seller(
        'seller-1',
        'seller@farm.com',
        'John Farmer',
        '0912345678',
        true,
        new Date('2024-01-01'),
        new Date('2024-01-01'),
        'Green Valley Farm',
        [testAddress],
        '1234567890',
        'BL123456789',
        'BIDV123456789',
        false,
        4.5,
      );
    });

    describe('getters', () => {
      it('should return farmName', () => {
        expect(seller.farmName).toBe('Green Valley Farm');
      });

      it('should return addresses', () => {
        expect(seller.addresses).toEqual([testAddress]);
      });

      it('should return taxId', () => {
        expect(seller.taxId).toBe('1234567890');
      });

      it('should return businessLicense', () => {
        expect(seller.businessLicense).toBe('BL123456789');
      });

      it('should return bankAccount', () => {
        expect(seller.bankAccount).toBe('BIDV123456789');
      });

      it('should return isVerified', () => {
        expect(seller.isVerified).toBe(false);
      });

      it('should return rating', () => {
        expect(seller.rating).toBe(4.5);
      });
    });

    describe('changeFarmName', () => {
      it('should update farm name', () => {
        seller.changeFarmName('New Farm');
        expect(seller.farmName).toBe('New Farm');
      });

      it('should throw error on empty farm name', () => {
        expect(() => seller.changeFarmName('')).toThrow(
          'Farm name cannot be empty',
        );
      });

      it('should throw error on null farm name', () => {
        expect(() => seller.changeFarmName(null as any)).toThrow(
          'Farm name cannot be empty',
        );
      });

      it('should trim whitespace', () => {
        seller.changeFarmName('  Trimmed Farm  ');
        expect(seller.farmName).toBe('Trimmed Farm');
      });

      it('should update updatedAt timestamp', () => {
        const oldTimestamp = seller.updatedAt;
        seller.changeFarmName('New Farm');
        expect(seller.updatedAt.getTime()).toBeGreaterThanOrEqual(
          oldTimestamp.getTime(),
        );
      });
    });

    describe('updateAddresses', () => {
      it('should update addresses', () => {
        const newAddress = new Address(
          testCountry,
          testProvince,
          null,
          null,
          '456 Farm Lane',
          '71000',
        );
        seller.updateAddresses([newAddress]);
        expect(seller.addresses).toEqual([newAddress]);
      });

      it('should allow multiple addresses', () => {
        const addr1 = new Address(
          testCountry,
          testProvince,
          null,
          null,
          '123 Main St',
          '70000',
        );
        const addr2 = new Address(
          testCountry,
          testProvince,
          null,
          null,
          '456 Farm Lane',
          '71000',
        );
        seller.updateAddresses([addr1, addr2]);
        expect(seller.addresses).toHaveLength(2);
      });

      it('should allow empty address array', () => {
        seller.updateAddresses([]);
        expect(seller.addresses).toHaveLength(0);
      });
    });

    describe('changeBankAccount', () => {
      it('should update bank account', () => {
        seller.changeBankAccount('VIETCOMBANK987654321');
        expect(seller.bankAccount).toBe('VIETCOMBANK987654321');
      });

      it('should throw error on invalid bank account (too short)', () => {
        expect(() => seller.changeBankAccount('ABC')).toThrow(
          'Invalid bank account number',
        );
      });

      it('should throw error on empty bank account', () => {
        expect(() => seller.changeBankAccount('')).toThrow(
          'Invalid bank account number',
        );
      });

      it('should allow minimum valid length (5)', () => {
        expect(() => seller.changeBankAccount('12345')).not.toThrow();
        expect(seller.bankAccount).toBe('12345');
      });
    });

    describe('verify/unverify', () => {
      it('should mark seller as verified', () => {
        expect(seller.isVerified).toBe(false);
        seller.verify();
        expect(seller.isVerified).toBe(true);
      });

      it('should mark seller as unverified', () => {
        seller.verify();
        expect(seller.isVerified).toBe(true);
        seller.unverify();
        expect(seller.isVerified).toBe(false);
      });
    });

    describe('updateRating', () => {
      it('should update rating', () => {
        seller.updateRating(4.8);
        expect(seller.rating).toBe(4.8);
      });

      it('should throw error on rating < 0', () => {
        expect(() => seller.updateRating(-1)).toThrow(
          'Rating must be between 0 and 5',
        );
      });

      it('should throw error on rating > 5', () => {
        expect(() => seller.updateRating(5.1)).toThrow(
          'Rating must be between 0 and 5',
        );
      });

      it('should accept rating 0', () => {
        expect(() => seller.updateRating(0)).not.toThrow();
        expect(seller.rating).toBe(0);
      });

      it('should accept rating 5', () => {
        expect(() => seller.updateRating(5)).not.toThrow();
        expect(seller.rating).toBe(5);
      });
    });

    describe('changeTaxId', () => {
      it('should update tax ID with valid format', () => {
        seller.changeTaxId('9876543210');
        expect(seller.taxId).toBe('9876543210');
      });

      it('should throw error on invalid tax ID format', () => {
        expect(() => seller.changeTaxId('ABC123')).toThrow(
          'Invalid Vietnam tax ID format (must be 10 digits)',
        );
      });

      it('should throw error on tax ID with less than 10 digits', () => {
        expect(() => seller.changeTaxId('123456789')).toThrow();
      });

      it('should throw error on tax ID with more than 10 digits', () => {
        expect(() => seller.changeTaxId('12345678901')).toThrow();
      });

      it('should throw error on empty tax ID', () => {
        expect(() => seller.changeTaxId('')).toThrow();
      });

      it('should trim whitespace', () => {
        seller.changeTaxId('  1234567890  ');
        expect(seller.taxId).toBe('1234567890');
      });
    });

    describe('changeBusinessLicense', () => {
      it('should update business license', () => {
        seller.changeBusinessLicense('BL987654321');
        expect(seller.businessLicense).toBe('BL987654321');
      });

      it('should throw error on empty license', () => {
        expect(() => seller.changeBusinessLicense('')).toThrow(
          'Business license cannot be empty',
        );
      });

      it('should trim whitespace', () => {
        seller.changeBusinessLicense('  BL123456  ');
        expect(seller.businessLicense).toBe('BL123456');
      });
    });
  });

  describe('Buyer', () => {
    let buyer: Buyer;

    beforeEach(() => {
      buyer = new Buyer(
        'buyer-1',
        'buyer@email.com',
        'Jane Buyer',
        '0987654321',
        true,
        new Date('2024-01-01'),
        new Date('2024-01-01'),
        BuyerType.INDIVIDUAL,
        [testAddress],
        100,
      );
    });

    describe('getters', () => {
      it('should return buyerType', () => {
        expect(buyer.buyerType).toBe(BuyerType.INDIVIDUAL);
      });

      it('should return loyaltyPoints', () => {
        expect(buyer.loyaltyPoints).toBe(100);
      });

      it('should return addresses', () => {
        expect(buyer.addresses).toEqual([testAddress]);
      });
    });

    describe('addLoyaltyPoints', () => {
      it('should add loyalty points', () => {
        buyer.addLoyaltyPoints(50);
        expect(buyer.loyaltyPoints).toBe(150);
      });

      it('should throw error on negative points', () => {
        expect(() => buyer.addLoyaltyPoints(-10)).toThrow(
          'Points must be greater than 0',
        );
      });

      it('should throw error on zero points', () => {
        expect(() => buyer.addLoyaltyPoints(0)).toThrow(
          'Points must be greater than 0',
        );
      });

      it('should allow multiple additions', () => {
        buyer.addLoyaltyPoints(50);
        buyer.addLoyaltyPoints(25);
        expect(buyer.loyaltyPoints).toBe(175);
      });
    });

    describe('redeemLoyaltyPoints', () => {
      it('should redeem loyalty points', () => {
        buyer.redeemLoyaltyPoints(50);
        expect(buyer.loyaltyPoints).toBe(50);
      });

      it('should throw error when redeeming more than available', () => {
        expect(() => buyer.redeemLoyaltyPoints(150)).toThrow(
          'Insufficient loyalty points. Available: 100',
        );
      });

      it('should throw error on negative points', () => {
        expect(() => buyer.redeemLoyaltyPoints(-10)).toThrow(
          'Points must be greater than 0',
        );
      });

      it('should throw error on zero points', () => {
        expect(() => buyer.redeemLoyaltyPoints(0)).toThrow(
          'Points must be greater than 0',
        );
      });

      it('should allow redeeming exact amount', () => {
        expect(() => buyer.redeemLoyaltyPoints(100)).not.toThrow();
        expect(buyer.loyaltyPoints).toBe(0);
      });
    });

    describe('changeBuyerType', () => {
      it('should change buyer type', () => {
        buyer.changeBuyerType(BuyerType.WHOLESALER);
        expect(buyer.buyerType).toBe(BuyerType.WHOLESALER);
      });

      it('should support all buyer types', () => {
        const types = [BuyerType.INDIVIDUAL, BuyerType.WHOLESALER, BuyerType.RESTAURANT];
        for (const type of types) {
          buyer.changeBuyerType(type);
          expect(buyer.buyerType).toBe(type);
        }
      });
    });

    describe('changeCompanyName', () => {
      it('should set company name', () => {
        buyer.changeCompanyName('ABC Corp');
        expect(buyer.companyName).toBe('ABC Corp');
      });

      it('should clear company name', () => {
        buyer.changeCompanyName('ABC Corp');
        buyer.changeCompanyName(undefined);
        expect(buyer.companyName).toBeUndefined();
      });

      it('should trim whitespace', () => {
        buyer.changeCompanyName('  XYZ Ltd  ');
        expect(buyer.companyName).toBe('XYZ Ltd');
      });
    });

    describe('changeTaxId', () => {
      it('should set tax ID', () => {
        buyer.changeTaxId('1234567890');
        expect(buyer.taxId).toBe('1234567890');
      });

      it('should clear tax ID', () => {
        buyer.changeTaxId('1234567890');
        buyer.changeTaxId(undefined);
        expect(buyer.taxId).toBeUndefined();
      });
    });

    describe('changeBusinessLicense', () => {
      it('should set business license', () => {
        buyer.changeBusinessLicense('BL123456789');
        expect(buyer.businessLicense).toBe('BL123456789');
      });

      it('should clear business license', () => {
        buyer.changeBusinessLicense('BL123456789');
        buyer.changeBusinessLicense(undefined);
        expect(buyer.businessLicense).toBeUndefined();
      });
    });
  });

  describe('Admin', () => {
    let admin: Admin;

    beforeEach(() => {
      admin = new Admin(
        'admin-1',
        'admin@marketplace.com',
        'Admin User',
        '0912345678',
        true,
        new Date('2024-01-01'),
        new Date('2024-01-01'),
        UserRole.ADMIN,
        SubAdminRole.SUPER_ADMIN,
      );
    });

    describe('getters', () => {
      it('should return role', () => {
        expect(admin.role).toBe(UserRole.ADMIN);
      });

      it('should return subRole', () => {
        expect(admin.subRole).toBe(SubAdminRole.SUPER_ADMIN);
      });
    });

    describe('changeRole', () => {
      it('should change role', () => {
        admin.changeRole(UserRole.SELLER);
        expect(admin.role).toBe(UserRole.SELLER);
      });

      it('should support all admin roles', () => {
        const roles = [UserRole.ADMIN, UserRole.SELLER, UserRole.BUYER];
        for (const role of roles) {
          admin.changeRole(role);
          expect(admin.role).toBe(role);
        }
      });
    });

    describe('changeSubRole', () => {
      it('should change sub role', () => {
        admin.changeSubRole(SubAdminRole.TECHNICIAN);
        expect(admin.subRole).toBe(SubAdminRole.TECHNICIAN);
      });

      it('should support all sub admin roles', () => {
        const subRoles = [
          SubAdminRole.SUPER_ADMIN,
          SubAdminRole.TECHNICIAN,
          SubAdminRole.WAREHOUSE_MANAGER,
          SubAdminRole.FINANCE_STAFF,
          SubAdminRole.CONTENT_MANAGER,
          SubAdminRole.CUSTOMER_SUPPORT,
        ];
        for (const subRole of subRoles) {
          admin.changeSubRole(subRole);
          expect(admin.subRole).toBe(subRole);
        }
      });
    });
  });

  describe('Common User Methods', () => {
    let seller: Seller;

    beforeEach(() => {
      seller = new Seller(
        'seller-1',
        'seller@farm.com',
        'John Farmer',
        '0912345678',
        true,
        new Date('2024-01-01'),
        new Date('2024-01-01'),
        'Green Valley Farm',
        [],
        '1234567890',
        'BL123456789',
        'BIDV123456789',
        false,
        4.5,
      );
    });

    describe('changeEmail', () => {
      it('should change email with valid format', () => {
        seller.changeEmail('newemail@farm.com');
        expect(seller.email).toBe('newemail@farm.com');
      });

      it('should throw error on invalid email format', () => {
        expect(() => seller.changeEmail('invalid-email')).toThrow(
          'Invalid email address',
        );
      });

      it('should throw error on empty email', () => {
        expect(() => seller.changeEmail('')).toThrow('Invalid email address');
      });

      it('should accept various valid email formats', () => {
        const validEmails = [
          'test@example.com',
          'user.name@domain.co.uk',
          'user+tag@example.org',
          'test123@test-domain.com',
        ];
        for (const email of validEmails) {
          expect(() => seller.changeEmail(email)).not.toThrow();
          expect(seller.email).toBe(email);
        }
      });
    });

    describe('changeFullName', () => {
      it('should change full name', () => {
        seller.changeFullName('Jane Farmer');
        expect(seller.fullName).toBe('Jane Farmer');
      });

      it('should throw error on empty name', () => {
        expect(() => seller.changeFullName('')).toThrow(
          'Full name cannot be empty',
        );
      });

      it('should trim whitespace', () => {
        seller.changeFullName('  John Smith  ');
        expect(seller.fullName).toBe('John Smith');
      });
    });

    describe('changePhoneNumber', () => {
      it('should change phone number with valid Vietnamese format', () => {
        seller.changePhoneNumber('0912345678');
        expect(seller.phoneNumber).toBe('0912345678');
      });

      it('should accept +84 format', () => {
        seller.changePhoneNumber('+84912345678');
        expect(seller.phoneNumber).toBe('+84912345678');
      });

      it('should throw error on invalid format', () => {
        expect(() => seller.changePhoneNumber('123456')).toThrow(
          'Invalid phone number format',
        );
      });

      it('should throw error on non-phone characters', () => {
        expect(() => seller.changePhoneNumber('phone-number')).toThrow(
          'Invalid phone number format',
        );
      });

      it('should reject phone numbers not starting with 0 or +84', () => {
        expect(() => seller.changePhoneNumber('5912345678')).toThrow();
      });
    });

    describe('activate/deactivate', () => {
      it('should activate user', () => {
        seller = new Seller(
          'seller-1',
          'seller@farm.com',
          'John Farmer',
          '0912345678',
          false, // inactive
          new Date('2024-01-01'),
          new Date('2024-01-01'),
          'Green Valley Farm',
          [],
          '1234567890',
          'BL123456789',
          'BIDV123456789',
          false,
          4.5,
        );
        expect(seller.isActive).toBe(false);
        seller.activate();
        expect(seller.isActive).toBe(true);
      });

      it('should deactivate user', () => {
        expect(seller.isActive).toBe(true);
        seller.deactivate();
        expect(seller.isActive).toBe(false);
      });

      it('should not double-activate', () => {
        seller.activate();
        expect(seller.isActive).toBe(true);
        seller.activate();
        expect(seller.isActive).toBe(true);
      });

      it('should not double-deactivate', () => {
        seller.deactivate();
        expect(seller.isActive).toBe(false);
        seller.deactivate();
        expect(seller.isActive).toBe(false);
      });
    });
  });
});
