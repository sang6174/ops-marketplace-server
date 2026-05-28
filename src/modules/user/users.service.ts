import { Injectable } from '@nestjs/common';
import {
  AccountStatus,
  UserRole,
} from '@infrastructure/generated/prisma/enums';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { exclude } from '@common/utils';
import {
  ResourceNotFoundException,
  ResourceAlreadyExistsException,
} from '@common/exceptions';
import { UpdateProfileDto } from './dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
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

    return {
      message:
        'Bạn đã có quyền của người bán. Hãy tạo một của hàng của riêng mình!',
    };
  }
}
