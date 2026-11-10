import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { applyFields, fieldDefaults, FieldSpec, textOrEmpty } from '../../common/utils/mapper'
import { AuthUser, JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Kid } from '../kid/entities/kid.entity'
import { Skill, SkillStep } from './entities/skill.entities'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** 入参形状 = 前端 Skill（含 steps 数组） */
const FIELDS: FieldSpec[] = [
  { key: 'kidId', kind: 'ref', from: ['kid', 'kidId'] },
  { key: 'pre', kind: 'nullable', max: 64 },
  { key: 'name', kind: 'text', max: 64 },
  { key: 'dim', kind: 'text', max: 4, def: 'zhi' },
  { key: 'icon', kind: 'text', max: 32 },
  { key: 'tip', kind: 'text', max: 255 },
  { key: 'start', kind: 'date' },
  { key: 'note', kind: 'nullable', max: 65535 },
]

@Injectable()
export class SkillService {
  constructor(
    @InjectRepository(Skill) private readonly repo: Repository<Skill>,
    @InjectRepository(SkillStep) private readonly steps: Repository<SkillStep>,
    @InjectRepository(Kid) private readonly kids: Repository<Kid>,
  ) {}

  private toView(s: Skill, steps: SkillStep[]) {
    return {
      id: String(s.id),
      kid: String(s.kidId),
      ...(s.pre ? { pre: s.pre } : {}),
      name: s.name,
      dim: s.dim,
      icon: s.icon,
      tip: s.tip,
      start: textOrEmpty(s.start),
      note: textOrEmpty(s.note),
      steps: steps.map((st) => ({ t: st.title, done: textOrEmpty(st.done) })),
    }
  }

  private groupBySkill(rows: SkillStep[]) {
    const map = new Map<string, SkillStep[]>()
    for (const r of rows) {
      const k = String(r.skillId)
      const list = map.get(k)
      if (list) list.push(r)
      else map.set(k, [r])
    }
    for (const list of map.values()) list.sort((a, b) => a.sort - b.sort || Number(a.id) - Number(b.id))
    return map
  }

  async list(userId: string, kidId?: string) {
    const where: Record<string, unknown> = { userId }
    if (kidId) where.kidId = kidId
    const [rows, stepRows] = await Promise.all([
      this.repo.find({ where, order: { id: 'ASC' } }),
      this.steps.find({ where: { userId }, order: { sort: 'ASC' } }),
    ])
    const grouped = this.groupBySkill(stepRows)
    return rows.map((r) => this.toView(r, grouped.get(String(r.id)) ?? []))
  }

  async detail(userId: string, id: number) {
    const row = await this.repo.findOne({ where: { id: String(id), userId } })
    if (!row) throw new NotFoundException('技能不存在')
    const stepRows = await this.steps.find({ where: { skillId: String(id) }, order: { sort: 'ASC' } })
    return this.toView(row, stepRows)
  }

  /** 步骤整体替换（前端每次提交完整 steps 数组），避免做逐条 diff */
  private async replaceSteps(userId: string, skillId: string, steps: unknown) {
    await this.steps.delete({ skillId })
    if (!Array.isArray(steps) || !steps.length) return
    const rows = steps.slice(0, 100).map((st: any, i: number) => ({
      userId,
      skillId,
      sort: i,
      title: String(st?.t ?? '').slice(0, 128),
      done: typeof st?.done === 'string' && DATE_RE.test(st.done) ? st.done : null,
    }))
    await this.steps.save(rows as never)
  }

  async create(userId: string, dto: Record<string, unknown>) {
    if (!dto?.name) throw new BadRequestException('技能名称不能为空')
    if (!dto?.kidId && !dto?.kid) throw new BadRequestException('缺少 kidId')
    const kid = await this.kids.findOne({ where: { id: String(dto.kidId ?? dto.kid), userId } })
    if (!kid) throw new BadRequestException('孩子档案不存在')

    const entity = Object.assign(this.repo.create(), { userId, ...fieldDefaults(FIELDS) })
    applyFields(entity as never, dto, FIELDS)
    const saved = await this.repo.save(entity)
    await this.replaceSteps(userId, saved.id, dto.steps)
    return this.detail(userId, Number(saved.id))
  }

  async update(userId: string, id: number, dto: Record<string, unknown>) {
    const row = await this.repo.findOne({ where: { id: String(id), userId } })
    if (!row) throw new NotFoundException('技能不存在')
    applyFields(row as never, dto ?? {}, FIELDS)
    await this.repo.save(row)
    if (dto && 'steps' in dto) await this.replaceSteps(userId, String(id), dto.steps)
    return this.detail(userId, id)
  }

  /** 只改某一步的完成日期：日历/技能页点一下就走这里，不用回传整个 steps */
  async stepDone(userId: string, id: number, index: number, done?: string) {
    const row = await this.repo.findOne({ where: { id: String(id), userId } })
    if (!row) throw new NotFoundException('技能不存在')
    const step = await this.steps.findOne({ where: { skillId: String(id), sort: index } })
    if (!step) throw new NotFoundException('步骤不存在')
    step.done = done && DATE_RE.test(done) ? done : null
    await this.steps.save(step)
    return { skillId: String(id), index, done: textOrEmpty(step.done) }
  }

  async remove(userId: string, id: number) {
    const row = await this.repo.findOne({ where: { id: String(id), userId } })
    if (!row) throw new NotFoundException('技能不存在')
    await this.repo.remove(row)
    return { id: String(id) }
  }
}

@Controller('skills')
@UseGuards(JwtAuthGuard)
export class SkillController {
  constructor(private readonly skills: SkillService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('kidId') kidId?: string) {
    return this.skills.list(user.id, kidId)
  }

  @Get(':id')
  detail(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.skills.detail(user.id, id)
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: Record<string, unknown>) {
    return this.skills.create(user.id, dto ?? {})
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.skills.update(user.id, id, dto ?? {})
  }

  @Patch(':id/steps/:index')
  step(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('index', ParseIntPipe) index: number,
    @Body() dto: { done?: string },
  ) {
    return this.skills.stepDone(user.id, id, index, dto?.done)
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.skills.remove(user.id, id)
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Skill, SkillStep, Kid])],
  controllers: [SkillController],
  providers: [SkillService, JwtAuthGuard],
  exports: [SkillService],
})
export class SkillModule {}
