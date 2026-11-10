import { IsString, Length, Matches, IsOptional, MaxLength } from 'class-validator'

export class RegisterDto {
  @IsString()
  @Length(3, 32, { message: '用户名长度 3-32 位' })
  @Matches(/^[a-zA-Z0-9_]+$/, { message: '用户名只能包含字母、数字和下划线' })
  username: string

  @IsString()
  @Length(6, 64, { message: '密码长度 6-64 位' })
  password: string

  @IsOptional()
  @IsString()
  @MaxLength(32)
  nickname?: string
}

export class LoginDto {
  @IsString()
  @Length(1, 64)
  username: string

  @IsString()
  @Length(1, 64)
  password: string
}
