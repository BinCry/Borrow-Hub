import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateCategoryDto, UpdateCategoryDto } from './categories.dto';
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public()
  @Get()
  listPublicTree() {
    return this.categoriesService.listPublicTree();
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Get('admin/all')
  listAll() {
    return this.categoriesService.listAll();
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Patch(':categoryId')
  update(
    @Param('categoryId') categoryId: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(categoryId, dto);
  }
}

