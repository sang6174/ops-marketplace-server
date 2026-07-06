// src/domain/entities/shipper.spec.ts
import { Shipper } from './user';
import { VehicleType } from './enums.enum';
import { Country, AdministrativeDivision } from './address';

describe('Shipper Domain Entity', () => {
  let testCountry: Country;
  let testProvince1: AdministrativeDivision;
  let testProvince2: AdministrativeDivision;

  beforeEach(() => {
    testCountry = new Country('VN', 'Vietnam');
    testProvince1 = new AdministrativeDivision(
      testCountry,
      2,
      'HCM',
      'Ho Chi Minh',
    );
    testProvince2 = new AdministrativeDivision(testCountry, 2, 'HN', 'Ha Noi');
  });

  describe('create', () => {
    it('should create a new Shipper with default values', () => {
      const userId = 'user-123';
      const vehicleType = VehicleType.MOTORBIKE;
      const licensePlate = '59X1-12345';
      const driverLicense = 'DL123456';
      const vehicleDescription = 'Honda Wave';

      const shipper = Shipper.create({
        userId,
        vehicleType,
        licensePlate,
        driverLicense,
        vehicleDescription,
        operatingAreas: [testProvince1, testProvince2],
      });

      expect(shipper.id).toBeDefined();
      expect(shipper.userId).toBe(userId);
      expect(shipper.vehicleType).toBe(vehicleType);
      expect(shipper.licensePlate).toBe(licensePlate);
      expect(shipper.driverLicense).toBe(driverLicense);
      expect(shipper.vehicleDescription).toBe(vehicleDescription);
      expect(shipper.operatingAreas).toEqual([testProvince1, testProvince2]);
      expect(shipper.isAvailable).toBe(true);
      expect(shipper.currentLocation).toEqual({ lat: null, lng: null });
      expect(shipper.rating).toBeNull();
      expect(shipper.totalDeliveries).toBe(0);
      expect(shipper.createdAt).toBeInstanceOf(Date);
      expect(shipper.updatedAt).toBeInstanceOf(Date);
      expect(shipper.deletedAt).toBeNull();
    });

    it('should set vehicleDescription to null if not provided', () => {
      const shipper = Shipper.create({
        userId: 'user-123',
        vehicleType: VehicleType.MOTORBIKE,
        licensePlate: '59X1-12345',
        driverLicense: 'DL123456',
        operatingAreas: [],
      });
      expect(shipper.vehicleDescription).toBeNull();
    });
  });

  describe('getters', () => {
    let shipper: Shipper;

    beforeEach(() => {
      shipper = Shipper.create({
        userId: 'user-123',
        vehicleType: VehicleType.MOTORBIKE,
        licensePlate: '59X1-12345',
        driverLicense: 'DL123456',
        vehicleDescription: 'Honda Wave',
        operatingAreas: [testProvince1],
      });
    });

    it('should return correct vehicleType', () => {
      expect(shipper.vehicleType).toBe(VehicleType.MOTORBIKE);
    });

    it('should return correct licensePlate', () => {
      expect(shipper.licensePlate).toBe('59X1-12345');
    });

    it('should return correct driverLicense', () => {
      expect(shipper.driverLicense).toBe('DL123456');
    });

    it('should return correct vehicleDescription', () => {
      expect(shipper.vehicleDescription).toBe('Honda Wave');
    });

    it('should return a copy of operatingAreas', () => {
      const areas = shipper.operatingAreas;
      expect(areas).toEqual([testProvince1]);
      // Ensure it's a copy (not same reference)
      expect(areas).not.toBe(shipper['_operatingAreas']);
    });

    it('should return isAvailable', () => {
      expect(shipper.isAvailable).toBe(true);
    });

    it('should return currentLocation', () => {
      expect(shipper.currentLocation).toEqual({ lat: null, lng: null });
    });

    it('should return rating', () => {
      expect(shipper.rating).toBeNull();
    });

    it('should return totalDeliveries', () => {
      expect(shipper.totalDeliveries).toBe(0);
    });

    it('should return updatedAt and deletedAt', () => {
      expect(shipper.updatedAt).toBeInstanceOf(Date);
      expect(shipper.deletedAt).toBeNull();
    });
  });

  describe('updateVehicle', () => {
    let shipper: Shipper;

    beforeEach(() => {
      shipper = Shipper.create({
        userId: 'user-123',
        vehicleType: VehicleType.MOTORBIKE,
        licensePlate: '59X1-12345',
        driverLicense: 'DL123456',
        vehicleDescription: 'Honda Wave',
        operatingAreas: [],
      });
    });

    it('should update vehicle information and touch updatedAt', () => {
      const oldUpdatedAt = shipper.updatedAt;
      // Wait a bit to ensure time difference
      jest.advanceTimersByTime(1);
      shipper.updateVehicle(
        VehicleType.VAN,
        '60Y2-67890',
        'DL654321',
        'Ford Transit',
      );

      expect(shipper.vehicleType).toBe(VehicleType.VAN);
      expect(shipper.licensePlate).toBe('60Y2-67890');
      expect(shipper.driverLicense).toBe('DL654321');
      expect(shipper.vehicleDescription).toBe('Ford Transit');
      expect(shipper.updatedAt).not.toBe(oldUpdatedAt);
      expect(shipper.updatedAt.getTime()).toBeGreaterThanOrEqual(
        oldUpdatedAt.getTime(),
      );
    });

    it('should set vehicleDescription to null if not provided', () => {
      shipper.updateVehicle(VehicleType.TRUCK, '70Z3-11111', 'DL111111');
      expect(shipper.vehicleDescription).toBeNull();
    });
  });

  describe('operating areas', () => {
    let shipper: Shipper;

    beforeEach(() => {
      shipper = Shipper.create({
        userId: 'user-123',
        vehicleType: VehicleType.MOTORBIKE,
        licensePlate: '59X1-12345',
        driverLicense: 'DL123456',
        operatingAreas: [testProvince1],
      });
    });

    describe('addOperatingArea', () => {
      it('should add a new area if not already present', () => {
        const oldUpdatedAt = shipper.updatedAt;
        shipper.addOperatingArea(testProvince2);
        expect(shipper.operatingAreas).toContain(testProvince2);
        expect(shipper.updatedAt.getTime()).toBeGreaterThan(
          oldUpdatedAt.getTime(),
        );
      });

      it('should not add duplicate area', () => {
        shipper.addOperatingArea(testProvince1);
        const areas = shipper.operatingAreas;
        expect(areas.filter((a) => a === testProvince1).length).toBe(1);
      });

      it('should not change updatedAt if area already exists', () => {
        const oldUpdatedAt = shipper.updatedAt;
        shipper.addOperatingArea(testProvince1);
        expect(shipper.updatedAt.getTime()).toBe(oldUpdatedAt.getTime());
      });
    });

    describe('removeOperatingArea', () => {
      it('should remove an existing area', () => {
        const oldUpdatedAt = shipper.updatedAt;
        shipper.removeOperatingArea(testProvince1);
        expect(shipper.operatingAreas).not.toContain(testProvince1);
        expect(shipper.updatedAt.getTime()).toBeGreaterThan(
          oldUpdatedAt.getTime(),
        );
      });

      it('should do nothing if area not present', () => {
        const oldUpdatedAt = shipper.updatedAt;
        shipper.removeOperatingArea(testProvince2);
        expect(shipper.operatingAreas).toEqual([testProvince1]);
        expect(shipper.updatedAt.getTime()).toBe(oldUpdatedAt.getTime());
      });
    });
  });

  describe('updateLocation', () => {
    let shipper: Shipper;

    beforeEach(() => {
      shipper = Shipper.create({
        userId: 'user-123',
        vehicleType: VehicleType.MOTORBIKE,
        licensePlate: '59X1-12345',
        driverLicense: 'DL123456',
        operatingAreas: [],
      });
    });

    it('should update current location and touch updatedAt', () => {
      const oldUpdatedAt = shipper.updatedAt;
      shipper.updateLocation(10.8231, 106.6297);
      expect(shipper.currentLocation).toEqual({ lat: 10.8231, lng: 106.6297 });
      expect(shipper.updatedAt.getTime()).toBeGreaterThan(
        oldUpdatedAt.getTime(),
      );
    });
  });

  describe('availability', () => {
    let shipper: Shipper;

    beforeEach(() => {
      shipper = Shipper.create({
        userId: 'user-123',
        vehicleType: VehicleType.MOTORBIKE,
        licensePlate: '59X1-12345',
        driverLicense: 'DL123456',
        operatingAreas: [],
      });
    });

    it('should set available to true by default', () => {
      expect(shipper.isAvailable).toBe(true);
    });

    it('setUnavailable should set isAvailable to false and touch updatedAt', () => {
      const oldUpdatedAt = shipper.updatedAt;
      shipper.setUnavailable();
      expect(shipper.isAvailable).toBe(false);
      expect(shipper.updatedAt.getTime()).toBeGreaterThan(
        oldUpdatedAt.getTime(),
      );
    });

    it('setAvailable should set isAvailable to true and touch updatedAt', () => {
      shipper.setUnavailable();
      const oldUpdatedAt = shipper.updatedAt;
      shipper.setAvailable();
      expect(shipper.isAvailable).toBe(true);
      expect(shipper.updatedAt.getTime()).toBeGreaterThan(
        oldUpdatedAt.getTime(),
      );
    });
  });

  describe('updateRating', () => {
    let shipper: Shipper;

    beforeEach(() => {
      shipper = Shipper.create({
        userId: 'user-123',
        vehicleType: VehicleType.MOTORBIKE,
        licensePlate: '59X1-12345',
        driverLicense: 'DL123456',
        operatingAreas: [],
      });
    });

    it('should throw error if rating out of range', () => {
      expect(() => shipper.updateRating(0)).toThrow(
        'Rating must be between 1 and 5',
      );
      expect(() => shipper.updateRating(6)).toThrow(
        'Rating must be between 1 and 5',
      );
    });

    it('should set rating for first delivery', () => {
      const oldUpdatedAt = shipper.updatedAt;
      shipper.updateRating(4.5);
      expect(shipper.rating).toBe(4.5);
      expect(shipper.totalDeliveries).toBe(1);
      expect(shipper.updatedAt.getTime()).toBeGreaterThan(
        oldUpdatedAt.getTime(),
      );
    });

    it('should calculate average rating for multiple deliveries', () => {
      shipper.updateRating(4);
      shipper.updateRating(5);
      // (4*1 + 5) / (1+1) = 4.5
      expect(shipper.rating).toBe(4.5);
      expect(shipper.totalDeliveries).toBe(2);
    });

    it('should increment totalDeliveries each time', () => {
      shipper.updateRating(3);
      expect(shipper.totalDeliveries).toBe(1);
      shipper.updateRating(4);
      expect(shipper.totalDeliveries).toBe(2);
    });

    it('should handle null rating correctly', () => {
      // First rating: should set directly
      shipper.updateRating(3.5);
      expect(shipper.rating).toBe(3.5);
      expect(shipper.totalDeliveries).toBe(1);
    });
  });

  describe('delete and restore', () => {
    let shipper: Shipper;

    beforeEach(() => {
      shipper = Shipper.create({
        userId: 'user-123',
        vehicleType: VehicleType.MOTORBIKE,
        licensePlate: '59X1-12345',
        driverLicense: 'DL123456',
        operatingAreas: [],
      });
    });

    it('delete should set deletedAt and set unavailable', () => {
      const oldUpdatedAt = shipper.updatedAt;
      shipper.delete();
      expect(shipper.deletedAt).toBeInstanceOf(Date);
      expect(shipper.isAvailable).toBe(false);
      expect(shipper.updatedAt.getTime()).toBeGreaterThan(
        oldUpdatedAt.getTime(),
      );
    });

    it('delete should do nothing if already deleted', () => {
      shipper.delete();
      const deletedAt1 = shipper.deletedAt;
      const updatedAt1 = shipper.updatedAt;
      // Wait a bit
      jest.advanceTimersByTime(1);
      shipper.delete();
      expect(shipper.deletedAt).toEqual(deletedAt1);
      expect(shipper.updatedAt).toEqual(updatedAt1);
    });

    it('restore should set deletedAt to null and touch updatedAt', () => {
      shipper.delete();
      const oldUpdatedAt = shipper.updatedAt;
      shipper.restore();
      expect(shipper.deletedAt).toBeNull();
      expect(shipper.updatedAt.getTime()).toBeGreaterThan(
        oldUpdatedAt.getTime(),
      );
    });

    it('restore should do nothing if not deleted', () => {
      const oldUpdatedAt = shipper.updatedAt;
      shipper.restore();
      expect(shipper.deletedAt).toBeNull();
      expect(shipper.updatedAt.getTime()).toBe(oldUpdatedAt.getTime());
    });
  });

  describe('equals', () => {
    let shipper1: Shipper;
    let shipper2: Shipper;

    beforeEach(() => {
      shipper1 = Shipper.create({
        userId: 'user-123',
        vehicleType: VehicleType.MOTORBIKE,
        licensePlate: '59X1-12345',
        driverLicense: 'DL123456',
        operatingAreas: [],
      });
      shipper2 = Shipper.create({
        userId: 'user-456',
        vehicleType: VehicleType.VAN,
        licensePlate: '60Y2-67890',
        driverLicense: 'DL654321',
        operatingAreas: [],
      });
    });

    it('should return true for same id', () => {
      expect(shipper1.equals(shipper1)).toBe(true);
      expect(shipper1.equals(shipper2)).toBe(false);
    });

    it('should return false for different ids', () => {
      expect(shipper1.equals(shipper2)).toBe(false);
    });
  });
});
