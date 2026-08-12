import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Category, CategoryStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './categories.dto';

type CategoryTreeNode = Category & {
  children: CategoryTreeNode[];
};

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublicTree(): Promise<CategoryTreeNode[]> {
    const categories = await this.prisma.category.findMany({
      where: {
        status: CategoryStatus.ACTIVE,
      },
      orderBy: [{ name: 'asc' }],
    });

    return this.buildTree(categories);
  }

  listAll() {
    return this.prisma.category.findMany({
      orderBy: [{ createdAt: 'asc' }],
    });
  }

  async create(dto: CreateCategoryDto) {
    const existing = await this.prisma.category.findFirst({
      where: {
        OR: [{ slug: dto.slug }, { name: dto.name }],
      },
    });

    if (existing) {
      throw new ConflictException('Category name or slug already exists');
    }

    if (dto.parentId) {
      await this.ensureCategoryExists(dto.parentId);
    }

    return this.prisma.category.create({
      data: {
        parentId: dto.parentId,
        name: dto.name,
        slug: dto.slug,
        status: dto.status ?? CategoryStatus.ACTIVE,
      },
    });
  }

  async update(categoryId: string, dto: UpdateCategoryDto) {
    await this.ensureCategoryExists(categoryId);

    if (dto.parentId) {
      if (dto.parentId === categoryId) {
        throw new ConflictException('Category cannot be its own parent');
      }

      await this.ensureCategoryExists(dto.parentId);
    }

    if (dto.slug) {
      const existingSlug = await this.prisma.category.findFirst({
        where: {
          slug: dto.slug,
          id: { not: categoryId },
        },
      });

      if (existingSlug) {
        throw new ConflictException('Category slug already exists');
      }
    }

    return this.prisma.category.update({
      where: { id: categoryId },
      data: {
        parentId: dto.parentId,
        name: dto.name,
        slug: dto.slug,
        status: dto.status,
      },
    });
  }

  private async ensureCategoryExists(categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  private buildTree(categories: Category[]): CategoryTreeNode[] {
    const nodeMap = new Map<string, CategoryTreeNode>();

    for (const category of categories) {
      nodeMap.set(category.id, { ...category, children: [] });
    }

    const roots: CategoryTreeNode[] = [];

    for (const category of categories) {
      const node = nodeMap.get(category.id)!;

      if (category.parentId) {
        const parent = nodeMap.get(category.parentId);
        if (parent) {
          parent.children.push(node);
          continue;
        }
      }

      roots.push(node);
    }

    return roots;
  }
}

