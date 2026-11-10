import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { AuthUser } from '../../modules/auth/jwt-auth.guard'

/** 从请求上下文取当前登录用户（配合 JwtAuthGuard 使用） */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    return ctx.switchToHttp().getRequest().user as AuthUser
  },
)
