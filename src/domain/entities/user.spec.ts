// src/domain/entities/user.spec.ts
import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  User,
  SellerProfile,
  BuyerProfile,
  AdminProfile,
  ShipperProfile,
} from './user';
import { UserRole, SubAdminRole, BuyerType, VehicleType } from './enums.enum';
import {
  Country,
  AdministrativeDivision,
  Address,
} from './value-objects/address';

describe('User Domain Entity (Composition Version)', () => {
  let testCountry: Country;
  let testProvince: AdministrativeDivision;
  let testAddress: Address;
  let testArea: AdministrativeDivision;

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
    testArea = new AdministrativeDivision(testCountry, 3, 'D1', 'District 1');
  });

  describe('User', () => {
    describe('factory methods', () => {
      it('should create a Seller user', () => {
        const user = User.createSeller({
          email: 'seller@farm.com',
          fullName: 'John Farmer',
          phoneNumber: '0912345678',
          farmName: 'Green Valley Farm',
          addresses: [testAddress],
          taxId: '1234567890',
          businessLicense: 'BL123456',
          bankAccount: 'BIDV123456789',
        });

        expect(user.id).toBeDefined();
        expect(user.email).toBe('seller@farm.com');
        expect(user.fullName).toBe('John Farmer');
        expect(user.phoneNumber).toBe('0912345678');
        expect(user.isActive).toBe(true);
        expect(user.roles).toContain(UserRole.SELLER);
        expect(user.sellerProfile).toBeDefined();
        expect(user.buyerProfile).toBeUndefined();
        expect(user.adminProfile).toBeUndefined();
        expect(user.shipperProfile).toBeUndefined();
        expect(user.createdAt).toBeInstanceOf(Date);
        expect(user.updatedAt).toBeInstanceOf(Date);
      });

      it('should create a Buyer user', () => {
        const user = User.createBuyer({
          email: 'buyer@email.com',
          fullName: 'Jane Buyer',
          phoneNumber: '0987654321',
          buyerType: BuyerType.INDIVIDUAL,
          addresses: [testAddress],
        });

        expect(user.id).toBeDefined();
        expect(user.email).toBe('buyer@email.com');
        expect(user.fullName).toBe('Jane Buyer');
        expect(user.phoneNumber).toBe('0987654321');
        expect(user.isActive).toBe(true);
        expect(user.roles).toContain(UserRole.BUYER);
        expect(user.buyerProfile).toBeDefined();
        expect(user.sellerProfile).toBeUndefined();
        expect(user.adminProfile).toBeUndefined();
        expect(user.shipperProfile).toBeUndefined();
      });

      it('should create an Admin user', () => {
        const user = User.createAdmin({
          email: 'admin@marketplace.com',
          fullName: 'Admin User',
          phoneNumber: '0912345678',
          subRole: SubAdminRole.SUPER_ADMIN,
        });

        expect(user.id).toBeDefined();
        expect(user.email).toBe('admin@marketplace.com');
        expect(user.fullName).toBe('Admin User');
        expect(user.phoneNumber).toBe('0912345678');
        expect(user.isActive).toBe(true);
        expect(user.roles).toContain(UserRole.ADMIN);
        expect(user.adminProfile).toBeDefined();
        expect(user.sellerProfile).toBeUndefined();
        expect(user.buyerProfile).toBeUndefined();
        expect(user.shipperProfile).toBeUndefined();
        expect(user.adminProfile?.subRole).toBe(SubAdminRole.SUPER_ADMIN);
      });

      it('should create a Shipper user', () => {
        const user = User.createShipper({
          email: 'shipper@delivery.com',
          fullName: 'Shipper Name',
          phoneNumber: '0912345678',
          vehicleType: VehicleType.MOTORBIKE,
          licensePlate: '59X1-12345',
          driverLicense: 'DL123456',
          vehicleDescription: 'Honda Wave',
          operatingAreas: [testArea],
        });

        expect(user.id).toBeDefined();
        expect(user.email).toBe('shipper@delivery.com');
        expect(user.fullName).toBe('Shipper Name');
        expect(user.phoneNumber).toBe('0912345678');
        expect(user.isActive).toBe(true);
        expect(user.roles).toContain(UserRole.SHIPPER);
        expect(user.shipperProfile).toBeDefined();
        expect(user.sellerProfile).toBeUndefined();
        expect(user.buyerProfile).toBeUndefined();
        expect(user.adminProfile).toBeUndefined();
        expect(user.shipperProfile?.vehicleType).toBe(VehicleType.MOTORBIKE);
        expect(user.shipperProfile?.licensePlate).toBe('59X1-12345');
      });
    });

    describe('common behaviors', () => {
      let user: User;

      beforeEach(() => {
        user = User.createSeller({
          email: 'seller@farm.com',
          fullName: 'John Farmer',
          phoneNumber: '0912345678',
          farmName: 'Green Valley Farm',
          addresses: [testAddress],
          taxId: '1234567890',
          businessLicense: 'BL123456',
          bankAccount: 'BIDV123456789',
        });
      });

      describe('changeEmail', () => {
        it('should change email with valid format', () => {
          user.changeEmail('newemail@farm.com');
          expect(user.email).toBe('newemail@farm.com');
        });

        it('should throw error on invalid email format', () => {
          expect(() => user.changeEmail('invalid-email')).toThrow(
            'Invalid email address',
          );
        });

        it('should throw error on empty email', () => {
          expect(() => user.changeEmail('')).toThrow('Invalid email address');
        });
      });

      describe('changeFullName', () => {
        it('should change full name', () => {
          user.changeFullName('Jane Farmer');
          expect(user.fullName).toBe('Jane Farmer');
        });

        it('should throw error on empty name', () => {
          expect(() => user.changeFullName('')).toThrow(
            'Full name cannot be empty',
          );
        });

        it('should trim whitespace', () => {
          user.changeFullName('  John Smith  ');
          expect(user.fullName).toBe('John Smith');
        });
      });

      describe('changePhoneNumber', () => {
        it('should change phone number with valid Vietnamese format', () => {
          user.changePhoneNumber('0912345678');
          expect(user.phoneNumber).toBe('0912345678');
        });

        it('should accept +84 format', () => {
          user.changePhoneNumber('+84912345678');
          expect(user.phoneNumber).toBe('+84912345678');
        });

        it('should throw error on invalid format', () => {
          expect(() => user.changePhoneNumber('123456')).toThrow(
            'Invalid phone number',
          );
        });
      });

      describe('activate/deactivate', () => {
        it('should activate user', () => {
          user.deactivate();
          expect(user.isActive).toBe(false);
          user.activate();
          expect(user.isActive).toBe(true);
        });

        it('should deactivate user', () => {
          expect(user.isActive).toBe(true);
          user.deactivate();
          expect(user.isActive).toBe(false);
        });

        it('should not double-activate', () => {
          user.activate();
          expect(user.isActive).toBe(true);
        });

        it('should not double-deactivate', () => {
          user.deactivate();
          user.deactivate();
          expect(user.isActive).toBe(false);
        });
      });

      it('should update updatedAt on changes', () => {
        const oldUpdatedAt = user.updatedAt;
        user.changeFullName('New Name');
        expect(user.updatedAt.getTime()).toBeGreaterThanOrEqual(
          oldUpdatedAt.getTime(),
        );
      });
    });

    describe('role management', () => {
      let user: User;

      beforeEach(() => {
        user = User.createBuyer({
          email: 'buyer@email.com',
          fullName: 'Jane Buyer',
          phoneNumber: '0987654321',
          buyerType: BuyerType.INDIVIDUAL,
          addresses: [testAddress],
        });
      });

      it('should have initial role from factory', () => {
        expect(user.hasRole(UserRole.BUYER)).toBe(true);
        expect(user.hasRole(UserRole.SELLER)).toBe(false);
        expect(user.roles).toEqual([UserRole.BUYER]);
      });

      it('should add a new role via profile', () => {
        const sellerProfile = new SellerProfile(
          'New Farm',
          [],
          '1234567890',
          'BL123456',
          'BIDV123456',
        );
        user.addSellerProfile(sellerProfile);
        expect(user.hasRole(UserRole.SELLER)).toBe(true);
        expect(user.roles).toContain(UserRole.BUYER);
        expect(user.roles).toContain(UserRole.SELLER);
        expect(user.sellerProfile).toBeDefined();
      });

      it('should throw error when adding duplicate role', () => {
        const buyerProfile = new BuyerProfile(BuyerType.WHOLESALER, []);
        expect(() => user.addBuyerProfile(buyerProfile)).toThrow(
          'Buyer profile already exists',
        );
      });

      it('should remove a role', () => {
        user.removeRole(UserRole.BUYER);
        expect(user.hasRole(UserRole.BUYER)).toBe(false);
        expect(user.buyerProfile).toBeUndefined();
        expect(user.roles).toEqual([]);
      });

      it('should not remove non-existent role', () => {
        user.removeRole(UserRole.SELLER);
        expect(user.roles).toEqual([UserRole.BUYER]);
      });

      it('should allow adding multiple roles', () => {
        const sellerProfile = new SellerProfile(
          'New Farm',
          [],
          '1234567890',
          'BL123456',
          'BIDV123456',
        );
        user.addSellerProfile(sellerProfile);
        const adminProfile = new AdminProfile(SubAdminRole.TECHNICIAN);
        user.addAdminProfile(adminProfile);
        const shipperProfile = new ShipperProfile(
          VehicleType.VAN,
          '60Y2-67890',
          'DL654321',
        );
        user.addShipperProfile(shipperProfile);

        expect(user.roles).toContain(UserRole.BUYER);
        expect(user.roles).toContain(UserRole.SELLER);
        expect(user.roles).toContain(UserRole.ADMIN);
        expect(user.roles).toContain(UserRole.SHIPPER);
        expect(user.sellerProfile).toBeDefined();
        expect(user.adminProfile).toBeDefined();
        expect(user.shipperProfile).toBeDefined();
      });
    });

    describe('profile accessors', () => {
      let user: User;

      beforeEach(() => {
        user = User.createSeller({
          email: 'seller@farm.com',
          fullName: 'John Farmer',
          phoneNumber: '0912345678',
          farmName: 'Green Valley Farm',
          addresses: [testAddress],
          taxId: '1234567890',
          businessLicense: 'BL123456',
          bankAccount: 'BIDV123456789',
        });
      });

      it('should return seller profile', () => {
        expect(user.sellerProfile).toBeDefined();
        expect(user.sellerProfile?.farmName).toBe('Green Valley Farm');
        expect(user.buyerProfile).toBeUndefined();
        expect(user.adminProfile).toBeUndefined();
        expect(user.shipperProfile).toBeUndefined();
      });
    });
  });

  describe('SellerProfile', () => {
    let profile: SellerProfile;

    beforeEach(() => {
      profile = new SellerProfile(
        'Green Valley Farm',
        [testAddress],
        '1234567890',
        'BL123456',
        'BIDV123456789',
        false, // isVerified
        4.5,
      );
    });

    describe('getters', () => {
      it('should return farmName', () => {
        expect(profile.farmName).toBe('Green Valley Farm');
      });

      it('should return addresses', () => {
        expect(profile.addresses).toEqual([testAddress]);
        // Ensure immutability: returns a copy
        expect(profile.addresses).not.toBe(profile.addresses);
      });

      it('should return taxId', () => {
        expect(profile.taxId).toBe('1234567890');
      });

      it('should return businessLicense', () => {
        expect(profile.businessLicense).toBe('BL123456');
      });

      it('should return bankAccount', () => {
        expect(profile.bankAccount).toBe('BIDV123456789');
      });

      it('should return isVerified', () => {
        expect(profile.isVerified).toBe(false);
      });

      it('should return rating', () => {
        expect(profile.rating).toBe(4.5);
      });
    });

    describe('changeFarmName', () => {
      it('should update farm name', () => {
        profile.changeFarmName('New Farm');
        expect(profile.farmName).toBe('New Farm');
      });

      it('should throw error on empty farm name', () => {
        expect(() => profile.changeFarmName('')).toThrow(
          'Farm name cannot be empty',
        );
      });

      it('should trim whitespace', () => {
        profile.changeFarmName('  Trimmed Farm  ');
        expect(profile.farmName).toBe('Trimmed Farm');
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
        profile.updateAddresses([newAddress]);
        expect(profile.addresses).toEqual([newAddress]);
      });

      it('should allow empty array', () => {
        profile.updateAddresses([]);
        expect(profile.addresses).toHaveLength(0);
      });
    });

    describe('changeBankAccount', () => {
      it('should update bank account', () => {
        profile.changeBankAccount('VIETCOMBANK987654321');
        expect(profile.bankAccount).toBe('VIETCOMBANK987654321');
      });

      it('should throw error on invalid bank account (too short)', () => {
        expect(() => profile.changeBankAccount('ABC')).toThrow(
          'Invalid bank account number',
        );
      });
    });

    describe('changeTaxId', () => {
      it('should update tax ID with valid format', () => {
        profile.changeTaxId('9876543210');
        expect(profile.taxId).toBe('9876543210');
      });

      it('should throw error on invalid tax ID format', () => {
        expect(() => profile.changeTaxId('ABC123')).toThrow(
          'Invalid Vietnam tax ID (10 digits)',
        );
      });
    });

    describe('changeBusinessLicense', () => {
      it('should update business license', () => {
        profile.changeBusinessLicense('BL987654321');
        expect(profile.businessLicense).toBe('BL987654321');
      });

      it('should throw error on empty license', () => {
        expect(() => profile.changeBusinessLicense('')).toThrow(
          'Business license cannot be empty',
        );
      });
    });

    describe('verify/unverify', () => {
      it('should verify seller', () => {
        expect(profile.isVerified).toBe(false);
        profile.verify();
        expect(profile.isVerified).toBe(true);
      });

      it('should unverify seller', () => {
        profile.verify();
        profile.unverify();
        expect(profile.isVerified).toBe(false);
      });
    });

    describe('updateRating', () => {
      it('should update rating', () => {
        profile.updateRating(4.8);
        expect(profile.rating).toBe(4.8);
      });

      it('should throw error on rating < 0', () => {
        expect(() => profile.updateRating(-1)).toThrow(
          'Rating must be between 0 and 5',
        );
      });

      it('should throw error on rating > 5', () => {
        expect(() => profile.updateRating(5.1)).toThrow(
          'Rating must be between 0 and 5',
        );
      });
    });
  });

  describe('BuyerProfile', () => {
    let profile: BuyerProfile;

    beforeEach(() => {
      profile = new BuyerProfile(
        BuyerType.INDIVIDUAL,
        [testAddress],
        100,
        undefined,
        undefined,
        undefined,
      );
    });

    describe('getters', () => {
      it('should return buyerType', () => {
        expect(profile.buyerType).toBe(BuyerType.INDIVIDUAL);
      });

      it('should return addresses', () => {
        expect(profile.addresses).toEqual([testAddress]);
      });

      it('should return loyaltyPoints', () => {
        expect(profile.loyaltyPoints).toBe(100);
      });

      it('should return optional fields as undefined', () => {
        expect(profile.taxId).toBeUndefined();
        expect(profile.companyName).toBeUndefined();
        expect(profile.businessLicense).toBeUndefined();
      });
    });

    describe('addLoyaltyPoints', () => {
      it('should add loyalty points', () => {
        profile.addLoyaltyPoints(50);
        expect(profile.loyaltyPoints).toBe(150);
      });

      it('should throw error on negative points', () => {
        expect(() => profile.addLoyaltyPoints(-10)).toThrow(
          'Points must be greater than 0',
        );
      });

      it('should throw error on zero points', () => {
        expect(() => profile.addLoyaltyPoints(0)).toThrow(
          'Points must be greater than 0',
        );
      });
    });

    describe('redeemLoyaltyPoints', () => {
      it('should redeem loyalty points', () => {
        profile.redeemLoyaltyPoints(50);
        expect(profile.loyaltyPoints).toBe(50);
      });

      it('should throw error when redeeming more than available', () => {
        expect(() => profile.redeemLoyaltyPoints(150)).toThrow(
          'Insufficient points. Available: 100',
        );
      });

      it('should throw error on negative points', () => {
        expect(() => profile.redeemLoyaltyPoints(-10)).toThrow(
          'Points must be greater than 0',
        );
      });
    });

    describe('changeBuyerType', () => {
      it('should change buyer type', () => {
        profile.changeBuyerType(BuyerType.WHOLESALER);
        expect(profile.buyerType).toBe(BuyerType.WHOLESALER);
      });
    });

    describe('optional fields', () => {
      it('should set company name', () => {
        profile.changeCompanyName('ABC Corp');
        expect(profile.companyName).toBe('ABC Corp');
      });

      it('should clear company name', () => {
        profile.changeCompanyName('ABC Corp');
        profile.changeCompanyName(undefined);
        expect(profile.companyName).toBeUndefined();
      });

      it('should set tax ID', () => {
        profile.changeTaxId('1234567890');
        expect(profile.taxId).toBe('1234567890');
      });

      it('should set business license', () => {
        profile.changeBusinessLicense('BL123456');
        expect(profile.businessLicense).toBe('BL123456');
      });
    });
  });

  // ============================================================
  // 4. ADMIN PROFILE TESTS
  // ============================================================
  describe('AdminProfile', () => {
    it('should create with subRole', () => {
      const profile = new AdminProfile(SubAdminRole.SUPER_ADMIN);
      expect(profile.subRole).toBe(SubAdminRole.SUPER_ADMIN);
    });

    it('should change subRole', () => {
      const profile = new AdminProfile(SubAdminRole.SUPER_ADMIN);
      profile.changeSubRole(SubAdminRole.TECHNICIAN);
      expect(profile.subRole).toBe(SubAdminRole.TECHNICIAN);
    });
  });

  describe('ShipperProfile', () => {
    let profile: ShipperProfile;

    beforeEach(() => {
      profile = new ShipperProfile(
        VehicleType.MOTORBIKE,
        '59X1-12345',
        'DL123456',
        'Honda Wave',
        [testArea],
        true,
        10.8231,
        106.6297,
        null,
        0,
      );
    });

    describe('getters', () => {
      it('should return vehicleType', () => {
        expect(profile.vehicleType).toBe(VehicleType.MOTORBIKE);
      });

      it('should return licensePlate', () => {
        expect(profile.licensePlate).toBe('59X1-12345');
      });

      it('should return driverLicense', () => {
        expect(profile.driverLicense).toBe('DL123456');
      });

      it('should return vehicleDescription', () => {
        expect(profile.vehicleDescription).toBe('Honda Wave');
      });

      it('should return operatingAreas', () => {
        expect(profile.operatingAreas).toEqual([testArea]);
      });

      it('should return isAvailable', () => {
        expect(profile.isAvailable).toBe(true);
      });

      it('should return currentLocation', () => {
        expect(profile.currentLocation).toEqual({
          lat: 10.8231,
          lng: 106.6297,
        });
      });

      it('should return rating', () => {
        expect(profile.rating).toBeNull();
      });

      it('should return totalDeliveries', () => {
        expect(profile.totalDeliveries).toBe(0);
      });
    });

    describe('updateVehicle', () => {
      it('should update vehicle information', () => {
        profile.updateVehicle(
          VehicleType.VAN,
          '60Y2-67890',
          'DL654321',
          'Ford Transit',
        );
        expect(profile.vehicleType).toBe(VehicleType.VAN);
        expect(profile.licensePlate).toBe('60Y2-67890');
        expect(profile.driverLicense).toBe('DL654321');
        expect(profile.vehicleDescription).toBe('Ford Transit');
      });

      it('should set vehicleDescription to null if not provided', () => {
        profile.updateVehicle(VehicleType.TRUCK, '70Z3-11111', 'DL111111');
        expect(profile.vehicleDescription).toBeNull();
      });
    });

    describe('operating areas', () => {
      it('should add a new area', () => {
        const newArea = new AdministrativeDivision(
          testCountry,
          3,
          'D2',
          'District 2',
        );
        profile.addOperatingArea(newArea);
        expect(profile.operatingAreas).toContain(newArea);
      });

      it('should not add duplicate area', () => {
        // Need to compare by value, assuming AdministrativeDivision has equals method
        // For simplicity, we assume it works.
        profile.addOperatingArea(testArea);
        // Since it's a duplicate, count should remain 1
        expect(
          profile.operatingAreas.filter((a) => a === testArea).length,
        ).toBe(1);
      });

      it('should remove an area', () => {
        profile.removeOperatingArea(testArea);
        expect(profile.operatingAreas).not.toContain(testArea);
      });
    });

    describe('updateLocation', () => {
      it('should update location', () => {
        profile.updateLocation(20.0, 105.0);
        expect(profile.currentLocation).toEqual({ lat: 20.0, lng: 105.0 });
      });
    });

    describe('availability', () => {
      it('should set available', () => {
        profile.setUnavailable();
        expect(profile.isAvailable).toBe(false);
        profile.setAvailable();
        expect(profile.isAvailable).toBe(true);
      });

      it('should set unavailable', () => {
        profile.setUnavailable();
        expect(profile.isAvailable).toBe(false);
      });
    });

    describe('updateRating', () => {
      it('should calculate average rating for first delivery', () => {
        profile.updateRating(4.5);
        expect(profile.rating).toBe(4.5);
        expect(profile.totalDeliveries).toBe(1);
      });

      it('should calculate average rating for multiple deliveries', () => {
        profile.updateRating(4);
        profile.updateRating(5);
        // (4*1 + 5) / (1+1) = 4.5
        expect(profile.rating).toBe(4.5);
        expect(profile.totalDeliveries).toBe(2);
      });

      it('should throw error on rating out of range', () => {
        expect(() => profile.updateRating(0)).toThrow(
          'Rating must be between 1 and 5',
        );
        expect(() => profile.updateRating(6)).toThrow(
          'Rating must be between 1 and 5',
        );
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should allow a user to be both Seller and Buyer', () => {
      const user = User.createSeller({
        email: 'user@example.com',
        fullName: 'John Doe',
        phoneNumber: '0912345678',
        farmName: 'Farm',
        addresses: [],
        taxId: '1234567890',
        businessLicense: 'BL123',
        bankAccount: 'BIDV123',
      });
      const buyerProfile = new BuyerProfile(BuyerType.INDIVIDUAL, [], 0);
      user.addBuyerProfile(buyerProfile);
      expect(user.hasRole(UserRole.SELLER)).toBe(true);
      expect(user.hasRole(UserRole.BUYER)).toBe(true);
      expect(user.sellerProfile).toBeDefined();
      expect(user.buyerProfile).toBeDefined();
    });

    it('should allow a user to have all roles', () => {
      const user = User.createAdmin({
        email: 'admin@example.com',
        fullName: 'Admin',
        phoneNumber: '0912345678',
        subRole: SubAdminRole.SUPER_ADMIN,
      });
      user.addSellerProfile(
        new SellerProfile('Farm', [], '1234567890', 'BL123', 'BIDV123'),
      );
      user.addBuyerProfile(new BuyerProfile(BuyerType.INDIVIDUAL, []));
      user.addShipperProfile(
        new ShipperProfile(VehicleType.MOTORBIKE, '59X1-12345', 'DL123456'),
      );
      expect(user.roles).toEqual([
        UserRole.ADMIN,
        UserRole.SELLER,
        UserRole.BUYER,
        UserRole.SHIPPER,
      ]);
    });

    it('should update profile and user updatedAt', () => {
      const user = User.createSeller({
        email: 'seller@farm.com',
        fullName: 'John Farmer',
        phoneNumber: '0912345678',
        farmName: 'Green Valley Farm',
        addresses: [],
        taxId: '1234567890',
        businessLicense: 'BL123456',
        bankAccount: 'BIDV123456789',
      });
      const oldUpdatedAt = user.updatedAt;
      user.sellerProfile?.changeFarmName('New Farm');
      // Touching user still works
      user.changeFullName('New Name');
      expect(user.updatedAt.getTime()).toBeGreaterThanOrEqual(
        oldUpdatedAt.getTime(),
      );
    });
  });

  describe('Edge Cases', () => {
    it('should create buyer with optional fields', () => {
      const user = User.createBuyer({
        email: 'buyer@example.com',
        fullName: 'Buyer',
        phoneNumber: '0912345678',
        buyerType: BuyerType.WHOLESALER,
        addresses: [],
        taxId: '1234567890',
        companyName: 'Company',
        businessLicense: 'BL123',
      });
      expect(user.buyerProfile?.taxId).toBe('1234567890');
      expect(user.buyerProfile?.companyName).toBe('Company');
      expect(user.buyerProfile?.businessLicense).toBe('BL123');
    });

    it('should handle empty operating areas for shipper', () => {
      const user = User.createShipper({
        email: 'shipper@example.com',
        fullName: 'Shipper',
        phoneNumber: '0912345678',
        vehicleType: VehicleType.MOTORBIKE,
        licensePlate: '59X1-12345',
        driverLicense: 'DL123456',
        operatingAreas: [],
      });
      expect(user.shipperProfile?.operatingAreas).toEqual([]);
    });

    it('should not add duplicate roles when adding profile with existing role', () => {
      const user = User.createSeller({
        email: 'seller@example.com',
        fullName: 'Seller',
        phoneNumber: '0912345678',
        farmName: 'Farm',
        addresses: [],
        taxId: '1234567890',
        businessLicense: 'BL123',
        bankAccount: 'BIDV123',
      });
      expect(user.roles).toEqual([UserRole.SELLER]);
      expect(() =>
        user.addSellerProfile(
          new SellerProfile('Farm2', [], '1234567890', 'BL123', 'BIDV123'),
        ),
      ).toThrow('Seller profile already exists');
    });
  });
});
