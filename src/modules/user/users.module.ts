import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { PrismaProvider } from '@/infrastructure/prisma/prisma.provider';

@Module({
  controllers: [UsersController],
  providers: [UsersService, PrismaService, PrismaProvider],
  exports: [UsersService],
})
export class UsersModule {}
