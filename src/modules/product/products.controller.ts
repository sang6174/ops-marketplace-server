// src/modules/product/products.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public, GetUser, Roles } from '@common/decorators';
import { UserRole } from '@infrastructure/generated/prisma/enums';
import { AuthUser } from '@modules/auth/dtos/auth.dto';
import { JwtAuthGuard } from '../auth/guards';
import { ProductsService } from './products.service';
import {
  BulkUpdateInventoryDto,
  CreateProductDto,
  CreateProductImageDto,
  QueryProductsDto,
  SellerUpdateProductDto,
  SetInventoryDto,
} from './dtos/product.dto';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get product list' })
  listProducts(@Query() dto: QueryProductsDto) {
    return this.productsService.listProducts(dto);
  }

  @Public()
  @Get('featured')
  @ApiOperation({ summary: 'Get featured products' })
  listFeaturedProducts(@Query() dto: QueryProductsDto) {
    return this.productsService.listFeaturedProducts(dto);
  }

  @Public()
  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get product by slug' })
  getProductBySlug(@Param('slug') slug: string) {
    return this.productsService.getProductBySlug(slug);
  }

  @Public()
  @Get(':id/reviews')
  @ApiOperation({ summary: 'Get product reviews' })
  getReviews(@Param('id') productId: string, @Query() dto: QueryProductsDto) {
    return this.productsService.getReviews(productId, dto);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get product by id' })
  getProduct(@Param('id') id: string) {
    return this.productsService.getProduct(id);
  }
}

@ApiTags('Seller Products')
@ApiBearerAuth('JWT')
@Controller('seller')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.SELLER)
export class SellerProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('products')
  @ApiOperation({ summary: '[SELLER] Get my products' })
  listMyProducts(@GetUser() user: AuthUser, @Query() dto: QueryProductsDto) {
    return this.productsService.listMyProducts(user.id, dto);
  }

  @Post('products')
  @ApiOperation({ summary: '[SELLER] Create product as draft' })
  createProduct(@GetUser() user: AuthUser, @Body() dto: CreateProductDto) {
    return this.productsService.createProduct(user.id, dto);
  }

  @Put('products/:id')
  @ApiOperation({ summary: '[SELLER] Update product' })
  updateProduct(
    @GetUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SellerUpdateProductDto,
  ) {
    return this.productsService.updateProduct(user.id, id, dto);
  }

  @Delete('products/:id')
  @ApiOperation({ summary: '[SELLER] Soft delete product' })
  deleteProduct(@GetUser() user: AuthUser, @Param('id') id: string) {
    return this.productsService.deleteProduct(user.id, id);
  }

  @Post('products/:id/publish')
  @ApiOperation({ summary: '[SELLER] Publish product' })
  publishProduct(@GetUser() user: AuthUser, @Param('id') id: string) {
    return this.productsService.publishProduct(user.id, id);
  }

  @Post('products/:id/unpublish')
  @ApiOperation({ summary: '[SELLER] Unpublish product' })
  unpublishProduct(@GetUser() user: AuthUser, @Param('id') id: string) {
    return this.productsService.unpublishProduct(user.id, id);
  }

  @Post('products/:id/archive')
  @ApiOperation({ summary: '[SELLER] Archive product' })
  archiveProduct(@GetUser() user: AuthUser, @Param('id') id: string) {
    return this.productsService.archiveProduct(user.id, id);
  }

  @Post('products/:id/duplicate')
  @ApiOperation({ summary: '[SELLER] Duplicate product' })
  duplicateProduct(@GetUser() user: AuthUser, @Param('id') id: string) {
    return this.productsService.duplicateProduct(user.id, id);
  }

  @Get('inventory')
  @ApiOperation({ summary: '[SELLER] Get inventory' })
  listInventory(@GetUser() user: AuthUser, @Query() dto: QueryProductsDto) {
    return this.productsService.listInventory(user.id, dto);
  }

  @Put('inventory/:productId')
  @ApiOperation({ summary: '[SELLER] Update stock for a product' })
  updateInventory(
    @GetUser() user: AuthUser,
    @Param('productId') productId: string,
    @Body() dto: SetInventoryDto,
  ) {
    return this.productsService.updateInventory(user.id, productId, dto);
  }

  @Post('inventory/bulk-update')
  @ApiOperation({ summary: '[SELLER] Bulk update inventory' })
  bulkUpdateInventory(
    @GetUser() user: AuthUser,
    @Body() dto: BulkUpdateInventoryDto,
  ) {
    return this.productsService.bulkUpdateInventory(user.id, dto);
  }

  @Post('products/:id/images')
  @ApiOperation({ summary: '[SELLER] Add product image by URL' })
  addProductImage(
    @GetUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateProductImageDto,
  ) {
    return this.productsService.addProductImage(user.id, id, dto);
  }

  @Delete('products/images/:id')
  @ApiOperation({ summary: '[SELLER] Delete product image' })
  deleteProductImage(@GetUser() user: AuthUser, @Param('id') id: string) {
    return this.productsService.deleteProductImage(user.id, id);
  }

  @Put('products/images/:id/primary')
  @ApiOperation({ summary: '[SELLER] Set primary product image' })
  setPrimaryProductImage(@GetUser() user: AuthUser, @Param('id') id: string) {
    return this.productsService.setPrimaryProductImage(user.id, id);
  }
}
