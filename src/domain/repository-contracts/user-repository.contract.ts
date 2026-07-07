import {
  UserRole,
  SubAdminRole,
  BuyerType,
  VehicleType,
} from '@domain/entities/enums.enum';
import { User } from '@domain/entities/user';
import { IBaseRepository } from './base-repository.interface';

export interface IUserRepository extends IBaseRepository<User> {
  findByEmail(email: string): Promise<User | null>;
  existsByEmail(email: string): Promise<boolean>;
  findByRole(role: UserRole): Promise<User[]>;
  findByActiveStatus(isActive: boolean): Promise<User[]>;
  findByRoles(roles: UserRole[]): Promise<User[]>;
  findByCreatedAtRange(from: Date, to: Date): Promise<User[]>;
  findSellersByFarmName(farmName: string): Promise<User[]>;
  findSellersByProvince(provinceCode: string): Promise<User[]>;
  findVerifiedSellers(): Promise<User[]>;
  findSellersByRating(minRating: number, maxRating?: number): Promise<User[]>;

  findBuyersByType(buyerType: BuyerType): Promise<User[]>;
  findBuyersByLoyaltyPoints(
    minPoints: number,
    maxPoints?: number,
  ): Promise<User[]>;
  findBuyersByCompanyName(companyName: string): Promise<User[]>;
  findBuyersByTaxId(taxId: string): Promise<User[]>;
  findBuyersByBusinessLicense(businessLicense: string): Promise<User[]>;

  findAdminsBySubRole(subRole: SubAdminRole): Promise<User[]>;
  findActiveShippers(options?: {
    operatingAreaCode?: string;
    vehicleType?: VehicleType;
    limit?: number;
  }): Promise<User[]>;

  findShippersNearBy(
    lat: number,
    lng: number,
    options?: {
      maxDistanceKm?: number;
      vehicleTypes?: VehicleType[];
      operatingAreaCode?: string;
      limit?: number;
    },
  ): Promise<User[]>;
  findShippersByVehicleType(vehicleType: VehicleType): Promise<User[]>;
  findShippersByOperatingArea(areaCode: string): Promise<User[]>;

  existsByDriverLicense(driverLicense: string): Promise<boolean>;
  existsByLicensePlate(licensePlate: string): Promise<boolean>;
  existsByTaxId(taxId: string): Promise<boolean>;
  existsByBusinessLicense(businessLicense: string): Promise<boolean>;
}
