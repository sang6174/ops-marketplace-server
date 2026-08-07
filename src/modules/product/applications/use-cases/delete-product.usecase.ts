import { Inject, Injectable } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { PRODUCT_PRISMA_REPOSITORY } from '../../infrastructure/repositories/product-prisma.repository';
import { IProductRepository } from '@domain/repository-contracts/product-repository.contract';
import { ResourceNotFoundException } from '@common/exceptions';
import { ProductStatus } from '@domain/entities/enums.enum';
import {
  DraftState,
  PendingState,
  ActiveState,
  OutOfStockState,
  DiscontinuedState,
} from '@domain/state/ProductState';
import { ProductMapper } from '../../interfaces/mappers/product.mapper';
import {
  BulkUpdateStatusInput,
  ProductResponse,
} from '../../interfaces/dtos/product.dto';

const STATUS_STATE_MAP: Record<string, new () => DraftState | PendingState | ActiveState | OutOfStockState | DiscontinuedState> = {
  [ProductStatus.DRAFT]: DraftState,
  [ProductStatus.PENDING]: PendingState,
  [ProductStatus.ACTIVE]: ActiveState,
  [ProductStatus.OUT_OF_STOCK]: OutOfStockState,
  [ProductStatus.DISCONTINUED]: DiscontinuedState,
};

@Injectable()
export class DeleteProductUseCase {
  constructor(
    @Inject(PRODUCT_PRISMA_REPOSITORY)
    private readonly productRepo: IProductRepository,
  ) {}

  async delete(input: {
    productId: string;
    sellerId: string;
  }): Promise<void> {
    const product = await this.productRepo.findById(input.productId);

    if (!product) {
      throw new ResourceNotFoundException('Product', input.productId);
    }

    if (product.sellerId !== input.sellerId) {
      throw new ForbiddenException('Access denied');
    }

    await this.productRepo.delete(input.productId);
  }

  async bulkUpdateStatus(
    input: BulkUpdateStatusInput,
  ): Promise<ProductResponse[]> {
    const StateClass = STATUS_STATE_MAP[input.status];
    if (!StateClass) {
      throw new Error(`Unknown status: ${input.status}`);
    }

    const results: ProductResponse[] = [];

    for (const productId of input.productIds) {
      const product = await this.productRepo.findById(productId);

      if (!product) {
        throw new ResourceNotFoundException('Product', productId);
      }

      if (product.sellerId !== input.sellerId) {
        throw new ForbiddenException('Access denied');
      }

      product.setState(new StateClass());
      const saved = await this.productRepo.save(product);
      results.push(ProductMapper.toResponse(saved));
    }

    return results;
  }
}
