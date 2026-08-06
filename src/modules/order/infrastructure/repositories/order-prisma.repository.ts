import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { IOrderRepository } from '@domain/repository-contracts/order-repository.contract';
import { Order, OrderItem } from '@domain/entities/orders/Order';
import { Address } from '@domain/value-objects/Address';
import { Country } from '@domain/value-objects/Country';
import { AdministrativeDivision } from '@domain/value-objects/AdministrativeDivision';
import {
  OrderStatus,
  OrderType,
  PaymentStatus,
} from '@domain/entities/enums.enum';

export const ORDER_PRISMA_REPOSITORY = 'ORDER_PRISMA_REPOSITORY';

@Injectable()
export class OrderPrismaRepository implements IOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Order | null> {
    const record = await this.prisma.order.findUnique({
      where: { id, deletedAt: null },
      include: { items: true },
    });

    if (!record) return null;

    return this.mapToDomain(record);
  }

  async save(entity: Order): Promise<Order> {
    const orderData = {
      buyerId: entity.buyerId,
      sellerId: entity.sellerId,
      orderType: entity.orderType as any,
      status: entity.orderStatus as any,
      totalPrice: entity.grandTotal,
      shippingAddress: this.serializeAddress(entity.shippingAddress),
      paymentMethod: entity.paymentMethod,
      paymentIntentId: entity.paymentIntentId ?? null,
      paymentStatus: entity.paymentStatus as any,
      notes: entity.notes ?? null,
    };

    const itemsData = entity.items.map((item) => ({
      shopId: item.shopId,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      price: item.retailPrice,
    }));

    const existing = await this.prisma.order.findUnique({
      where: { id: entity.id },
    });

    if (existing) {
      const updated = await this.prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: entity.id },
          data: orderData as any,
        });

        await tx.orderItem.deleteMany({
          where: { orderId: entity.id },
        });

        if (itemsData.length > 0) {
          await tx.orderItem.createMany({
            data: itemsData.map((item) => ({
              ...item,
              orderId: entity.id,
            })),
          });
        }

        return tx.order.findUnique({
          where: { id: entity.id },
          include: { items: true },
        });
      });

      return this.mapToDomain(updated!);
    }

    const created = await this.prisma.order.create({
      data: {
        id: entity.id,
        ...orderData,
        items: {
          create: itemsData,
        },
      } as any,
      include: { items: true },
    });

    return this.mapToDomain(created);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.order.softDelete({ id });
  }

  async findByBuyerId(
    buyerId: string,
    options?: { limit?: number; offset?: number; status?: OrderStatus },
  ): Promise<Order[]> {
    const records = await this.prisma.order.findMany({
      where: {
        buyerId,
        deletedAt: null,
        ...(options?.status && { status: options.status as any }),
      },
      include: { items: true },
      take: options?.limit,
      skip: options?.offset,
      orderBy: { createdAt: 'desc' },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async findBySellerId(
    sellerId: string,
    options?: { limit?: number; offset?: number; status?: OrderStatus },
  ): Promise<Order[]> {
    const records = await this.prisma.order.findMany({
      where: {
        sellerId,
        deletedAt: null,
        ...(options?.status && { status: options.status as any }),
      },
      include: { items: true },
      take: options?.limit,
      skip: options?.offset,
      orderBy: { createdAt: 'desc' },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async findByStatus(status: OrderStatus): Promise<Order[]> {
    const records = await this.prisma.order.findMany({
      where: { status: status as any, deletedAt: null },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async findByPaymentStatus(status: PaymentStatus): Promise<Order[]> {
    const records = await this.prisma.order.findMany({
      where: { paymentStatus: status as any, deletedAt: null },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async findBySellerAndStatus(
    sellerId: string,
    status: OrderStatus,
  ): Promise<Order[]> {
    const records = await this.prisma.order.findMany({
      where: { sellerId, status: status as any, deletedAt: null },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async findByBuyerAndStatus(
    buyerId: string,
    status: OrderStatus,
  ): Promise<Order[]> {
    const records = await this.prisma.order.findMany({
      where: { buyerId, status: status as any, deletedAt: null },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<Order[]> {
    const records = await this.prisma.order.findMany({
      where: {
        deletedAt: null,
        createdAt: { gte: startDate, lte: endDate },
      },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async findByPaymentIntent(paymentIntentId: string): Promise<Order | null> {
    const record = await this.prisma.order.findFirst({
      where: { paymentIntentId, deletedAt: null },
      include: { items: true },
    });

    if (!record) return null;

    return this.mapToDomain(record);
  }

  async getTotalSalesForSeller(
    sellerId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<number> {
    const result = await this.prisma.order.aggregate({
      where: {
        sellerId,
        status: 'DELIVERED' as any,
        deletedAt: null,
        ...(startDate && { createdAt: { gte: startDate } }),
        ...(endDate && { createdAt: { lte: endDate } }),
      },
      _sum: { totalPrice: true },
    });

    return result._sum.totalPrice ? Number(result._sum.totalPrice) : 0;
  }

  async deleteByBuyerId(buyerId: string): Promise<void> {
    await this.prisma.order.updateMany({
      where: { buyerId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  private mapToDomain(record: Record<string, unknown>): Order {
    const addr = record.shippingAddress as Record<string, unknown>;
    const shippingAddress = this.deserializeAddress(addr);

    const items: OrderItem[] = (
      (record.items as Array<Record<string, unknown>>) ?? []
    ).map(
      (item) =>
        new OrderItem(
          item.shopId as string,
          item.productId as string,
          item.productName as string,
          item.quantity as number,
          Number(item.price),
        ),
    );

    return new (Order as unknown as new (
      id: string,
      buyerId: string,
      sellerId: string,
      orderType: OrderType,
      items: OrderItem[],
      subtotal: number,
      shippingFee: number,
      grandTotal: number,
      shippingAddress: Address,
      paymentMethod: string,
      paymentStatus: PaymentStatus,
      orderStatus: OrderStatus,
      createdAt: Date,
      updatedAt: Date,
      paymentIntentId?: string,
      shippedAt?: Date,
      deliveredAt?: Date,
      cancelledAt?: Date,
      notes?: string,
    ) => Order)(
      record.id as string,
      record.buyerId as string,
      record.sellerId as string,
      record.orderType as OrderType,
      items,
      Number(record.totalPrice),
      Number(record.totalPrice),
      Number(record.totalPrice),
      shippingAddress,
      record.paymentMethod as string,
      record.paymentStatus as PaymentStatus,
      record.status as OrderStatus,
      record.createdAt as Date,
      record.updatedAt as Date,
      record.paymentIntentId as string | undefined,
      record.shippedAt as Date | undefined,
      record.deliveredAt as Date | undefined,
      record.cancelledAt as Date | undefined,
      record.notes as string | undefined,
    );
  }

  private serializeAddress(address: Address): Record<string, unknown> {
    return {
      country: {
        code: address.country.code,
        name: address.country.name,
      },
      stateProvince: {
        code: address.stateProvince.code,
        name: address.stateProvince.name,
        level: address.stateProvince.level,
        parentCode: address.stateProvince.parentCode,
      },
      district: address.district
        ? {
            code: address.district.code,
            name: address.district.name,
            level: address.district.level,
            parentCode: address.district.parentCode,
          }
        : null,
      ward: address.ward
        ? {
            code: address.ward.code,
            name: address.ward.name,
            level: address.ward.level,
            parentCode: address.ward.parentCode,
          }
        : null,
      street: address.street,
      postalCode: address.postalCode,
      detail: address.detail,
    };
  }

  private deserializeAddress(data: Record<string, unknown>): Address {
    const countryData = data.country as Record<string, string>;
    const stateData = data.stateProvince as Record<string, unknown>;
    const districtData = data.district as Record<string, unknown> | null;
    const wardData = data.ward as Record<string, unknown> | null;

    const country = new Country(countryData.code, countryData.name);

    const stateProvince = new AdministrativeDivision(
      country,
      stateData.level as number,
      stateData.code as string,
      stateData.name as string,
      stateData.parentCode as string | undefined,
    );

    const district = districtData
      ? new AdministrativeDivision(
          country,
          districtData.level as number,
          districtData.code as string,
          districtData.name as string,
          districtData.parentCode as string | undefined,
        )
      : null;

    const ward = wardData
      ? new AdministrativeDivision(
          country,
          wardData.level as number,
          wardData.code as string,
          wardData.name as string,
          wardData.parentCode as string | undefined,
        )
      : null;

    return Address.reconstitute({
      country,
      stateProvince,
      district,
      ward,
      street: data.street as string,
      postalCode: data.postalCode as string,
      detail: (data.detail as string) ?? null,
    });
  }
}
