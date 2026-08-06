import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { IShipmentRepository } from '@domain/repository-contracts/shipment-repository.contract';
import { Shipment } from '@domain/entities/orders/Shipment';
import { ShipmentStatus } from '@domain/entities/enums.enum';
import { ShipmentId } from '@domain/value-objects/ShipmentId';
import { OrderId } from '@domain/value-objects/OrderId';
import { ShopId } from '@domain/value-objects/ShopId';
import { ShipperId } from '@domain/value-objects/ShipperId';
import { TrackingNumber } from '@domain/value-objects/TrackingNumber';
import { Address } from '@domain/value-objects/Address';
import { Country } from '@domain/value-objects/Country';
import { AdministrativeDivision } from '@domain/value-objects/AdministrativeDivision';

interface AddressJson {
  country: { code: string; name: string };
  stateProvince: { code: string; name: string; level: number; parentCode?: string };
  district: { code: string; name: string; level: number; parentCode?: string } | null;
  ward: { code: string; name: string; level: number; parentCode?: string } | null;
  street: string;
  postalCode: string;
  detail: string | null;
}

interface ShipmentRecord {
  id: string;
  orderId: string;
  shopId: string;
  shipperId: string | null;
  status: string;
  trackingNumber: string | null;
  pickupAddress: unknown;
  deliveryAddress: unknown;
  estimatedDeliveryAt: Date | null;
  deliveredAt: Date | null;
  failedAt: Date | null;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const SHIPMENT_PRISMA_REPOSITORY = 'SHIPMENT_PRISMA_REPOSITORY';

@Injectable()
export class ShipmentPrismaRepository implements IShipmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Shipment | null> {
    const record = await this.prisma.shipment.findUnique({
      where: { id, deletedAt: null },
    });

    if (!record) return null;

    return this.mapToDomain(record as unknown as ShipmentRecord);
  }

  async save(entity: Shipment): Promise<Shipment> {
    const data = {
      orderId: entity.orderId.value,
      shopId: entity.shopId.value,
      shipperId: entity.shipperId?.value ?? null,
      status: entity.status,
      trackingNumber: entity.trackingNumber?.value ?? null,
      pickupAddress: this.serializeAddress(entity.pickupAddress),
      deliveryAddress: this.serializeAddress(entity.deliveryAddress),
      estimatedDeliveryAt: entity.estimatedDeliveryAt,
    };

    const existing = await this.prisma.shipment.findUnique({
      where: { id: entity.id.value },
    });

    if (existing) {
      const updated = await this.prisma.shipment.update({
        where: { id: entity.id.value },
        data: data as any,
      });
      return this.mapToDomain(updated as unknown as ShipmentRecord);
    }

    const created = await this.prisma.shipment.create({
      data: {
        id: entity.id.value,
        ...data,
      } as any,
    });

    return this.mapToDomain(created as unknown as ShipmentRecord);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.shipment.softDelete({ id });
  }

  async findByOrderId(orderId: string): Promise<Shipment | null> {
    const record = await this.prisma.shipment.findFirst({
      where: { orderId, deletedAt: null },
    });

    if (!record) return null;

    return this.mapToDomain(record as unknown as ShipmentRecord);
  }

  async findByShopId(
    shopId: string,
    options?: { status?: ShipmentStatus; limit?: number; offset?: number },
  ): Promise<Shipment[]> {
    const records = await this.prisma.shipment.findMany({
      where: {
        shopId,
        deletedAt: null,
        ...(options?.status ? { status: options.status } : {}),
      },
      take: options?.limit,
      skip: options?.offset,
    });

    return records.map((r) => this.mapToDomain(r as unknown as ShipmentRecord));
  }

  async findByShipperId(
    shipperId: string,
    options?: { status?: ShipmentStatus; limit?: number; offset?: number },
  ): Promise<Shipment[]> {
    const records = await this.prisma.shipment.findMany({
      where: {
        shipperId,
        deletedAt: null,
        ...(options?.status ? { status: options.status } : {}),
      },
      take: options?.limit,
      skip: options?.offset,
    });

    return records.map((r) => this.mapToDomain(r as unknown as ShipmentRecord));
  }

