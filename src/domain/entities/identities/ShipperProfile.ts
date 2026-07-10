import { UserId } from '../../value-objects/UserId';
import { LicensePlate } from '../../value-objects/LicensePlate';
import { DriverLicense } from '../../value-objects/DriverLicense';
import { VehicleDescription } from '../../value-objects/VehicleDescription';
import { OperatingAreas } from '../../value-objects/OperatingArea';
import { Location } from '../../value-objects/Location';
import { Rating } from '../../value-objects/Rating';
import { AdministrativeDivision } from '../../value-objects/AdministrativeDivision';
import { VehicleType } from '../enums.enum';

export class ShipperProfile {
  private constructor(
    public readonly id: string,
    public readonly userId: UserId,
    private _vehicleType: VehicleType,
    private _licensePlate: LicensePlate,
    private _driverLicense: DriverLicense,
    private _vehicleDescription: VehicleDescription,
    private _operatingAreas: OperatingAreas,
    private _isAvailable: boolean,
    private _currentLocation: Location,
    private _rating: Rating | null,
    private _totalDeliveries: number,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(props: {
    id: string;
    userId: UserId;
    vehicleType: VehicleType;
    licensePlate: LicensePlate;
    driverLicense: DriverLicense;
    vehicleDescription?: VehicleDescription;
    operatingAreas?: OperatingAreas;
    isAvailable?: boolean;
    currentLocation?: Location;
    rating?: Rating | null;
    totalDeliveries?: number;
    createdAt?: Date;
  }): ShipperProfile {
    const now = props.createdAt || new Date();
    return new ShipperProfile(
      props.id,
      props.userId,
      props.vehicleType,
      props.licensePlate,
      props.driverLicense,
      props.vehicleDescription ?? VehicleDescription.create(),
      props.operatingAreas ?? OperatingAreas.create([]),
      props.isAvailable ?? true,
      props.currentLocation ?? Location.unknown(),
      props.rating ?? null,
      props.totalDeliveries ?? 0,
      now,
      now,
    );
  }

  static reconstitute(props: {
    id: string;
    userId: UserId;
    vehicleType: VehicleType;
    licensePlate: LicensePlate;
    driverLicense: DriverLicense;
    vehicleDescription: VehicleDescription;
    operatingAreas: OperatingAreas;
    isAvailable: boolean;
    currentLocation: Location;
    rating: Rating | null;
    totalDeliveries: number;
    createdAt: Date;
    updatedAt: Date;
  }): ShipperProfile {
    return new ShipperProfile(
      props.id,
      props.userId,
      props.vehicleType,
      props.licensePlate,
      props.driverLicense,
      props.vehicleDescription,
      props.operatingAreas,
      props.isAvailable,
      props.currentLocation,
      props.rating,
      props.totalDeliveries,
      props.createdAt,
      props.updatedAt,
    );
  }

  // Getters
  get vehicleType(): VehicleType {
    return this._vehicleType;
  }
  get licensePlate(): LicensePlate {
    return this._licensePlate;
  }
  get driverLicense(): DriverLicense {
    return this._driverLicense;
  }
  get vehicleDescription(): VehicleDescription {
    return this._vehicleDescription;
  }
  get operatingAreas(): OperatingAreas {
    return this._operatingAreas;
  }
  get isAvailable(): boolean {
    return this._isAvailable;
  }
  get currentLocation(): Location {
    return this._currentLocation;
  }
  get rating(): Rating | null {
    return this._rating;
  }
  get totalDeliveries(): number {
    return this._totalDeliveries;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }

  // Behaviors
  updateVehicleInfo(
    vehicleType: VehicleType,
    licensePlate: LicensePlate,
    driverLicense: DriverLicense,
    description?: VehicleDescription,
  ): void {
    this._vehicleType = vehicleType;
    this._licensePlate = licensePlate;
    this._driverLicense = driverLicense;
    if (description) {
      this._vehicleDescription = description;
    }
    this._touch();
  }

  updateVehicleDescription(description: VehicleDescription): void {
    this._vehicleDescription = description;
    this._touch();
  }

  updateOperatingAreas(areas: OperatingAreas): void {
    this._operatingAreas = areas;
    this._touch();
  }

  addOperatingArea(area: AdministrativeDivision): void {
    this._operatingAreas = this._operatingAreas.add(area);
    this._touch();
  }

  removeOperatingArea(area: AdministrativeDivision): void {
    this._operatingAreas = this._operatingAreas.remove(area);
    this._touch();
  }

  updateLocation(location: Location): void {
    this._currentLocation = location;
    this._touch();
  }

  setAvailable(): void {
    if (!this._isAvailable) {
      this._isAvailable = true;
      this._touch();
    }
  }

  setUnavailable(): void {
    if (this._isAvailable) {
      this._isAvailable = false;
      this._touch();
    }
  }

  updateRating(newRating: Rating): void {
    // Tính trung bình có trọng số dựa trên tổng số lượt đánh giá
    if (this._rating === null) {
      this._rating = newRating;
    } else {
      const total = this._totalDeliveries;
      const currentTotal = this._rating.value * total;
      const newAvg = (currentTotal + newRating.value) / (total + 1);
      this._rating = Rating.fromNumber(newAvg);
    }
    this._totalDeliveries += 1;
    this._touch();
  }

  private _touch(): void {
    this._updatedAt = new Date();
  }
}
