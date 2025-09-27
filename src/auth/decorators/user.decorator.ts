import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../entities/user.entity';

// Define specific user properties we want to allow extraction of
type UserProperty = 'id' | 'email' | 'name' | 'role' | 'isActive';

export const CurrentUser = createParamDecorator(
  (
    data: UserProperty | undefined,
    ctx: ExecutionContext,
  ): User | string | boolean => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as User;

    // If a specific property is requested, return only that property
    if (data && user) {
      return user[data];
    }

    // Otherwise return the full user object
    return user;
  },
);
