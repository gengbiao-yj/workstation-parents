import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { UpdateSettingsDto } from './dto/settings.dto'
import { UserSetting } from './entities/user-setting.entity'

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(UserSetting) private readonly repo: Repository<UserSetting>,
  ) {}

  private async getOrCreate(userId: string): Promise<UserSetting> {
    let row = await this.repo.findOne({ where: { userId } })
    if (!row) {
      row = await this.repo.save(this.repo.create({ userId }))
    }
    return row
  }

  private toView(s: UserSetting) {
    return {
      parent: { name: s.parentName, gender: s.parentGender },
      partner: { name: s.partnerName, gender: s.partnerGender, show: s.partnerShow },
      anim: s.anim,
      cat: s.cat,
      ai: {
        provider: s.aiProvider,
        base: s.aiBase,
        key: s.aiKey,
        model: s.aiModel,
        mask: s.aiMask,
        temp: s.aiTemp,
      },
      lastBackup: Number(s.lastBackup || 0),
      onboarded: s.onboarded,
      cur: s.cur,
      maskSeq: s.maskSeq,
    }
  }

  async get(userId: string) {
    return this.toView(await this.getOrCreate(userId))
  }

  async update(userId: string, dto: UpdateSettingsDto) {
    const row = await this.getOrCreate(userId)

    if (dto.parent) {
      if (dto.parent.name !== undefined) row.parentName = dto.parent.name
      if (dto.parent.gender !== undefined) row.parentGender = dto.parent.gender
    }
    if (dto.partner) {
      if (dto.partner.name !== undefined) row.partnerName = dto.partner.name
      if (dto.partner.gender !== undefined) row.partnerGender = dto.partner.gender
      if (dto.partner.show !== undefined) row.partnerShow = dto.partner.show
    }
    if (dto.ai) {
      if (dto.ai.provider !== undefined) row.aiProvider = dto.ai.provider
      if (dto.ai.base !== undefined) row.aiBase = dto.ai.base
      if (dto.ai.key !== undefined) row.aiKey = dto.ai.key
      if (dto.ai.model !== undefined) row.aiModel = dto.ai.model
      if (dto.ai.mask !== undefined) row.aiMask = dto.ai.mask
      if (dto.ai.temp !== undefined) row.aiTemp = dto.ai.temp
    }
    if (dto.anim !== undefined) row.anim = dto.anim
    if (dto.cat !== undefined) row.cat = dto.cat
    if (dto.lastBackup !== undefined) row.lastBackup = String(dto.lastBackup)
    if (dto.onboarded !== undefined) row.onboarded = dto.onboarded
    if (dto.cur !== undefined) row.cur = dto.cur
    if (dto.maskSeq !== undefined) row.maskSeq = dto.maskSeq

    return this.toView(await this.repo.save(row))
  }
}
