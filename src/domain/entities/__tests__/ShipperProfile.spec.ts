import { describe, it, expect, beforeEach } from '@jest/globals';

import { ShipperProfile } from '../../entities/identities/ShipperProfile';
import { UserId } from '../../value-objects/UserId';
import { VehicleType } from '../enums.enum';
import { LicensePlate } from '../../value-objects/LicensePlate';
import { DriverLicense } from '../../value-objects/DriverLicense';
import { VehicleDescription } from '../../value-objects/VehicleDescription';
import { OperatingAreas } from '../../value-objects/OperatingArea';
import { Location } from '../../value-objects/Location';
import { Rating } from '../../value-objects/Rating';
import { Country } from '../../value-objects/Country';
import { AdministrativeDivision } from '../../value-objects/AdministrativeDivision';

function createMockArea(): AdministrativeDivision {
  const country = new Country('VN', 'Vietnam');
  return new AdministrativeDivision(country, 2, 'VN-01', 'Hanoi');
}

describe('ShipperProfile', () => {
  let shipperProfile: ShipperProfile;
  const mockUserId = UserId.create('user-123');
  const mockId = 'shipper-456';
  const mockLicensePlate = LicensePlate.create('ABC-1234');
  const mockDriverLicense = DriverLicense.create('ABC123456789');
  const mockVehicleDesc = VehicleDescription.create('Honda Wave');
  const mockArea = createMockArea();
  const mockOperatingAreas = OperatingAreas.create([mockArea]);
  const mockLocation = Location.create(10.8231, 106.6297);
  const mockCreatedAt = new Date('2025-01-01');

  beforeEach(() => {
    shipperProfile = ShipperProfile.create({
      id: mockId,
      userId: mockUserId,
      vehicleType: VehicleType.MOTORBIKE,
      licensePlate: mockLicensePlate,
      driverLicense: mockDriverLicense,
      vehicleDescription: mockVehicleDesc,
      operatingAreas: mockOperatingAreas,
      isAvailable: true,
      currentLocation: mockLocation,
      rating: null,
      totalDeliveries: 0,
      createdAt: mockCreatedAt,
    });
  });

  describe('create()', () => {
    it('should create shipper profile with all fields', () => {
      expect(shipperProfile.id).toBe(mockId);
      expect(shipperProfile.userId).toBe(mockUserId);
      expect(shipperProfile.vehicleType).toBe(VehicleType.MOTORBIKE);
      expect(shipperProfile.licensePlate).toBe(mockLicensePlate);
      expect(shipperProfile.driverLicense).toBe(mockDriverLicense);
      expect(shipperProfile.vehicleDescription).toBe(mockVehicleDesc);
      expect(shipperProfile.operatingAreas).toEqual(mockOperatingAreas);
      expect(shipperProfile.isAvailable).toBe(true);
      expect(shipperProfile.currentLocation).toEqual(mockLocation);
      expect(shipperProfile.rating).toBeNull();
      expect(shipperProfile.totalDeliveries).toBe(0);
    });

    it('should default isAvailable to true and location to unknown if not provided', () => {
      const profile = ShipperProfile.create({
        id: 'new',
        userId: mockUserId,
        vehicleType: VehicleType.TRUCK,
        licensePlate: mockLicensePlate,
        driverLicense: mockDriverLicense,
        createdAt: mockCreatedAt,
      });
      expect(profile.isAvailable).toBe(true);
      expect(profile.currentLocation).toEqual(Location.unknown());
      expect(profile.operatingAreas).toEqual(OperatingAreas.create([]));
    });
  });

  describe('reconstitute()', () => {
    it('should recreate shipper profile from persistence', () => {
      const reconstituted = ShipperProfile.reconstitute({
        id: mockId,
        userId: mockUserId,
        vehicleType: VehicleType.TRUCK,
        licensePlate: mockLicensePlate,
        driverLicense: mockDriverLicense,
        vehicleDescription: VehicleDescription.create(''),
        operatingAreas: OperatingAreas.create([]),
        isAvailable: false,
        currentLocation: Location.create(0, 0),
        rating: Rating.fromNumber(4.0),
        totalDeliveries: 10,
        createdAt: mockCreatedAt,
        updatedAt: new Date('2025-02-01'),
      });
      expect(reconstituted.vehicleType).toBe(VehicleType.TRUCK);
      expect(reconstituted.isAvailable).toBe(false);
      expect(reconstituted.rating).toEqual(Rating.fromNumber(4.0));
      expect(reconstituted.totalDeliveries).toBe(10);
    });
  });

  describe('behaviors', () => {
    it('should update vehicle info', () => {
      const newPlate = LicensePlate.create('XYZ-5678');
      const newLicense = DriverLicense.create('XYZ987654321');
      shipperProfile.updateVehicleInfo(
        VehicleType.VAN,
        newPlate,
        newLicense,
        VehicleDescription.create('Toyota'),
      );
      expect(shipperProfile.vehicleType).toBe(VehicleType.VAN);
      expect(shipperProfile.licensePlate).toBe(newPlate);
      expect(shipperProfile.driverLicense).toBe(newLicense);
      expect(shipperProfile.vehicleDescription).toEqual(
        VehicleDescription.create('Toyota'),
      );
    });

    it('should update vehicle description separately', () => {
      const newDesc = VehicleDescription.create('New desc');
      shipperProfile.updateVehicleDescription(newDesc);
      expect(shipperProfile.vehicleDescription).toBe(newDesc);
    });

    it('should add operating area', () => {
      const newArea = new AdministrativeDivision(
        new Country('VN', 'Vietnam'),
        2,
        'VN-02',
        'Ho Chi Minh',
      );
      shipperProfile.addOperatingArea(newArea);
      expect(shipperProfile.operatingAreas.includes(newArea)).toBe(true);
    });

    it('should not add duplicate operating area', () => {
      const areas = shipperProfile.operatingAreas;
      const lengthBefore = areas.areas.length;
      shipperProfile.addOperatingArea(mockArea); // duplicate
      expect(shipperProfile.operatingAreas.areas).toHaveLength(lengthBefore);
    });

    it('should remove operating area', () => {
      shipperProfile.removeOperatingArea(mockArea);
      expect(shipperProfile.operatingAreas.includes(mockArea)).toBe(false);
    });

    it('should update location', () => {
      const newLocation = Location.create(21.0285, 105.8542);
      shipperProfile.updateLocation(newLocation);
      expect(shipperProfile.currentLocation).toBe(newLocation);
    });

    it('should set available', () => {
      shipperProfile.setUnavailable();
      expect(shipperProfile.isAvailable).toBe(false);
      shipperProfile.setAvailable();
      expect(shipperProfile.isAvailable).toBe(true);
    });

    it('should update rating and increment total deliveries', () => {
      expect(shipperProfile.totalDeliveries).toBe(0);
      expect(shipperProfile.rating).toBeNull();

      shipperProfile.updateRating(Rating.fromNumber(4));
      expect(shipperProfile.totalDeliveries).toBe(1);
      expect(shipperProfile.rating).toEqual(Rating.fromNumber(4));

      shipperProfile.updateRating(Rating.fromNumber(5));
      expect(shipperProfile.totalDeliveries).toBe(2);
      expect(shipperProfile.rating).toEqual(Rating.fromNumber(4.5));
    });
  });
});
