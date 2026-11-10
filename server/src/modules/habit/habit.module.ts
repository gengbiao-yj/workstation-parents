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
  Put,
  Query,
  UseGuards,
} from '@nestjs/common'
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm'
import { Between, MoreThanOrEqual, Repository } from 'typeorm'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { applyFields, fieldDefaults, FieldSpec, numOr0, textOrEmpty } from '../../common/utils/mapper'
import { AuthUser, JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Kid } from '../kid/entities/kid.entity'
import { Habit, HabitCheck } from './entities/habit.entities'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** 入参形状 = 前端 Habit，除 id / kidId 外都可由前端直接给 */
const FIELDS: FieldSpec[] = [
  { key: 'kidId', kind: 'ref', from: ['kid', 'kidId'] },
  { key: 'dim', kind: 'text', max: 4, def: 'de' },
  { key: 'name', kind: 'text', max: 32 },
  { key: 'unit', kind: 'text', max: 16 },
  { key: 'target', kind: 'decimal', def: '1' },
  { key: 'days', kind: 'json', def: [1, 2, 3, 4, 5, 6, 7] },
  { key: 'on', kind: 'bool', def: true },
  { key: 'kind', kind: 'text', max: 32 },
  { key: 'since', kind: 'date' },
]

@Injectable()
export class HabitService {
  constructor(
    @InjectRepository(Habit) private readonly repo: Repository<Habit>,
    @InjectRepository(HabitCheck) private readonly checks: Repository<HabitCheck>,
    @InjectRepository(Kid) private readonly kids: Repository<Kid>,
  ) {}

  toView(h: Habit) {
    return {
      id: String(h.id),
      kid: String(h.kidId),
      dim: h.dim,
      name: h.name,
      unit: h.unit,
      target: numOr0(h.target),
      days: h.days ?? [1, 2, 3, 4, 5, 6, 7],
      on: h.on,
      kind: h.kind,
      since: textOrEmpty(h.since),
    }
  }

  async list(userId: string, kidId?: string) {
    const where: Record<string, unknown> = { userId }
    if (kidId) where.kidId = kidId
    const rows = await this.repo.find({ where, order: { id: 'ASC' } })
    return rows.map((r) => this.toView(r))
  }

  async detail(userId: string, id: number) {
    const row = await this.repo.findOne({ where: { id: String(id), userId } })
    if (!row) throw new NotFoundException('习惯不存在')
    return this.toView(row)
  }

  async create(userId: string, dto: Record<string, unknown>) {
    if (!dto?.name) throw new BadRequestException('习惯名称不能为空')
    if (!dto?.kidId && !dto?.kid) throw new BadRequestException('缺少 kidId')
    const kid = await this.kids.findOne({ where: { id: String(dto.kidId ?? dto.kid), userId } })
    if (!kid) throw new BadRequestException('孩子档案不存在')

    const entity = Object.assign(this.repo.create(), { userId, ...fieldDefaults(FIELDS) })
    applyFields(entity as never, dto, FIELDS)
    const saved = await this.repo.save(entity)
    return this.toView(saved)
  }

  async update(userId: string, id: number, dto: Record<string, unknown>) {
    const row = await this.repo.findOne({ where: { id: String(id), userId } })
    if (!row) throw new NotFoundException('习惯不存在')
    applyFields(row as never, dto ?? {}, FIELDS)
    return this.toView(await this.repo.save(row))
  }

  async remove(userId: string, id: number) {
    const row = await this.repo.findOne({ where: { id: String(id), userId } })
    if (!row) throw new NotFoundException('习惯不存在')
    await this.repo.remove(row)
    return { id: String(id) }
  }

  /** 按日期区间返回打卡，形状与前端 state.checks 一致：{kidId: {date: {habitId: 值}}} */
  async checkMap(userId: string, q: { from?: string; to?: string; kidId?: string }) {
    const where: Record<string, unknown> = { userId }
    if (q.kidId) where.kidId = q.kidId
    if (q.from && q.to) where.date = Between(q.from, q.to)
    else if (q.from) where.date = MoreThanOrEqual(q.from)

    const rows = await this.checks.find({ where, order: { date: 'ASC' } })
    const out: Record<string, Record<string, Record<string, true | number>>> = {}
    for (const r of rows) {
      const kid = String(r.kidId)
      const day = (out[kid] ??= {})
      const slot = (day[r.date] ??= {})
      const n = r.value === null ? undefined : Number(r.value)
      slot[String(r.habitId)] = n !== undefined && Number.isFinite(n) ? n : true
    }
    return out
  }

  /** value 传 null / 0 / false 表示取消打卡 */
  async setCheck(userId: string, habitId: number, dto: Record<string, unknown>) {
    const habit = await this.repo.findOne({ where: { id: String(habitId), userId } })
    if (!habit) throw new NotFoundException('习惯不存在')
    const date = String(dto?.date ?? '')
    if (!DATE_RE.test(date)) throw new BadRequestException('date 格式应为 YYYY-MM-DD')

    const raw = dto?.value
    const existing = await this.checks.findOne({ where: { habitId: String(habitId), date } })
    const clearing = raw === null || raw === undefined || raw === false || raw === 0 || raw === ''

    if (clearing) {
      if (existing) await this.checks.remove(existing)
      return { habitId: String(habitId), kid: String(habit.kidId), date, value: null }
    }

    const value = raw === true ? null : String(Number(raw))
    if (existing) {
      existing.value = value
      await this.checks.save(existing)
    } else {
      await this.checks.save(
        this.checks.create({ userId, kidId: habit.kidId, habitId: String(habitId), date, value }),
      )
    }
    return { habitId: String(habitId), kid: String(habit.kidId), date, value: raw === true ? true : Number(raw) }
  }

  async clearCheck(userId: string, habitId: number, date?: string) {
    if (!date || !DATE_RE.test(date)) throw new BadRequestException('缺少 date')
    const habit = await this.repo.findOne({ where: { id: String(habitId), userId } })
    if (!habit) throw new NotFoundException('习惯不存在')
    await this.checks.delete({ habitId: String(habitId), date })
    return { habitId: String(habitId), date, value: null }
  }
}

@Controller('habits')
@UseGuards(JwtAuthGuard)
export class HabitController {
  constructor(private readonly habits: HabitService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('kidId') kidId?: string) {
    return this.habits.list(user.id, kidId)
  }

  // 放在 :id 之前，否则 checks 会被当成 id
  @Get('checks')
  checks(@CurrentUser() user: AuthUser, @Query() q: { from?: string; to?: string; kidId?: string }) {
    return this.habits.checkMap(user.id, q ?? {})
  }

  @Put(':id/checks')
  setCheck(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.habits.setCheck(user.id, id, dto)
  }

  @Delete(':id/checks')
  clearCheck(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Query('date') date?: string,
  ) {
    return this.habits.clearCheck(user.id, id, date)
  }

  @Get(':id')
  detail(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.habits.detail(user.id, id)
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: Record<string, unknown>) {
    return this.habits.create(user.id, dto ?? {})
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.habits.update(user.id, id, dto ?? {})
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.habits.remove(user.id, id)
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Habit, HabitCheck, Kid])],
  controllers: [HabitController],
  providers: [HabitService, JwtAuthGuard],
  exports: [HabitService],
})
export class HabitModule {}
