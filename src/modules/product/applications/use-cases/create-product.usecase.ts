import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { PRODUCT_PRISMA_REPOSITORY } from '../../infrastructure/repositories/product-prisma.repository';
import { IProductRepository } from '@domain/repository-contracts/product-repository.contract';
import { Product } from '@domain/entities/products/Product';
import { NestEventBus } from '@infrastructure/event-bus';
import { ProductPublishedEvent } from '@domain/events/ProductEvents';
import { ResourceNotFoundException } from '@common/exceptions';
import { ICreateProductUseCase } from '../contracts/ICreateProductUsecase';
import { ProductMapper } from '../../interfaces/mappers/product.mapper';
import { CreateProductInput, ProductResponse } from '../../interfaces/dtos/product.dto';
import { ProductStatus } from '@domain/entities/enums.enum';

@Injectable()
export class CreateProductUseCase implements ICreateProductUseCase {
  constructor(
    @Inject(PRODUCT_PRISMA_REPOSITORY)
    private readonly productRepo: IProductRepository,
    private readonly prisma: PrismaService,
    private readonly eventBus: NestEventBus,
  ) {}

  async execute(input: CreateProductInput): Promise<ProductResponse> {
    const shop = await this.prisma.shop.findFirst({
      where: { ownerId: input.sellerId, deletedAt: null },
      select: { id: true },
    });

    if (!shop) throw new ResourceNotFoundException('Shop');

    const params = ProductMapper.toDomain(input);
    const product = Product.create({ ...params, shopId: shop.id });
    const saved = await this.productRepo.save(product);

    if (saved.status === ProductStatus.PENDING || saved.status === ProductStatus.ACTIVE) {
      await this.eventBus.publish(new ProductPublishedEvent(saved.id));
    }

    return ProductMapper.toResponse(saved);
  }
}
