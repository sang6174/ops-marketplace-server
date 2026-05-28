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
  AddVariantDto,
  BulkUpdateInventoryDto,
  CreateProductDto,
  CreateProductImageDto,
  CreateVariantImageDto,
  QueryProductsDto,
  SellerUpdateProductDto,
  SetInventoryDto,
  UpdateVariantDto,
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
  @Get(':id/variants')
  @ApiOperation({ summary: 'Get product variants' })
  getVariants(@Param('id') productId: string) {
    return this.productsService.getVariants(productId);
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

  @Get('products/:id/variants')
  @ApiOperation({ summary: '[SELLER] Get product variants' })
  getProductVariants(@GetUser() user: AuthUser, @Param('id') id: string) {
    return this.productsService.getSellerVariants(user.id, id);
  }

  @Post('variants')
  @ApiOperation({ summary: '[SELLER] Create variant' })
  createVariant(@GetUser() user: AuthUser, @Body() dto: AddVariantDto) {
    return this.productsService.createVariant(user.id, dto);
  }

  @Put('variants/:id')
  @ApiOperation({ summary: '[SELLER] Update variant' })
  updateVariant(
    @GetUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateVariantDto,
  ) {
    return this.productsService.updateVariantById(user.id, id, dto);
  }

  @Delete('variants/:id')
  @ApiOperation({ summary: '[SELLER] Delete variant' })
  deleteVariant(@GetUser() user: AuthUser, @Param('id') id: string) {
    return this.productsService.deleteVariantById(user.id, id);
  }

  @Put('variants/:id/default')
  @ApiOperation({ summary: '[SELLER] Set default variant' })
  setDefaultVariant(@GetUser() user: AuthUser, @Param('id') id: string) {
    return this.productsService.setDefaultVariant(user.id, id);
  }

  @Get('inventory')
  @ApiOperation({ summary: '[SELLER] Get inventory' })
  listInventory(@GetUser() user: AuthUser, @Query() dto: QueryProductsDto) {
    return this.productsService.listInventory(user.id, dto);
  }

  @Put('inventory/:variantId')
  @ApiOperation({ summary: '[SELLER] Update stock' })
  updateInventory(
    @GetUser() user: AuthUser,
    @Param('variantId') variantId: string,
    @Body() dto: SetInventoryDto,
  ) {
    return this.productsService.updateInventory(user.id, variantId, dto);
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

  @Post('variants/:id/images')
  @ApiOperation({ summary: '[SELLER] Add variant image by URL' })
  addVariantImage(
    @GetUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateVariantImageDto,
  ) {
    return this.productsService.addVariantImage(user.id, id, dto);
  }
}
