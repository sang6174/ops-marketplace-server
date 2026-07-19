// src/domain/service-contract/shipper-lookup.service.ts
import { User } from '@/domain/entities/identities/User';
import {
  Address,
  AdministrativeDivision,
} from '@domain/value-objects/Address';
import { VehicleType } from '@domain/entities/enums.enum';
import { Order } from '@/domain/entities/orders/Order';

export interface ShipperLookupCriteria {
  deliveryAddress: Address;
  orderWeight?: number;
  maxDistanceKm?: number;
  preferredVehicleTypes?: VehicleType[];
  limit?: number;
}

export interface ShipperSuggestion {
  shipper: User;
  distanceKm: number;
}

export interface IShipperLookupService {
  findNearbyShippers(
    criteria: ShipperLookupCriteria,
  ): Promise<ShipperSuggestion[]>;
  canShipperAcceptOrder(
    shipper: User,
    deliveryAddress: Address,
    orderWeight?: number,
  ): boolean;
  findBestShipper(order: Order): Promise<User | null>;
}

export interface IShipperAssignmentService {
  assignShipperToOrder(shipper: User, order: Order): Promise<void>;
  unassignShipperFromOrder(order: Order): Promise<void>;
  isShipperAvailable(shipper: User): boolean;
  isShipperInOperatingArea(
    shipper: User,
    area: AdministrativeDivision,
  ): boolean;
}
