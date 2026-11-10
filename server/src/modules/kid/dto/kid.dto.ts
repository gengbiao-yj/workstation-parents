import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Matches,
  Min,
} from 'class-validator'

const DATE_RE = /^(\d{4}-\d{2}-\d{2})?$/

export class CreateKidDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  /** 导入 localStorage 存量数据时，把原来的 id（如 k1）放这里做映射 */
  legacyId?: string

  @IsString()
  @Length(1, 32)
  name: string

  @IsOptional()
  @IsIn(['M', 'F'])
  gender?: string

  @IsOptional()
  @Matches(DATE_RE, { message: '生日格式应为 YYYY-MM-DD' })
  birthday?: string

  @IsOptional()
  @IsString()
  @MaxLength(8)
  stage?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(11)
  color?: number

  @IsOptional()
  @IsString()
  @MaxLength(64)
  school?: string

  @IsOptional()
  @IsString()
  @MaxLength(32)
  grade?: string

  @IsOptional()
  @IsString()
  @MaxLength(32)
  cls?: string

  @IsOptional()
  @IsString()
  @MaxLength(32)
  teacher?: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
  interests?: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
  personality?: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
  health?: string

  @IsOptional()
  @IsString()
  note?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]

  @IsOptional()
  @IsInt()
  mk?: number
}

export class UpdateKidDto {
  @IsOptional()
  @IsString()
  @Length(1, 32)
  name?: string

  @IsOptional()
  @IsIn(['M', 'F'])
  gender?: string

  @IsOptional()
  @Matches(DATE_RE, { message: '生日格式应为 YYYY-MM-DD' })
  birthday?: string

  @IsOptional()
  @IsString()
  @MaxLength(8)
  stage?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(11)
  color?: number

  @IsOptional()
  @IsString()
  @MaxLength(64)
  school?: string

  @IsOptional()
  @IsString()
  @MaxLength(32)
  grade?: string

  @IsOptional()
  @IsString()
  @MaxLength(32)
  cls?: string

  @IsOptional()
  @IsString()
  @MaxLength(32)
  teacher?: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
  interests?: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
  personality?: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
  health?: string

  @IsOptional()
  @IsString()
  note?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]

  @IsOptional()
  @IsInt()
  mk?: number
}
