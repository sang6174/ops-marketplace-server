// src/modules/shop/shops.module.ts
import { Module } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { PrismaProvider } from '@/infrastructure/prisma/prisma.provider';
import { ShopsController } from './shops.controller';
import { ShopsService } from './shops.service';

@Module({
  controllers: [ShopsController],
  providers: [ShopsService, PrismaService, PrismaProvider],
  exports: [ShopsService],
})
export class ShopsModule {}
