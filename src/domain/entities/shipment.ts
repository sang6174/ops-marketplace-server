import { User } from './user';
import { Address } from './address';
import { VehicleType, ShipmentStatus } from './enums.enum';

export class ShipperInfo {
  constructor(
    public readonly vehicleType: VehicleType,
    public readonly licensePlate: string,
    public readonly maxWeight: number,
    public readonly operatingAreas: string[],
    public readonly pricePerKm: number,
    public readonly pricePerKg: number,
    public isAvailable: boolean,
  ) {}
}

export class Shipper extends User {
  constructor(
    public readonly id: string,
    public email: string,
    public fullName: string,
    public phoneNumber: string,
    public isActive: boolean,
    public createdAt: Date,
    public updatedAt: Date,
    public shipperInfo: ShipperInfo,
    public completedOrders: number,
    public rating: number,
    public SellerPartnerships: string[],
  ) {
    super(id, email, fullName, phoneNumber, isActive, createdAt, updatedAt);
  }
}

export class Shipment {
  private constructor(
    public readonly id: string,
    public readonly orderId: string,
    public shipperId: string | null,
    public status: ShipmentStatus,
    public pickupAddress: Address,
    public deliveryAddress: Address,
    public estimatedDistance: number,
    public estimatedCost: number,
    public actualCost: number | null,
    public trackingCode: string,
    public pickedUpAt: Date | null,
    public deliveredAt: Date | null,
    public notes: string[],
    public createdAt: Date,
    public updatedAt: Date,
  ) {}
}
