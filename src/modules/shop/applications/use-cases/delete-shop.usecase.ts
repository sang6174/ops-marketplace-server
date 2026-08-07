import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { NotShopOwnerException } from '@common/exceptions';
import {
  IDeleteShopUseCase,
  DeleteShopInput,
} from '../contracts/IDeleteShopUsecase';

@Injectable()
export class DeleteShopUseCase implements IDeleteShopUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: DeleteShopInput): Promise<void> {
    const shop = await this.prisma.shop.findFirst({
      where: { id: input.shopId, ownerId: input.ownerId, deletedAt: null },
    });

    if (!shop) throw new NotShopOwnerException();

    await this.prisma.shop.update({
      where: { id: input.shopId },
      data: { deletedAt: new Date() },
    });
  }
}
