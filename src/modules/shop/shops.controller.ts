// src/modules/shop/shops.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@infrastructure/generated/prisma/enums';
import { GetUser, Public, Roles, Permissions } from '@common/decorators';
import { Permission } from '@common/constants/permissions';
import { AuthUser } from '@modules/auth/dtos/auth.dto';
import { ShopsService } from './shops.service';
import { ProductsService } from '../product/products.service';
import { CreateShopDto, UpdateShopDto, QueryShopsDto } from './dtos/shop.dto';
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
  @Permissions(Permission.SHOP_CREATE)
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

  // PATCH /shops/me  (seller only)
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.SELLER)
  @Permissions(Permission.SHOP_UPDATE)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: '[SELLER] Update your shop' })
  update(@GetUser() user: AuthUser, @Body() dto: UpdateShopDto) {
    return this.shopsService.update(user.id, dto);
  }

  // POST /shops/me/product
  @Post('me/product')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.SELLER)
  @Permissions(Permission.PRODUCT_CREATE)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: '[SELLER] Create a new product' })
  createProduct(@GetUser() user: AuthUser, @Body() dto: CreateProductDto) {
    return this.productsService.createProduct(user.id, dto);
  }

  // PATCH /shops/me/products/:id/launch
  @Patch('me/products/:id/launch')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.SELLER)
  @Permissions(Permission.PRODUCT_UPDATE)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: '[SELLER] Launch a product' })
  archiveProduct(@GetUser() user: AuthUser, @Param('id') id: string) {
    return this.productsService.archiveProduct(user.id, id);
  }

  // PATCH /shops/me/products/:id
  @Patch('me/products/:id')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.SELLER)
  @Permissions(Permission.PRODUCT_UPDATE)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: '[SELLER] Update a product' })
  updateProduct(
    @GetUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.updateProduct(user.id, id, dto);
  }

  // Patch /shops/me/products/:id/publish
  @Patch('me/products/:id')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.SELLER)
  @Permissions(Permission.PRODUCT_UPDATE)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: '[SELLER] Update info of the product' })
  publishProduct(@GetUser() user: AuthUser, @Param('id') id: string) {
    return this.productsService.publishProduct(user.id, id);
  }

  // POST /shops/me/products/:id/variants
  @Post('me/products/:id/variants')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.SELLER)
  @Permissions(Permission.PRODUCT_UPDATE)
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
  @Permissions(Permission.PRODUCT_UPDATE)
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
  @Permissions(Permission.PRODUCT_UPDATE)
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
  @Permissions(Permission.INVENTORY_UPDATE)
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

  // GET /shops/:id  (public)
  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Details of a shop' })
  findOne(@Param('id') id: string) {
    return this.shopsService.findOne(id);
  }
}
