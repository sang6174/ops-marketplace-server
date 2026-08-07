import { Inject, Injectable } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { PRODUCT_PRISMA_REPOSITORY } from '../../infrastructure/repositories/product-prisma.repository';
import { IProductRepository } from '@domain/repository-contracts/product-repository.contract';
import { ResourceNotFoundException } from '@common/exceptions';
import { ProductName } from '@domain/value-objects/ProductName';
import { ProductDescription } from '@domain/value-objects/ProductDescription';
import { ProductOrigin } from '@domain/value-objects/ProductOrigin';
import { ProductPrice } from '@domain/value-objects/ProductPrice';
import { WholesaleInfo } from '@domain/value-objects/WholesaleInfo';
import { ProductSeason } from '@domain/value-objects/ProductSeason';
import { ProductCategory, ProductStatus, ProductUnit } from '@domain/entities/enums.enum';
import {
  DraftState,
  PendingState,
  ActiveState,
  OutOfStockState,
  DiscontinuedState,
} from '@domain/state/ProductState';
import { ProductMapper } from '../../interfaces/mappers/product.mapper';
import {
  UpdateProductInfoInput,
  UpdateProductPriceInput,
  UpdateProductStatusInput,
  UpdateSeasonalInfoInput,
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
export class UpdateProductUseCase {
  constructor(
    @Inject(PRODUCT_PRISMA_REPOSITORY)
    private readonly productRepo: IProductRepository,
  ) {}

  async updateInfo(input: UpdateProductInfoInput): Promise<ProductResponse> {
    const product = await this.loadAndVerifyOwnership(
      input.productId,
      input.sellerId,
    );

    product.updateInfo({
      name: input.name !== undefined ? ProductName.create(input.name) : undefined,
      description:
        input.description !== undefined
          ? ProductDescription.create(input.description)
          : undefined,
      category: input.category as ProductCategory,
      unit: input.unit as ProductUnit,
      origin:
        input.origin !== undefined
          ? ProductOrigin.create(input.origin)
          : undefined,
    });

    const saved = await this.productRepo.save(product);
    return ProductMapper.toResponse(saved);
  }

  async updatePrice(input: UpdateProductPriceInput): Promise<ProductResponse> {
    const product = await this.loadAndVerifyOwnership(
      input.productId,
      input.sellerId,
    );

    const retailPrice =
      input.retailPrice !== undefined
        ? ProductPrice.fromNumber(input.retailPrice)
        : undefined;

    let wholesaleInfo: WholesaleInfo | null | undefined;
    if (
      input.wholesalePrice !== undefined &&
      input.minWholesaleQuantity !== undefined
    ) {
      wholesaleInfo = WholesaleInfo.create(
        ProductPrice.fromNumber(input.wholesalePrice),
        input.minWholesaleQuantity,
      );
    } else if (
      input.wholesalePrice === undefined &&
      input.minWholesaleQuantity === undefined
    ) {
      wholesaleInfo = undefined;
    } else {
      wholesaleInfo = null;
    }

    product.updatePricing({ retailPrice, wholesaleInfo });

    const saved = await this.productRepo.save(product);
    return ProductMapper.toResponse(saved);
  }

  async updateStatus(
    input: UpdateProductStatusInput,
  ): Promise<ProductResponse> {
    const product = await this.loadAndVerifyOwnership(
      input.productId,
      input.sellerId,
    );

    const StateClass = STATUS_STATE_MAP[input.status];
    if (!StateClass) {
      throw new Error(`Unknown status: ${input.status}`);
    }

    product.setState(new StateClass());

    const saved = await this.productRepo.save(product);
    return ProductMapper.toResponse(saved);
  }

  async updateSeasonalInfo(
    input: UpdateSeasonalInfoInput,
  ): Promise<ProductResponse> {
    const product = await this.loadAndVerifyOwnership(
      input.productId,
      input.sellerId,
    );

    const season =
      input.isSeasonal && input.seasonStart && input.seasonEnd
        ? ProductSeason.create(input.seasonStart, input.seasonEnd)
        : null;

    product.updateSeason(season);

    const saved = await this.productRepo.save(product);
    return ProductMapper.toResponse(saved);
  }

  async publish(input: {
    productId: string;
    sellerId: string;
  }): Promise<ProductResponse> {
    const product = await this.loadAndVerifyOwnership(
      input.productId,
      input.sellerId,
    );

    product.publish();

    const saved = await this.productRepo.save(product);
    return ProductMapper.toResponse(saved);
  }

  async unpublish(input: {
    productId: string;
    sellerId: string;
  }): Promise<ProductResponse> {
    const product = await this.loadAndVerifyOwnership(
      input.productId,
      input.sellerId,
    );

    product.unpublish();

    const saved = await this.productRepo.save(product);
    return ProductMapper.toResponse(saved);
  }

  async approve(
    productId: string,
    _adminId: string,
  ): Promise<ProductResponse> {
    const product = await this.productRepo.findById(productId);

    if (!product) {
      throw new ResourceNotFoundException('Product', productId);
    }

    product.confirmByAdmin();

    const saved = await this.productRepo.save(product);
    return ProductMapper.toResponse(saved);
  }

  async reject(
    productId: string,
    _adminId: string,
  ): Promise<ProductResponse> {
    const product = await this.productRepo.findById(productId);

    if (!product) {
      throw new ResourceNotFoundException('Product', productId);
    }

    product.unpublish();

    const saved = await this.productRepo.save(product);
    return ProductMapper.toResponse(saved);
  }

  private async loadAndVerifyOwnership(
    productId: string,
    sellerId: string,
  ) {
    const product = await this.productRepo.findById(productId);

    if (!product) {
      throw new ResourceNotFoundException('Product', productId);
    }

    if (product.sellerId !== sellerId) {
      throw new ForbiddenException('Access denied');
    }

    return product;
  }
}
