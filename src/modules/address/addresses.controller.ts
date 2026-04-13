// src/module/address/addresses.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '@common/decorators';
import { AuthUser } from '@modules/auth/dtos/auth.dto';
import { JwtAuthGuard } from '../auth/guards';
import { AddressesService } from './addresses.service';
import { CreateAddressDto, UpdateAddressDto } from './dtos/address.dto';

@ApiTags('Addresses')
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: '[BUYER] Create new address' })
  createAddress(@GetUser() user: AuthUser, @Body() dto: CreateAddressDto) {
    return this.addressesService.createAddress(user.id, dto);
  }

  @Get('default')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: '[BUYER] Get default address' })
  getDefaultAddress(@GetUser() user: AuthUser) {
    return this.addressesService.getDefaultAddress(user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: '[BUYER] List user addresses' })
  listAddresses(@GetUser() user: AuthUser) {
    return this.addressesService.listAddresses(user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: '[BUYER] Get address details' })
  getAddress(@GetUser() user: AuthUser, @Param('id') addressId: string) {
    return this.addressesService.getAddress(user.id, addressId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: '[BUYER] Update address' })
  updateAddress(
    @GetUser() user: AuthUser,
    @Param('id') addressId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressesService.updateAddress(user.id, addressId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[BUYER] Delete address (soft delete)' })
  deleteAddress(@GetUser() user: AuthUser, @Param('id') addressId: string) {
    return this.addressesService.deleteAddress(user.id, addressId);
  }

  @Patch(':id/set-default')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[BUYER] Set address as default' })
  setDefaultAddress(@GetUser() user: AuthUser, @Param('id') addressId: string) {
    return this.addressesService.setDefaultAddress(user.id, addressId);
  }
}
