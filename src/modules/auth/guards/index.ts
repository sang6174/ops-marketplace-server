// src/modules/auth/guards/index.ts
import { ExecutionContext, Injectable, CanActivate } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { IS_PUBLIC_KEY, ROLES_KEY, PERMISSIONS_KEY } from '@common/decorators';
import { UserRole } from '@infrastructure/generated/prisma/enums';
import { PrismaService } from '@infrastructure/prisma/prisma.service';

// ===== JwtAuthGuard =====
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    return super.canActivate(context);
  }
}

// ===== Roles and Permissions Guard =====
@Injectable()
export class RolesAndPermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtAuthGuard: JwtAuthGuard,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const authenticated = await this.jwtAuthGuard.canActivate(context);
    if (!authenticated) return false;

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as { roles?: string[] } | undefined;
    const roles = Array.isArray(user?.roles) ? user.roles : [];

    if (roles.length === 0) {
      return false;
    }

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredRoles && requiredRoles.length > 0) {
      const hasRole = requiredRoles.some((role) => roles.includes(role));
      if (!hasRole) {
        return false;
      }
    }

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: {
        role: {
          in: roles as UserRole[],
        },
      },
      include: { permission: true },
    });

    const grantedPermissions = new Set(
      rolePermissions.map((rp) => rp.permission.name),
    );

    return requiredPermissions.every((permission) =>
      grantedPermissions.has(permission),
    );
  }
}

// ===== RefreshTokenGuard =====
@Injectable()
export class RefreshTokenGuard extends AuthGuard('jwt-refresh') {}
