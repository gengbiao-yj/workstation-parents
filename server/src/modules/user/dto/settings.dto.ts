import { Type } from 'class-transformer'
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator'

export class ParentDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  name?: string

  @IsOptional()
  @IsIn(['M', 'F'])
  gender?: string
}

export class PartnerDto extends ParentDto {
  @IsOptional()
  @IsBoolean()
  show?: boolean
}

export class AiDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  provider?: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
  base?: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
  key?: string

  @IsOptional()
  @IsString()
  @MaxLength(64)
  model?: string

  @IsOptional()
  @IsBoolean()
  mask?: boolean

  @IsOptional()
  @IsNumber()
  temp?: number
}

export class UpdateSettingsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => ParentDto)
  parent?: ParentDto

  @IsOptional()
  @ValidateNested()
  @Type(() => PartnerDto)
  partner?: PartnerDto

  @IsOptional()
  @ValidateNested()
  @Type(() => AiDto)
  ai?: AiDto

  @IsOptional()
  @IsBoolean()
  anim?: boolean

  @IsOptional()
  @IsBoolean()
  cat?: boolean

  @IsOptional()
  @IsNumber()
  lastBackup?: number

  @IsOptional()
  @IsBoolean()
  onboarded?: boolean

  @IsOptional()
  @IsString()
  @MaxLength(64)
  cur?: string

  @IsOptional()
  @IsNumber()
  maskSeq?: number
}
