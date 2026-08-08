import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { PrismaModule } from '@/infrastructure/prisma/prisma.module';
import {
  CategoryPrismaRepository,
  CATEGORY_PRISMA_REPOSITORY,
} from './infrastructure/repositories/category-prisma.repository';

@Module({
  imports: [PrismaModule],
  controllers: [CategoriesController],
  providers: [
    CategoriesService,
    CategoryPrismaRepository,
    { provide: CATEGORY_PRISMA_REPOSITORY, useClass: CategoryPrismaRepository },
  ],
  exports: [CategoriesService, CATEGORY_PRISMA_REPOSITORY],
})
export class CategoriesModule {}
