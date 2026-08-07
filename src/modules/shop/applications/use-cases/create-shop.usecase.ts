import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { IShopRepository } from '@domain/repository-contracts/shop-repository.contract';
import { ShopAlreadyExistsException } from '@common/exceptions';
import {
  SHOP_PRISMA_REPOSITORY,
} from '../../infrastructure/repositories/shop-prisma.repository';
import {
  ICreateShopUseCase,
} from '../contracts/ICreateShopUsecase';
import {
  ICheckShopNameAvailabilityUseCase,
  CheckShopNameInput,
} from '../contracts/ICheckShopNameUsecase';
import {
  CreateShopInput,
  ShopResponse,
} from '../../interfaces/dtos/shop.dto';

@Injectable()
export class CreateShopUseCase implements ICreateShopUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(SHOP_PRISMA_REPOSITORY)
    private readonly shopRepo: IShopRepository,
  ) {}

  async execute(input: CreateShopInput): Promise<ShopResponse> {
    const ownerId = (input as unknown as Record<string, unknown>).ownerId as string;

    const existing = await this.prisma.shop.findUnique({
      where: { ownerId },
    });
    if (existing) throw new ShopAlreadyExistsException();

    return this.prisma.shop.create({
      data: {
        ownerId,
        name: input.name,
        description: input.description,
      },
    }) as unknown as ShopResponse;
  }
}

@Injectable()
export class CheckShopNameUseCase implements ICheckShopNameAvailabilityUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: CheckShopNameInput): Promise<{ available: boolean }> {
    const where: Record<string, unknown> = {
      name: input.name,
      ownerId: input.ownerId,
      deletedAt: null,
    };

    if (input.excludeShopId) {
      where.id = { not: input.excludeShopId };
    }

    const existing = await this.prisma.shop.findFirst({ where });
    return { available: !existing };
  }
}
