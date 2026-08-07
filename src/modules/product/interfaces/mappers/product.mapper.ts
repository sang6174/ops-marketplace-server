import { Product } from '@domain/entities/products/Product';
import { ProductId } from '@domain/value-objects/ProductId';
import { ProductName } from '@domain/value-objects/ProductName';
import { ProductDescription } from '@domain/value-objects/ProductDescription';
import { ProductOrigin } from '@domain/value-objects/ProductOrigin';
import { ProductPrice } from '@domain/value-objects/ProductPrice';
import { WholesaleInfo } from '@domain/value-objects/WholesaleInfo';
import { ProductSeason } from '@domain/value-objects/ProductSeason';
import { ProductCertification } from '@domain/value-objects/ProductCertification';
import { ProductFilters } from '@domain/repository-contracts/product-repository.contract';
import {
  CreateProductInput,
  GetProductsInput,
  ProductResponse,
} from '../dtos/product.dto';

export class ProductMapper {
  static toResponse(product: Product): ProductResponse {
    return {
      id: product.id.value,
      sellerId: product.sellerId,
      category: product.category,
      status: product.status,
      name: product.name.value,
      unit: product.unit,
      retailPrice: product.retailPrice.amount,
      wholesalePrice: product.wholesaleInfo?.wholesalePrice.amount,
      minWholesaleQuantity: product.wholesaleInfo?.minQuantity,
      description: product.description.value,
      origin: product.origin.value,
      isSeasonal: product.season !== null,
      seasonStart: product.season?.start,
      seasonEnd: product.season?.end,
      certifications: product.certifications.items.map((c) => c.value),
      images: [],
      isCurrentlyInSeason: product.isInSeason(),
      hasWholesale: product.hasWholesale(),
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  static toDomain(input: CreateProductInput) {
    const wholesaleInfo =
      input.wholesalePrice !== undefined &&
      input.minWholesaleQuantity !== undefined
        ? WholesaleInfo.create(
            ProductPrice.fromNumber(input.wholesalePrice),
            input.minWholesaleQuantity,
          )
        : undefined;

    const season =
      input.isSeasonal && input.seasonStart && input.seasonEnd
        ? ProductSeason.create(input.seasonStart, input.seasonEnd)
        : undefined;

    return {
      id: ProductId.generate(),
      sellerId: input.sellerId,
      category: input.category,
      unit: input.unit,
      name: ProductName.create(input.name),
      description: ProductDescription.create(input.description),
      retailPrice: ProductPrice.fromNumber(input.retailPrice),
      wholesaleInfo,
      origin: ProductOrigin.create(input.origin),
      season,
      certifications: input.certifications.map((c) =>
        ProductCertification.create(c),
      ),
    };
  }

  static toFilters(input: GetProductsInput): ProductFilters {
    return {
      sellerId: input.sellerId,
      category: input.category,
      status: input.status,
      isSeasonal: input.isSeasonal,
      minPrice: input.minPrice,
      maxPrice: input.maxPrice,
    };
  }
}
