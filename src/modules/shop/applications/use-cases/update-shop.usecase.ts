import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { NotShopOwnerException, ResourceNotFoundException } from '@common/exceptions';
import {
  IUpdateShopUseCase,
} from '../contracts/IUpdateShopUsecase';
import {
  IRestoreShopUseCase,
  RestoreShopInput,
} from '../contracts/IRestoreShopUsecase';
import {
  IAcceptShopUseCase,
} from '../contracts/IAcceptShopUsecase';
import {
  UpdateShopInput,
  ShopResponse,
} from '../../interfaces/dtos/shop.dto';

@Injectable()
export class UpdateShopUseCase implements IUpdateShopUseCase, IRestoreShopUseCase, IAcceptShopUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: UpdateShopInput): Promise<ShopResponse>;
  async execute(input: RestoreShopInput): Promise<ShopResponse>;
  async execute(shopId: string): Promise<ShopResponse>;
  async execute(
    input: UpdateShopInput | RestoreShopInput | string,
  ): Promise<ShopResponse> {
    if (typeof input === 'string') {
      return this.accept(input);
    }

    if ('shopId' in input && 'ownerId' in input) {
      return this.restore(input);
    }

    return this.update(input);
  }

  private async update(input: UpdateShopInput): Promise<ShopResponse> {
    const ownerId = (input as unknown as Record<string, unknown>).ownerId as string;

    const shop = await this.prisma.shop.findFirst({
      where: { ownerId, deletedAt: null },
    });
    if (!shop) throw new NotShopOwnerException();

    return this.prisma.shop.update({
      where: { ownerId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
      },
    }) as unknown as ShopResponse;
  }

  private async restore(input: RestoreShopInput): Promise<ShopResponse> {
    const shop = await this.prisma.shop.findFirst({
      where: { id: input.shopId, ownerId: input.ownerId },
    });
    if (!shop) throw new ResourceNotFoundException('Shop', input.shopId);

    await this.prisma.shop.update({
      where: { id: input.shopId },
      data: { deletedAt: null },
    });

    return this.prisma.shop.findFirst({
      where: { id: input.shopId, deletedAt: null },
    }) as unknown as ShopResponse;
  }

  private async accept(shopId: string): Promise<ShopResponse> {
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, deletedAt: null },
    });
    if (!shop) throw new ResourceNotFoundException('Shop', shopId);

    return shop as unknown as ShopResponse;
  }
}
