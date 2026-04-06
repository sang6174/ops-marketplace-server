// src/common/decorators/index.ts
import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '@infrastructure/generated/prisma/enums';

// ===== Metadata keys =====
export const IS_PUBLIC_KEY = 'isPublic' as const;
export const ROLES_KEY = 'roles' as const;

// ===== @Public() =====
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// ===== @GetUser() =====
export const GetUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user as Record<string, unknown>;

    console.log(data);

    return data ? user?.[data] : user;
  },
);

// ===== @Roles)() =====
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
