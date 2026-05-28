// src/modules/shop/shops.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@infrastructure/generated/prisma/enums';
import { GetUser, Public, Roles } from '@common/decorators';
import { AuthUser } from '@modules/auth/dtos/auth.dto';
import { ShopsService } from './shops.service';
import { ProductsService } from '../product/products.service';
import {
  CreateShopDto,
  UpdateShopDto,
  QueryShopsDto,
  QueryShopProductsDto,
} from './dtos/shop.dto';
import { JwtAuthGuard } from '../auth/guards';
import {
  CreateProductDto,
  UpdateProductDto,
  AddVariantDto,
  UpdateVariantDto,
  AdjustInventoryDto,
} from '@modules/product/dtos/product.dto';

@ApiTags('Shops')
@Controller('shops')
export class ShopsController {
  constructor(
    private readonly shopsService: ShopsService,
    private readonly productsService: ProductsService,
  ) {}

  // POST /shops  (seller only)
  @Post()
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.SELLER)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: '[SELLER] Create a new shop' })
  create(@GetUser() user: AuthUser, @Body() dto: CreateShopDto) {
    return this.shopsService.create(user.id, dto);
  }

  // GET /shops/me  (seller only)
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.SELLER)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: '[SELLER] View your own shop' })
  getMyShop(@GetUser() user: AuthUser) {
    return this.shopsService.getMyShop(user.id);
  }

  // PATCH /shops/:id/me  (seller only)
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.SELLER)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: '[SELLER] Update your shop' })
  update(@GetUser() user: AuthUser, @Body() dto: UpdateShopDto) {
    return this.shopsService.update(user.id, dto);
  }

  // POST /shops/me/product
  @Post('me/product')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.SELLER)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: '[SELLER] Create a new product' })
  createProduct(@GetUser() user: AuthUser, @Body() dto: CreateProductDto) {
    return this.productsService.createProduct(user.id, dto);
  }

  // Patch /shops/me/products/:id/launch
  @Patch('me/products/:id/launch')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.SELLER)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: '[SELLER] Launch a product' })
  publishProduct(@GetUser() user: AuthUser, @Param('id') id: string) {
    return this.productsService.publishProduct(user.id, id);
  }

  // PATCH /shops/me/products/:id/archive
  @Patch('me/products/:id/archive')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.SELLER)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: '[SELLER] Archive product',
    description:
      'Mark a product as archived. Archived products are no longer visible or purchasable but remain in the system for historical and audit purposes.',
  })
  archiveProduct(@GetUser() user: AuthUser, @Param('id') id: string) {
    return this.productsService.archiveProduct(user.id, id);
  }

  // PATCH /shops/me/products/:id
  @Patch('me/products/:id')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.SELLER)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: '[SELLER] Update a product' })
  updateProduct(
    @GetUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.updateProduct(user.id, id, dto);
  }

  // POST /shops/me/products/:id/variants
  @Post('me/products/:id/variants')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.SELLER)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: '[SELLER] Add a new variant of a product' })
  addVariant(
    @GetUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AddVariantDto,
  ) {
    return this.productsService.addVariant(user.id, id, dto);
  }

  // PATCH /shops/me/products/:id/variants/:vid
  @Patch('me/products/:id/variants/:vid')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.SELLER)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: '[SELLER] Update a variant of a product' })
  updateVariant(
    @GetUser() user: AuthUser,
    @Param('id') id: string,
    @Param('vid') vid: string,
    @Body() dto: UpdateVariantDto,
  ) {
    return this.productsService.updateVariant(user.id, id, vid, dto);
  }

  // PATCH /shops/me/products/:id/variants/:vid
  @Patch('me/products/:id/variant/:vid')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.SELLER)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: '[SELLER] Cancel sales of a variant of a product' })
  deleteVariant(
    @GetUser() user: AuthUser,
    @Param('id') id: string,
    @Param('vid') vid: string,
  ) {
    return this.productsService.deleteVariant(user.id, id, vid);
  }

  // PATCH /shops/me/products/:id/variants/:vid/inventory
  @Patch('me/products/:id/variants/:vid/inventory')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.SELLER)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: '[SELLER] Update inventory of a product' })
  adjustInventory(
    @GetUser() user: AuthUser,
    @Param('id') id: string,
    @Param('vid') vid: string,
    @Body() dto: AdjustInventoryDto,
  ) {
    return this.productsService.adjustInventory(user.id, id, vid, dto);
  }

  // GET /shops  (public)
  @Public()
  @Get()
  @ApiOperation({ summary: 'Get shop list' })
  findAll(@Query() dto: QueryShopsDto) {
    return this.shopsService.findAll(dto);
  }

  // GET /shops/:id/products  (public)
  @Public()
  @Get(':id/products')
  @ApiOperation({ summary: 'Get products of a shop' })
  findProducts(@Param('id') id: string, @Query() dto: QueryShopProductsDto) {
    return this.shopsService.findProducts(id, dto);
  }

  // GET /shops/:id  (public)
  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Details of a shop' })
  findOne(@Param('id') id: string) {
    return this.shopsService.findOne(id);
  }
}

@ApiTags('Seller Shops')
@ApiBearerAuth('JWT')
@Controller('seller/shop')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.SELLER)
export class SellerShopController {
  constructor(private readonly shopsService: ShopsService) {}

  // GET /seller/shop
  @Get()
  @ApiOperation({ summary: '[SELLER] Get my shop' })
  getMyShop(@GetUser() user: AuthUser) {
    return this.shopsService.getMyShop(user.id);
  }

  // POST /seller/shop
  @Post()
  @ApiOperation({ summary: '[SELLER] Create my shop' })
  createMyShop(@GetUser() user: AuthUser, @Body() dto: CreateShopDto) {
    return this.shopsService.createMyShop(user.id, dto);
  }

  // PUT /seller/shop
  @Put()
  @ApiOperation({ summary: '[SELLER] Update my shop' })
  updateMyShop(@GetUser() user: AuthUser, @Body() dto: UpdateShopDto) {
    return this.shopsService.updateMyShop(user.id, dto);
  }

  // GET /seller/shop/stats
  @Get('stats')
  @ApiOperation({ summary: '[SELLER] Get my shop stats' })
  getMyStats(@GetUser() user: AuthUser) {
    return this.shopsService.getMyStats(user.id);
  }
}
