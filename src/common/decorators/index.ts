// src/common/decorators/index.ts
import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '@infrastructure/generated/prisma/enums';
import { Permission } from '@common/constants/permissions';

// ===== Metadata keys =====

export const IS_PUBLIC_KEY = 'isPublic' as const;
export const ROLES_KEY = 'roles' as const;
export const PERMISSIONS_KEY = 'permissions' as const;
export const SKIP_TRANSFORM_KEY = 'skipTransform' as const;

// ===== @Public() =====

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// ===== @GetUser() =====

export const GetUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const httpContext = ctx.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const user = request.user as Record<string, unknown>;

    return data ? user?.[data] : user;
  },
);

// ===== @Roles() =====

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

// ===== @Permissions() =====

export const Permissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

// ===== @SkipTransform() =====

export const SkipTransform = () => SetMetadata(SKIP_TRANSFORM_KEY, true);
