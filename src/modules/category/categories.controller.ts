import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards';
import { CategoriesService } from './categories.service';
import {
  CreateCategoryDto,
  QueryCategoryProductsDto,
  UpdateCategoryDto,
} from './dtos/categories.dto';
import { Public, Roles } from '@/common/decorators';
import { UserRole } from '@/infrastructure/generated/prisma/enums';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get categories' })
  listCategories() {
    return this.service.listCategories();
  }

  @Public()
  @Get(':id/children')
  @ApiOperation({ summary: 'Get children of a category' })
  getChildren(@Param('id') id: string) {
    return this.service.getChildren(id);
  }

  @Public()
  @Get(':id/products')
  @ApiOperation({ summary: 'Get products by category' })
  getProducts(@Param('id') id: string, @Query() dto: QueryCategoryProductsDto) {
    return this.service.getProducts(id, dto);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get category details' })
  getCategory(@Param('id') id: string) {
    return this.service.getCategory(id);
  }

  @ApiBearerAuth('JWT')
  @Post()
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Create a new category' })
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.service.createCategory(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Update a category' })
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.service.updateCategory(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Delete a category' })
  deleteCategory(@Param('id') id: string) {
    return this.service.deleteCategory(id);
  }
}
