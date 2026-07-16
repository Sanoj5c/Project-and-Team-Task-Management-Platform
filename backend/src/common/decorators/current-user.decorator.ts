import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import { Role } from '../enums/role.enum';

export interface CurrentUserPayload {
  userId: string;
  email: string;
  role: Role;
}

interface AuthenticatedRequest extends Request {
  user: CurrentUserPayload;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserPayload => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();

    return request.user;
  },
);
