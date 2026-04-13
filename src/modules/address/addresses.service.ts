// src/module/address/addresses.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { ResourceNotFoundException } from '@common/exceptions';
import { CreateAddressDto, UpdateAddressDto } from './dtos/address.dto';

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  async createAddress(userId: string, dto: CreateAddressDto) {
    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDeleted: false },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.create({
      data: {
        userId,
        addressLine: dto.addressLine,
        city: dto.city,
        country: dto.country,
        isDefault: dto.isDefault ?? false,
      },
    });
  }

  async getAddress(userId: string, addressId: string) {
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, userId, isDeleted: false },
    });

    if (!address) {
      throw new ResourceNotFoundException('Address', addressId);
    }

    return address;
  }

  async listAddresses(userId: string) {
    return this.prisma.address.findMany({
      where: { userId, isDeleted: false },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async updateAddress(
    userId: string,
    addressId: string,
    dto: UpdateAddressDto,
  ) {
    await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.address.updateMany({
          where: {
            userId,
            isDeleted: false,
            NOT: { id: addressId },
          },
          data: { isDefault: false },
        });
      }

      const updated = await tx.address.updateMany({
        where: {
          id: addressId,
          userId,
          isDeleted: false,
        },
        data: {
          addressLine: dto.addressLine,
          city: dto.city,
          country: dto.country,
          isDefault: dto.isDefault,
        },
      });

      if (updated.count === 0) {
        throw new ResourceNotFoundException('Address', addressId);
      }
    });
  }

  async deleteAddress(userId: string, addressId: string) {
    await this.getAddress(userId, addressId);

    return this.prisma.address.update({
      where: { id: addressId },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  async setDefaultAddress(userId: string, addressId: string) {
    await this.getAddress(userId, addressId);

    await this.prisma.address.updateMany({
      where: { userId, isDeleted: false },
      data: { isDefault: false },
    });

    return this.prisma.address.update({
      where: { id: addressId },
      data: { isDefault: true },
    });
  }

  async getDefaultAddress(userId: string) {
    return this.prisma.address.findFirst({
      where: { userId, isDeleted: false, isDefault: true },
    });
  }
}
