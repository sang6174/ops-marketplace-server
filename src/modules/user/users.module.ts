import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaModule } from '@/infrastructure/prisma/prisma.module';
import {
  UserPrismaRepository,
  USER_PRISMA_REPOSITORY,
} from './infrastructure/repositories/user-prisma.repository';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    UserPrismaRepository,
    { provide: USER_PRISMA_REPOSITORY, useClass: UserPrismaRepository },
  ],
  exports: [UsersService, USER_PRISMA_REPOSITORY],
})
export class UsersModule {}
