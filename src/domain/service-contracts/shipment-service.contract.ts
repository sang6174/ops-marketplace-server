import { Shipment } from '../entities/shipment';
import { Address } from '../entities/value-objects/address';

export interface IShipmentDomainService {
  canAssignShipper(
    shipper: any, // User with ShipperProfile (or a DTO)
    shipment: Shipment,
  ): Promise<{ allowed: boolean; reason?: string }>;

  findNearestShipper(
    shipment: Shipment,
    maxDistanceKm?: number,
  ): Promise<any | null>;

  calculateEstimatedDelivery(
    pickupAddress: Address,
    deliveryAddress: Address,
    vehicleType?: string,
  ): Date;

  generateTrackingNumber(orderId: string, shopId: string): string;

  validateCancellation(shipment: Shipment): { valid: boolean; reason?: string };

  isEligibleForReturn(
    shipment: Shipment,
    returnWindowDays?: number,
  ): { eligible: boolean; reason?: string };

  groupByShipper(shipments: Shipment[]): Map<string, Shipment[]>;
}
