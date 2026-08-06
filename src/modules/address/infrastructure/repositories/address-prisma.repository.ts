import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import {
  ICountryRepository,
  IAdministrativeDivisionRepository,
  IAddressRepository,
} from '@domain/repository-contracts/address-repository.contract';
import {
  Country,
  AdministrativeDivision,
  Address,
} from '@domain/value-objects/Address';

export const ADDRESS_PRISMA_REPOSITORY = 'ADDRESS_PRISMA_REPOSITORY';

@Injectable()
export class AddressPrismaRepository
  implements ICountryRepository, IAdministrativeDivisionRepository, IAddressRepository
{
  constructor(private readonly prisma: PrismaService) {}

  // ΓöÇΓöÇ Shared IBaseRepository methods (satisfy all three interfaces) ΓöÇΓöÇ

  async findById(id: string): Promise<any> {
    const record = await this.prisma.address.findUnique({
      where: { id, deletedAt: null },
    });

    if (!record) return null;

    return this.mapToDomain(record);
  }

  async save(entity: any): Promise<any> {
    if (entity instanceof Country || entity instanceof AdministrativeDivision) {
      return entity;
    }

    const record = entity as Record<string, unknown>;
    const id = record['id'] as string | undefined;

    const prismaData = this.mapToPrisma(entity);
    prismaData.userId = record['userId'];

    if (id) {
      const existing = await this.prisma.address.findUnique({
        where: { id },
      });

      if (existing) {
        await this.prisma.address.update({
          where: { id },
          data: prismaData as any,
        });
        return this.mapToDomain({ ...existing, ...prismaData });
      }
    }

    const userId = record['userId'] as string | undefined;
    if (userId) {
      const count = await this.prisma.address.count({
        where: { userId, deletedAt: null },
      });
      if (count === 0) {
        prismaData.isDefault = true;
      }
    }

    const created = await this.prisma.address.create({ data: prismaData as any });
    return this.mapToDomain(created);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.address.softDelete({ id });
  }

  // ΓöÇΓöÇ ICountryRepository ΓöÇΓöÇ

  getAll(): Country[] {
    return [];
  }

  // ΓöÇΓöÇ IAdministrativeDivisionRepository ΓöÇΓöÇ

  getByCountryAndLevel(
    _countryCode: string,
    _level: number,
  ): AdministrativeDivision[] | null {
    return null;
  }

  // ΓöÇΓöÇ IAddressRepository ΓöÇΓöÇ

  async findByUserId(userId: string): Promise<Address[]> {
    const records = await this.prisma.address.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async findDefaultByUserId(userId: string): Promise<Address | null> {
    const record = await this.prisma.address.findFirst({
      where: { userId, isDefault: true, deletedAt: null },
    });

    if (!record) return null;

    return this.mapToDomain(record);
  }

  async setDefault(addressId: string, userId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.address.updateMany({
        where: { userId, isDefault: true, deletedAt: null },
        data: { isDefault: false },
      });

      await tx.address.update({
        where: { id: addressId },
        data: { isDefault: true },
      });
    });
  }

  // ΓöÇΓöÇ Helpers ΓöÇΓöÇ

  private mapToDomain(record: Record<string, unknown>): Address {
    const countryCode = (record['country'] as string) || 'XX';
    const country = new Country(countryCode, countryCode);

    const cityCode = (record['city'] as string) || '';
    const stateProvince = new AdministrativeDivision(
      country,
      2,
      cityCode,
      cityCode,
    );

    const districtCode = record['district'] as string | null;
    const district = districtCode
      ? new AdministrativeDivision(country, 3, districtCode, districtCode)
      : null;

    const wardCode = record['ward'] as string | null;
    const ward = wardCode
      ? new AdministrativeDivision(country, 4, wardCode, wardCode)
      : null;

    return Address.reconstitute({
      country,
      stateProvince,
      district,
      ward,
      street: (record['street'] as string) ?? '',
      postalCode: (record['postalCode'] as string) ?? '',
      detail: (record['detail'] as string) ?? null,
    });
  }

  private mapToPrisma(entity: any): Record<string, unknown> {
    const data: Record<string, unknown> = {};

    if (entity.country) {
      data.country = entity.country.code;
    }
    if (entity.stateProvince) {
      data.city = entity.stateProvince.code;
    }
    if (entity.district !== undefined) {
      data.district = entity.district ? entity.district.code : null;
    }
    if (entity.ward !== undefined) {
      data.ward = entity.ward ? entity.ward.code : null;
    }
    data.street = entity.street ?? null;
    data.postalCode = entity.postalCode ?? null;
    data.detail = entity.detail ?? null;

    return data;
  }
}
