import { Injectable } from '@nestjs/common';
import {
  AccountStatus,
  UserRole,
} from '@infrastructure/generated/prisma/enums';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import {
  comparePassword,
  hashPassword,
  exclude,
  toPrismaPage,
} from '@common/utils';
import {
  ResourceNotFoundException,
  ResourceAlreadyExistsException,
} from '@common/exceptions';
import { UnauthorizedException } from '@nestjs/common';
import { paginate } from '@common/dtos/pagination.dto';
import { UpdateProfileDto, ChangePasswordDto, QueryUsersDto } from './dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, isDeleted: false },
      include: {
        roles: { select: { role: true } },
        shop: { select: { id: true, name: true } },
      },
    });

    if (!user) throw new ResourceNotFoundException('User', userId);

    return exclude(user, ['password']);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name,
        email: dto.email,
      },
    });
    return exclude(user, ['password']);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.password) throw new ResourceNotFoundException('User', userId);

    const isMatch = await comparePassword(dto.currentPassword, user.password);
    if (!isMatch)
      throw new UnauthorizedException('Mật khẩu hiện tại không đúng');

    const hashed = await hashPassword(dto.newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    return { message: 'Đổi mật khẩu thành công' };
  }

  async becomeSeller(userId: string) {
    const existing = await this.prisma.userRoleMapping.findUnique({
      where: { userId_role: { userId, role: UserRole.SELLER } },
    });

    if (existing) {
      throw new ResourceAlreadyExistsException('Role SELLER', 'user này đã có');
    }

    await this.prisma.userRoleMapping.create({
      data: { userId, role: UserRole.SELLER },
    });

    return { message: 'Bạn đã trở thành Seller. Hãy tạo shop của mình!' };
  }

  async findAll(dto: QueryUsersDto) {
    const { page = 1, limit = 20, search } = dto;

    const where = {
      isDeleted: false,
      ...(search && {
        OR: [
          { email: { contains: search, mode: 'insensitive' as const } },
          { name: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        ...toPrismaPage(page, limit),
        orderBy: { createdAt: 'desc' },
        include: { roles: { select: { role: true } } },
        omit: { password: true },
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async updateStatus(userId: string, status: AccountStatus) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { status },
      omit: { password: true },
    });
  }
}
