import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { emptyToNull, nullToEmpty } from '../../common/utils/transform'
import { CreateKidDto, UpdateKidDto } from './dto/kid.dto'
import { Kid } from './entities/kid.entity'

const SIMPLE_FIELDS = [
  'name',
  'gender',
  'stage',
  'color',
  'school',
  'grade',
  'cls',
  'teacher',
  'interests',
  'personality',
  'health',
  'tags',
  'mk',
] as const

@Injectable()
export class KidService {
  constructor(@InjectRepository(Kid) private readonly repo: Repository<Kid>) {}

  toView(k: Kid) {
    return {
      id: String(k.id),
      name: k.name,
      gender: k.gender,
      birthday: nullToEmpty(k.birthday),
      stage: k.stage,
      color: k.color,
      school: k.school,
      grade: k.grade,
      cls: k.cls,
      teacher: k.teacher,
      interests: k.interests,
      personality: k.personality,
      health: k.health,
      note: nullToEmpty(k.note),
      tags: k.tags ?? [],
      mk: k.mk ?? undefined,
      legacyId: k.legacyId ?? undefined,
    }
  }

  private apply(k: Kid, dto: CreateKidDto | UpdateKidDto) {
    for (const f of SIMPLE_FIELDS) {
      const v = (dto as Record<string, unknown>)[f]
      if (v !== undefined) (k as unknown as Record<string, unknown>)[f] = v
    }
    if (dto.birthday !== undefined) k.birthday = emptyToNull(dto.birthday)
    if (dto.note !== undefined) k.note = emptyToNull(dto.note)
  }

  async list(userId: string) {
    const rows = await this.repo.find({ where: { userId }, order: { id: 'ASC' } })
    return rows.map((r) => this.toView(r))
  }

  async findOne(userId: string, id: number) {
    const row = await this.repo.findOne({ where: { id: String(id), userId } })
    if (!row) throw new NotFoundException('孩子档案不存在')
    return this.toView(row)
  }

  async create(userId: string, dto: CreateKidDto) {
    const entity = this.repo.create({
      userId,
      legacyId: dto.legacyId ?? null,
      name: dto.name,
      gender: 'M',
      stage: 'k',
      color: 0,
      school: '',
      grade: '',
      cls: '',
      teacher: '',
      interests: '',
      personality: '',
      health: '',
    })
    this.apply(entity, dto)
    const saved = await this.repo.save(entity)
    return this.toView(saved)
  }

  async update(userId: string, id: number, dto: UpdateKidDto) {
    const row = await this.repo.findOne({ where: { id: String(id), userId } })
    if (!row) throw new NotFoundException('孩子档案不存在')
    this.apply(row, dto)
    const saved = await this.repo.save(row)
    return this.toView(saved)
  }

  async remove(userId: string, id: number) {
    const row = await this.repo.findOne({ where: { id: String(id), userId } })
    if (!row) throw new NotFoundException('孩子档案不存在')
    await this.repo.remove(row)
    return { id: String(id) }
  }
}
