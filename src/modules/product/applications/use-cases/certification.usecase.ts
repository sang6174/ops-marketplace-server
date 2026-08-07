import { Inject, Injectable } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { PRODUCT_PRISMA_REPOSITORY } from '../../infrastructure/repositories/product-prisma.repository';
import { IProductRepository } from '@domain/repository-contracts/product-repository.contract';
import { ResourceNotFoundException } from '@common/exceptions';
import { ProductCertification } from '@domain/value-objects/ProductCertification';
import { ProductMapper } from '../../interfaces/mappers/product.mapper';
import {
  AddCertificationInput,
  RemoveCertificationInput,
  ProductResponse,
} from '../../interfaces/dtos/product.dto';

@Injectable()
export class CertificationUseCase {
  constructor(
    @Inject(PRODUCT_PRISMA_REPOSITORY)
    private readonly productRepo: IProductRepository,
  ) {}

  async addCertification(
    input: AddCertificationInput,
  ): Promise<ProductResponse> {
    const product = await this.loadAndVerifyOwnership(
      input.productId,
      input.sellerId,
    );

    product.addCertification(
      ProductCertification.create(input.certification),
    );

    const saved = await this.productRepo.save(product);
    return ProductMapper.toResponse(saved);
  }

  async removeCertification(
    input: RemoveCertificationInput,
  ): Promise<ProductResponse> {
    const product = await this.loadAndVerifyOwnership(
      input.productId,
      input.sellerId,
    );

    product.removeCertification(
      ProductCertification.create(input.certification),
    );

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
