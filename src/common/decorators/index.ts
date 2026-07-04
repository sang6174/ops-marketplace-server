// src/common/decorators/index.ts
import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '@infrastructure/generated/prisma/enums';

export const IS_PUBLIC_KEY = 'isPublic' as const;
export const ROLES_KEY = 'roles' as const;
export const PERMISSIONS_KEY = 'permissions' as const;
export const SKIP_TRANSFORM_KEY = 'skipTransform' as const;
export const SKIP_IDEMPOTENCY_KEY = 'skipIdempotency' as const;

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const GetUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const httpContext = ctx.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const user = request.user as Record<string, unknown>;

    return data ? user?.[data] : user;
  },
);

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

export const SkipTransform = () => SetMetadata(SKIP_TRANSFORM_KEY, true);

export const SkipIdempotency = () => SetMetadata(SKIP_IDEMPOTENCY_KEY, true);
