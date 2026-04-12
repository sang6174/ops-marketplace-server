// src/modules/inventory/inventories.controller.ts

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards';
import { Public } from '@common/decorators';
import { InventoryService } from './inventories.service';
import { AdjustInventoryDto, QueryInventoryDto } from './dtos/inventory.dto';

@ApiTags('Inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List inventory records' })
  listInventory(@Query() dto: QueryInventoryDto) {
    return this.inventoryService.listInventory(dto);
  }

  @Public()
  @Get(':variantId')
  @ApiOperation({ summary: 'Get inventory for a specific variant' })
  getInventory(@Param('variantId') variantId: string) {
    return this.inventoryService.getInventory(variantId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Patch(':variantId')
  @ApiOperation({ summary: 'Adjust inventory counts for a variant' })
  adjustInventory(
    @Param('variantId') variantId: string,
    @Body() dto: AdjustInventoryDto,
  ) {
    return this.inventoryService.adjustInventory(variantId, dto);
  }
}
