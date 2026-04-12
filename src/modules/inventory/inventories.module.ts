// src/modules/inventory/inventories.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/prisma/prisma.module';
import { InventoryController } from './inventories.controller';
import { InventoryService } from './inventories.service';

@Module({
  imports: [PrismaModule],
  providers: [InventoryService],
  controllers: [InventoryController],
})
export class InventoryModule {}
