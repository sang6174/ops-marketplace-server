import {
  BuyerType,
  SubAdminRole,
  VehicleType,
} from '@domain/entities/enums.enum';
import { Seller, Buyer, Admin, Shipper } from '@domain/entities/user';
import { Address } from '@domain/entities/address';
import {
  CreateSellerInput,
  CreateBuyerInput,
  CreateAdminInput,
} from '@shared/dto';

export interface IDeleteUserUseCase {
  execute(id: string): Promise<void>;
}

// SELLER
export interface ICreateSellerUseCase {
  execute(input: CreateSellerInput): Promise<Seller>;
}

export interface UpdateSellerInput {
  fullName?: string;
  phoneNumber?: string;
  email?: string;
  isActive?: boolean;
  farmName?: string;
  address?: Address[];
  taxId?: string;
  businessLicense?: string;
  bankAccount?: string;
}

export interface IUpdateSellerUseCase {
  execute(id: string, dto: UpdateSellerInput): Promise<Seller>;
}

// BUYER
export interface ICreateBuyerUseCase {
  execute(input: CreateBuyerInput): Promise<Buyer>;
}

export interface UpdateBuyerInput {
  fullName?: string;
  phoneNumber?: string;
  email?: string;
  isActive?: boolean;
  address?: Address[];
  buyerType?: BuyerType;
  loyaltyPoints?: number;
  companyName?: string;
}

export interface IUpdateBuyerUseCase {
  execute(id: string, dto: UpdateBuyerInput): Promise<Buyer>;
}

// ADMIN
export interface ICreateAdminUseCase {
  execute(input: CreateAdminInput): Promise<Admin>;
}

export interface UpdateAdminInput {
  fullName?: string;
  phoneNumber?: string;
  email?: string;
  isActive?: boolean;
  subRole?: SubAdminRole;
}

export interface IUpdateAdminUseCase {
  execute(id: string, dto: UpdateAdminInput): Promise<Admin>;
}

// Shipper

export interface ShipperLookupCriteria {
  deliveryAddress: Address;
  orderWeight?: number;
  maxDistanceKm?: number;
  preferredVehicleTypes?: VehicleType[];
  limit?: number;
}

export interface ShipperSuggestion {
  shipper: Shipper;
  distanceKm: number;
}

export interface IFindNearByShippers {
  execute(criteria: ShipperLookupCriteria): Promise<ShipperSuggestion[]>;
}

export interface ICanShipperAccessOrder {
  execute(
    shipper: Shipper,
    deliveryAddress: Address,
    orderWeight?: number,
  ): boolean;
}

export interface GetAvailableShippersRequest {
  orderId: string;
  maxDistanceKm?: number;
  preferredVehicleTypes?: string[];
  limit?: number;
}

export interface ShipperSuggestionDTO {
  id: string;
  userId: string;
  vehicleType: string;
  licensePlate: string;
  vehicleDescription: string | null;
  rating: number | null;
  totalDeliveries: number;
  distanceKm: number;
  isAvailable: boolean;
  operatingAreas: string[];
}

export interface IGetAvailableShippersUseCase {
  execute(
    request: GetAvailableShippersRequest,
  ): Promise<ShipperSuggestionDTO[]>;
}

export interface SelectShipperRequest {
  orderId: string;
  shipperId: string;
}

export interface ISelectShipperUseCase {
  execute(request: SelectShipperRequest): Promise<void>;
}
