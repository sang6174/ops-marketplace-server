import { Inject, Injectable } from '@nestjs/common';
import { PRODUCT_PRISMA_REPOSITORY } from '../../infrastructure/repositories/product-prisma.repository';
import { IProductRepository } from '@domain/repository-contracts/product-repository.contract';
import { ResourceNotFoundException } from '@common/exceptions';
import { ForbiddenException } from '@nestjs/common';
import { ProductMapper } from '../../interfaces/mappers/product.mapper';
import {
  GetProductByIdInput,
  GetProductsInput,
  ProductListResponse,
  ProductResponse,
} from '../../interfaces/dtos/product.dto';

@Injectable()
export class GetProductUseCase {
  constructor(
    @Inject(PRODUCT_PRISMA_REPOSITORY)
    private readonly productRepo: IProductRepository,
  ) {}

  async getById(input: GetProductByIdInput): Promise<ProductResponse> {
    const product = await this.productRepo.findById(input.productId);

    if (!product) {
      throw new ResourceNotFoundException('Product', input.productId);
    }

    if (input.sellerId && product.sellerId !== input.sellerId) {
      throw new ForbiddenException('Access denied');
    }

    return ProductMapper.toResponse(product);
  }

  async getMany(
    input: GetProductsInput,
  ): Promise<ProductListResponse> {
    const filters = ProductMapper.toFilters(input);
    const products = await this.productRepo.findMany(filters);

    const items = products.map((p) => ProductMapper.toResponse(p));

    return {
      items,
      total: items.length,
      limit: input.limit ?? 20,
      offset: input.offset ?? 0,
    };
  }
}
