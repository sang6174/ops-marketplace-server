import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { CartStatus } from '@infrastructure/generated/prisma/enums';
import { BadRequestException } from '@nestjs/common';
import {
  IGetCartUseCase,
} from '../contracts/IGetCartUsecase';
import {
  GetCartInput,
  CartResponse,
} from '../../interfaces/dtos/cart.dto';

@Injectable()
export class GetCartUseCase implements IGetCartUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: GetCartInput): Promise<CartResponse> {
    const cart = await this.findOrCreateCart(input.userId);
    return this.getCartById(cart.id);
  }

  private async getCartById(cartId: string) {
    return this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            product: {
              include: {
                inventory: true,
                images: {
                  orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
                },
                shop: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    }) as unknown as CartResponse;
  }

  private async findOrCreateCart(userId?: string) {
    if (!userId) throw new BadRequestException('User ID is required');

    const existingCart = await this.prisma.cart.findFirst({
      where: { userId, status: CartStatus.ACTIVE },
    });

    if (existingCart) return existingCart;

    return this.prisma.cart.create({
      data: {
        userId,
        status: CartStatus.ACTIVE,
      },
    });
  }
}
