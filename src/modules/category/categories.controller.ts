import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dtos/categories.dto';
import { Public, Roles } from '@/common/decorators';
import { UserRole } from '@/infrastructure/generated/prisma/enums';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: '' })
  listCategories() {
    return this.service.listCategories();
  }

  @Public()
  @Get(':id/children')
  @ApiOperation({ summary: '' })
  getChildren(@Param('id') id: string) {
    return this.service.getChildren(id);
  }

  @ApiBearerAuth('JWT')
  @Post()
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '' })
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.service.createCategory(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '' })
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.service.updateCategory(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '' })
  deleteCategory(@Param('id') id: string) {
    return this.service.deleteCategory(id);
  }
}
