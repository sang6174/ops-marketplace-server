import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { IUserRepository } from '@domain/repository-contracts/user-repository.contract';
import { User } from '@domain/entities/identities/User';
import { UserId } from '@domain/value-objects/UserId';
import { Email } from '@domain/value-objects/Email';
import { FullName } from '@domain/value-objects/FullName';
import { PhoneNumber } from '@domain/value-objects/PhoneNumber';
import {
  UserRole,
  SubAdminRole,
  BuyerType,
  VehicleType,
} from '@domain/entities/enums.enum';

export const USER_PRISMA_REPOSITORY = 'USER_PRISMA_REPOSITORY';

@Injectable()
export class UserPrismaRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({
      where: { id, deletedAt: null },
      include: { roles: true },
    });

    if (!record) return null;

    return this.mapToDomain(record);
  }

  async save(entity: User): Promise<User> {
    const existing = await this.prisma.user.findUnique({
      where: { id: entity.id.value },
    });

    const data = {
      email: entity.email.value,
      name: entity.fullName.value,
      phoneNumber: entity.phoneNumber.value,
      isActive: entity.isActive,
    };

    if (existing) {
      const updated = await this.prisma.user.update({
        where: { id: entity.id.value },
        data,
        include: { roles: true },
      });

      return this.mapToDomain(updated);
    }

    const created = await this.prisma.user.create({
      data: {
        id: entity.id.value,
        ...data,
        status: 'ACTIVE',
      },
      include: { roles: true },
    });

    return this.mapToDomain(created);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.softDelete({ id });
  }

  async findByEmail(email: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase(), deletedAt: null },
      include: { roles: true },
    });

    if (!record) return null;

    return this.mapToDomain(record);
  }

  async existsByEmail(email: string): Promise<boolean> {
    return this.prisma.user.exists({
      email: email.toLowerCase(),
      deletedAt: null,
    });
  }

  async findByRole(role: UserRole): Promise<User[]> {
    const records = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        roles: { some: { role } },
      },
      include: { roles: true },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async findByActiveStatus(isActive: boolean): Promise<User[]> {
    const records = await this.prisma.user.findMany({
      where: { isActive, deletedAt: null },
      include: { roles: true },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async findByRoles(roles: UserRole[]): Promise<User[]> {
    const records = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        roles: { some: { role: { in: roles } } },
      },
      include: { roles: true },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async findByCreatedAtRange(from: Date, to: Date): Promise<User[]> {
    const records = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        createdAt: { gte: from, lte: to },
      },
      include: { roles: true },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async findSellersByFarmName(farmName: string): Promise<User[]> {
    const records = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        roles: { some: { role: 'SELLER' } },
        sellerProfile: {
          farmName: { contains: farmName, mode: 'insensitive' },
        },
      },
      include: { roles: true },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async findSellersByProvince(provinceCode: string): Promise<User[]> {
    const records = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        roles: { some: { role: 'SELLER' } },
        sellerProfile: {
          addresses: { path: ['provinceCode'], equals: provinceCode },
        },
      },
      include: { roles: true },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async findVerifiedSellers(): Promise<User[]> {
    const records = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        roles: { some: { role: 'SELLER' } },
        sellerProfile: { isVerified: true },
      },
      include: { roles: true },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async findSellersByRating(
    minRating: number,
    maxRating?: number,
  ): Promise<User[]> {
    const ratingFilter: Record<string, unknown> = { gte: minRating };
    if (maxRating !== undefined) {
      ratingFilter.lte = maxRating;
    }

    const records = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        roles: { some: { role: 'SELLER' } },
        sellerProfile: { rating: ratingFilter },
      },
      include: { roles: true },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async findBuyersByType(buyerType: BuyerType): Promise<User[]> {
    const records = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        roles: { some: { role: 'BUYER' } },
        buyerProfile: { buyerType },
      },
      include: { roles: true },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async findBuyersByLoyaltyPoints(
    minPoints: number,
    maxPoints?: number,
  ): Promise<User[]> {
    const pointsFilter: Record<string, unknown> = { gte: minPoints };
    if (maxPoints !== undefined) {
      pointsFilter.lte = maxPoints;
    }

    const records = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        roles: { some: { role: 'BUYER' } },
        buyerProfile: { loyaltyPoints: pointsFilter },
      },
      include: { roles: true },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async findBuyersByCompanyName(companyName: string): Promise<User[]> {
    const records = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        roles: { some: { role: 'BUYER' } },
        buyerProfile: {
          companyName: { contains: companyName, mode: 'insensitive' },
        },
      },
      include: { roles: true },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async findBuyersByTaxId(taxId: string): Promise<User[]> {
    const records = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        roles: { some: { role: 'BUYER' } },
        buyerProfile: { taxId },
      },
      include: { roles: true },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async findBuyersByBusinessLicense(
    businessLicense: string,
  ): Promise<User[]> {
    const records = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        roles: { some: { role: 'BUYER' } },
        buyerProfile: { businessLicense },
      },
      include: { roles: true },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async findAdminsBySubRole(subRole: SubAdminRole): Promise<User[]> {
    const records = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        roles: { some: { role: 'ADMIN' } },
        adminProfile: { subRole },
      },
      include: { roles: true },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async findActiveShippers(options?: {
    operatingAreaCode?: string;
    vehicleType?: VehicleType;
    limit?: number;
  }): Promise<User[]> {
    const where: Record<string, unknown> = {
      deletedAt: null,
      roles: { some: { role: 'SHIPPER' } },
      shipperProfile: { isAvailable: true },
    };

    if (options?.operatingAreaCode) {
      (where.shipperProfile as Record<string, unknown>).operatingAreas = {
        path: ['codes'],
        array_contains: options.operatingAreaCode,
      };
    }

    if (options?.vehicleType) {
      (where.shipperProfile as Record<string, unknown>).vehicleType =
        options.vehicleType;
    }

    const records = await this.prisma.user.findMany({
      where: where as any,
      include: { roles: true },
      take: options?.limit,
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async findShippersNearBy(
    lat: number,
    lng: number,
    options?: {
      maxDistanceKm?: number;
      vehicleTypes?: VehicleType[];
      operatingAreaCode?: string;
      limit?: number;
    },
  ): Promise<User[]> {
    const where: Record<string, unknown> = {
      deletedAt: null,
      roles: { some: { role: 'SHIPPER' } },
      shipperProfile: { isAvailable: true },
    };

    if (options?.vehicleTypes?.length) {
      (where.shipperProfile as Record<string, unknown>).vehicleType = {
        in: options.vehicleTypes,
      };
    }

    if (options?.operatingAreaCode) {
      (where.shipperProfile as Record<string, unknown>).operatingAreas = {
        path: ['codes'],
        array_contains: options.operatingAreaCode,
      };
    }

    const records = await this.prisma.user.findMany({
      where: where as any,
      include: { roles: true, shipperProfile: true },
      take: options?.limit,
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async findShippersByVehicleType(
    vehicleType: VehicleType,
  ): Promise<User[]> {
    const records = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        roles: { some: { role: 'SHIPPER' } },
        shipperProfile: { vehicleType },
      },
      include: { roles: true },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async findShippersByOperatingArea(areaCode: string): Promise<User[]> {
    const records = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        roles: { some: { role: 'SHIPPER' } },
        shipperProfile: {
          operatingAreas: { path: ['codes'], array_contains: areaCode },
        },
      },
      include: { roles: true },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async existsByDriverLicense(driverLicense: string): Promise<boolean> {
    const count = await this.prisma.shipperProfile.count({
      where: { driverLicense },
    });
    return count > 0;
  }

  async existsByLicensePlate(licensePlate: string): Promise<boolean> {
    const count = await this.prisma.shipperProfile.count({
      where: { licensePlate },
    });
    return count > 0;
  }

  async existsByTaxId(taxId: string): Promise<boolean> {
    const [sellerCount, buyerCount] = await Promise.all([
      this.prisma.sellerProfile.count({ where: { taxId } }),
      this.prisma.buyerProfile.count({ where: { taxId } }),
    ]);
    return sellerCount > 0 || buyerCount > 0;
  }

  async existsByBusinessLicense(businessLicense: string): Promise<boolean> {
    const [sellerCount, buyerCount] = await Promise.all([
      this.prisma.sellerProfile.count({ where: { businessLicense } }),
      this.prisma.buyerProfile.count({ where: { businessLicense } }),
    ]);
    return sellerCount > 0 || buyerCount > 0;
  }

  private mapToDomain(record: Record<string, unknown>): User {
    return User.reconstitute({
      id: UserId.create(record.id as string),
      email: Email.create(record.email as string),
      fullName: FullName.create(record.name as string),
      phoneNumber: record.phoneNumber
        ? PhoneNumber.create(record.phoneNumber as string)
        : PhoneNumber.create('0000000000'),
      isActive: record.isActive as boolean,
      createdAt: record.createdAt as Date,
      updatedAt: record.updatedAt as Date,
    });
  }
}
