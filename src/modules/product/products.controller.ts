// src/modules/shop/shops.controller.ts
import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@common/decorators';
import { ProductsService } from './products.service';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get a product list' })
  listProduct() {
    return this.productsService.listProducts();
  }

  @Public()
  @Get(':id/')
  @ApiOperation({ summary: 'Get a product, and also get product variants' })
  getProduct(@Param('id') id: string) {
    console.log(id);
    return this.productsService.getProduct(id);
  }

  @Public()
  @Get(':id/variants')
  @ApiOperation({ summary: 'Get variant products' })
  getVariants(@Param('id') productId: string) {
    return this.productsService.getVariants(productId);
  }
}
