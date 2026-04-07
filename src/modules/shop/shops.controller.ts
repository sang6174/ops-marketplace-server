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
import { GetUser, Public, Roles } from '@common/decorators';
import { AuthUser } from '@modules/auth/dtos/auth.dto';
import { ShopsService } from './shops.service';
import { CreateShopDto, UpdateShopDto, QueryShopsDto } from './dtos/shop.dto';
import { JwtAuthGuard } from '../auth/guards';

@ApiTags('Shops')
@Controller('shops')
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  // POST /shops  (seller only)
  @Post()
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.SELLER)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: '[Seller] Tạo shop' })
  create(@GetUser() user: AuthUser, @Body() dto: CreateShopDto) {
    return this.shopsService.create(user.id, dto);
  }

  // GET /shops/me  (seller only)
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.SELLER)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: '[Seller] Xem shop của mình' })
  getMyShop(@GetUser() user: AuthUser) {
    return this.shopsService.getMyShop(user.id);
  }

  // PATCH /shops/me  (seller only)
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.SELLER)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: '[Seller] Cập nhật shop' })
  update(@GetUser() user: AuthUser, @Body() dto: UpdateShopDto) {
    return this.shopsService.update(user.id, dto);
  }

  // GET /shops  (public)
  @Public()
  @Get()
  @ApiOperation({ summary: 'Danh sách shops' })
  findAll(@Query() dto: QueryShopsDto) {
    return this.shopsService.findAll(dto);
  }

  // GET /shops/:id  (public)
  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết shop' })
  findOne(@Param('id') id: string) {
    return this.shopsService.findOne(id);
  }
}