  async findByStatus(status: ShipmentStatus): Promise<Shipment[]> {
    const records = await this.prisma.shipment.findMany({
      where: { status, deletedAt: null },
    });

    return records.map((r) => this.mapToDomain(r as unknown as ShipmentRecord));
  }

  async findByDateRange(from: Date, to: Date): Promise<Shipment[]> {
    const records = await this.prisma.shipment.findMany({
      where: {
        deletedAt: null,
        createdAt: { gte: from, lte: to },
      },
    });

    return records.map((r) => this.mapToDomain(r as unknown as ShipmentRecord));
  }

  async countByShopIdAndStatus(
    shopId: string,
    status: ShipmentStatus,
  ): Promise<number> {
    return this.prisma.shipment.count({
      where: { shopId, status, deletedAt: null },
    });
  }

  async countByShipperIdAndStatus(
    shipperId: string,
    status: ShipmentStatus,
  ): Promise<number> {
    return this.prisma.shipment.count({
      where: { shipperId, status, deletedAt: null },
    });
  }

  async findPendingShipments(limit?: number): Promise<Shipment[]> {
    const records = await this.prisma.shipment.findMany({
      where: { status: ShipmentStatus.PENDING, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    return records.map((r) => this.mapToDomain(r as unknown as ShipmentRecord));
  }

  async findOverdueShipments(date: Date): Promise<Shipment[]> {
    const records = await this.prisma.shipment.findMany({
      where: {
        deletedAt: null,
        estimatedDeliveryAt: { lt: date },
        status: {
          notIn: [
            ShipmentStatus.DELIVERED,
            ShipmentStatus.FAILED,
            ShipmentStatus.RETURNED,
          ],
        },
      },
    });

    return records.map((r) => this.mapToDomain(r as unknown as ShipmentRecord));
  }

  private mapToDomain(record: ShipmentRecord): Shipment {
    return Shipment.reconstitute({
      id: ShipmentId.create(record.id),
      orderId: OrderId.create(record.orderId),
      shopId: ShopId.create(record.shopId),
      shipperId: record.shipperId ? ShipperId.create(record.shipperId) : null,
      status: record.status as ShipmentStatus,
      trackingNumber: record.trackingNumber
        ? TrackingNumber.create(record.trackingNumber)
        : null,
      pickupAddress: this.deserializeAddress(record.pickupAddress as AddressJson),
      deliveryAddress: this.deserializeAddress(record.deliveryAddress as AddressJson),
      estimatedDeliveryAt: record.estimatedDeliveryAt,
      deliveredAt: record.deliveredAt,
      failedAt: record.failedAt,
      failureReason: record.failureReason,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  private serializeAddress(address: Address): AddressJson {
    const serializeDivision = (div: AdministrativeDivision) => ({
      code: div.code,
      name: div.name,
      level: div.level,
      ...(div.parentCode !== undefined ? { parentCode: div.parentCode } : {}),
    });

    return {
      country: { code: address.country.code, name: address.country.name },
      stateProvince: serializeDivision(address.stateProvince),
      district: address.district ? serializeDivision(address.district) : null,
      ward: address.ward ? serializeDivision(address.ward) : null,
      street: address.street,
      postalCode: address.postalCode,
      detail: address.detail,
    };
  }

  private deserializeAddress(json: AddressJson): Address {
    const deserializeDivision = (data: AddressJson['stateProvince']) =>
      new AdministrativeDivision(
        new Country(json.country.code, json.country.name),
        data.level,
        data.code,
        data.name,
        data.parentCode,
      );

    return Address.reconstitute({
      country: new Country(json.country.code, json.country.name),
      stateProvince: deserializeDivision(json.stateProvince),
      district: json.district ? deserializeDivision(json.district) : null,
      ward: json.ward ? deserializeDivision(json.ward) : null,
      street: json.street,
      postalCode: json.postalCode,
      detail: json.detail,
    });
  }
}
