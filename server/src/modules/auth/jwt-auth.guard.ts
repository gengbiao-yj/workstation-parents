import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'

export interface AuthUser {
  id: string
  username: string
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly cfg: ConfigService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest()
    const [type, token] = String(req.headers?.authorization || '').split(' ')
    if (type !== 'Bearer' || !token) throw new UnauthorizedException('未登录')

    try {
      const payload = await this.jwt.verifyAsync(token, {
        secret: this.cfg.get<string>('JWT_SECRET'),
      })
      req.user = { id: payload.sub, username: payload.username } satisfies AuthUser
      return true
    } catch {
      throw new UnauthorizedException('登录状态已失效，请重新登录')
    }
  }
}
