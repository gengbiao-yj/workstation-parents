import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from '../user/entities/user.entity'
import { LoginDto, RegisterDto } from './dto/auth.dto'
import { hashPassword, verifyPassword } from './password.util'

export interface AuthUser {
  id: string
  username: string
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  private async sign(user: User) {
    const token = await this.jwt.signAsync({ sub: user.id, username: user.username })
    return {
      token,
      user: { id: user.id, username: user.username, nickname: user.nickname },
    }
  }

  async register(dto: RegisterDto) {
    const exists = await this.users.findOne({ where: { username: dto.username } })
    if (exists) throw new ConflictException('该用户名已被注册')

    const user = this.users.create({
      username: dto.username,
      nickname: dto.nickname || dto.username,
      passwordHash: await hashPassword(dto.password),
    })
    await this.users.save(user)
    return this.sign(user)
  }

  async login(dto: LoginDto) {
    const user = await this.users.findOne({ where: { username: dto.username } })
    if (!user) throw new UnauthorizedException('用户名或密码不正确')
    const ok = await verifyPassword(dto.password, user.passwordHash)
    if (!ok) throw new UnauthorizedException('用户名或密码不正确')
    return this.sign(user)
  }

  async profile(id: string) {
    const user = await this.users.findOne({ where: { id } })
    if (!user) throw new UnauthorizedException('账号不存在')
    return { id: user.id, username: user.username, nickname: user.nickname }
  }
}
