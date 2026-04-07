import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/prisma/prisma.module';
import { CartsService } from './carts.service';
import { CartsController } from './carts.controller';

@Module({
  imports: [PrismaModule],
  controllers: [CartsController],
  providers: [CartsService],
  exports: [CartsService],
})
export class CartsModule {}
