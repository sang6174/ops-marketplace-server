import { Shipment } from '../entities/shipment';
import { ShipmentStatus } from '../entities/enums.enum';
import { IBaseRepository } from './base-repository.interface';

export interface IShipmentRepository extends IBaseRepository<Shipment> {
  findByOrderId(orderId: string): Promise<Shipment | null>;

  findByShopId(
    shopId: string,
    options?: { status?: ShipmentStatus; limit?: number; offset?: number },
  ): Promise<Shipment[]>;

  findByShipperId(
    shipperId: string,
    options?: { status?: ShipmentStatus; limit?: number; offset?: number },
  ): Promise<Shipment[]>;

  findByStatus(status: ShipmentStatus): Promise<Shipment[]>;
  findByDateRange(from: Date, to: Date): Promise<Shipment[]>;

  countByShopIdAndStatus(
    shopId: string,
    status: ShipmentStatus,
  ): Promise<number>;
  countByShipperIdAndStatus(
    shipperId: string,
    status: ShipmentStatus,
  ): Promise<number>;
  findPendingShipments(limit?: number): Promise<Shipment[]>;
  findOverdueShipments(date: Date): Promise<Shipment[]>;
}
