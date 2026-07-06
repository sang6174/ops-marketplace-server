import { UserRole, BuyerType, VehicleType } from '@domain/entities/enums.enum';
import { User, Shipper } from '@domain/entities/user';
import { IBaseRepository } from './base-repository.interface';

export interface IUserRepository extends IBaseRepository<User> {
  findByEmail(email: string): Promise<User | null>;
  existsByEmail(email: string): Promise<boolean>;
  findByType(type: UserRole): Promise<User[]>;
  findByActiveStatus(isActive: boolean): Promise<User[]>;
}

export interface ISellerRepository extends IUserRepository {
  findAllByFarmName(farmName: string): Promise<User[]>;
  findByProvince(province: string): Promise<User[]>;
}

export interface IBuyerRepository extends IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  existsByEmail(email: string): Promise<boolean>;
  findByLoyaltyPoints(minPoints: number, maxPoints: number): Promise<User[]>;
  findByBuyerType(buyerType: BuyerType): Promise<User[]>;
}

export interface IRestaurantRepository extends IBuyerRepository {
  findByCompanyName(companyName: string): Promise<User[]>;
  findByTaxId(taxId: string): Promise<User[]>;
  findByBusinessLicense(businessLicense: string): Promise<User[]>;
}

// Admin uses same IUserRepository contract

export interface IShipperRepository {
  findById(id: string): Promise<Shipper | null>;
  findByUserId(userId: string): Promise<Shipper | null>;
  findNearBy(
    flat: number,
    lng: number,
    options?: {
      maxDistanceKm?: number;
      vehicleTypes?: VehicleType[];
      operatingAreaCode?: string;
      limit?: number;
    },
  ): Promise<Shipper[]>;
  findActiveShippers(options?: {
    operatingAreaCode?: string;
    vehicleType?: VehicleType;
    limit?: number;
  }): Promise<Shipper[]>;
  save(shipper: Shipper): Promise<void>;
  delete(id: string): Promise<void>;
  existsByDriverLicense(driverLicense: string): Promise<boolean>;
  existsByLicensePlate(licensePlate: string): Promise<boolean>;
}
