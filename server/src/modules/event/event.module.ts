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
import { Ev, EventDayLog, EventItem } from './entities/event.entities'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** 入参形状 = 前端 Ev（含 list / done / skip） */
const FIELDS: FieldSpec[] = [
  { key: 'kidId', kind: 'ref', from: ['kid', 'kidId'] },
  { key: 'type', kind: 'text', max: 16, def: 'other' },
  { key: 'title', kind: 'text', max: 128 },
  { key: 'date', kind: 'date' },
  { key: 'start', kind: 'text', max: 5 },
  { key: 'endT', kind: 'text', max: 5 },
  { key: 'repeat', kind: 'text', max: 8, def: 'none' },
  { key: 'until', kind: 'date' },
  { key: 'end', kind: 'date' },
  { key: 'place', kind: 'text', max: 128 },
  { key: 'note', kind: 'nullable', max: 65535 },
  { key: 'review', kind: 'nullable', max: 65535 },
  { key: 'fav', kind: 'text', max: 32 },
  { key: 'rating', kind: 'int', min: 0, high: 255 },
  { key: 'budget', kind: 'decimal' },
]

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(Ev) private readonly repo: Repository<Ev>,
    @InjectRepository(EventItem) private readonly items: Repository<EventItem>,
    @InjectRepository(EventDayLog) private readonly logs: Repository<EventDayLog>,
    @InjectRepository(Kid) private readonly kids: Repository<Kid>,
  ) {}

  private toView(e: Ev, items: EventItem[], logs: EventDayLog[]) {
    const done: Record<string, boolean> = {}
    const skip: Record<string, boolean> = {}
    for (const l of logs) {
      if (l.state === 'skip') skip[l.date] = true
      else done[l.date] = true
    }
    return {
      id: String(e.id),
      kid: e.kidId === null ? '' : String(e.kidId),
      type: e.type,
      title: e.title,
      date: e.date,
      start: e.start,
      endT: e.endT,
      repeat: e.repeat,
      until: textOrEmpty(e.until),
      ...(e.end ? { end: e.end } : {}),
      place: e.place,
      note: textOrEmpty(e.note),
      list: items.sort((a, b) => a.sort - b.sort).map((it) => ({ t: it.title, ok: it.ok })),
      done,
      skip,
      review: textOrEmpty(e.review),
      fav: e.fav,
      rating: e.rating,
      ...(e.budget === null ? {} : { budget: numOr0(e.budget) }),
    }
  }

  async list(userId: string, q: { from?: string; to?: string; kidId?: string; type?: string }) {
    const where: Record<string, unknown> = { userId }
    if (q.kidId) where.kidId = q.kidId
    if (q.type) where.type = q.type
    if (q.from && DATE_RE.test(q.from) && q.to && DATE_RE.test(q.to)) where.date = Between(q.from, q.to)
    else if (q.from && DATE_RE.test(q.from)) where.date = MoreThanOrEqual(q.from)

    const [rows, items, logs] = await Promise.all([
      this.repo.find({ where, order: { date: 'ASC', start: 'ASC', id: 'ASC' } }),
      this.items.find({ where: { userId }, order: { sort: 'ASC' } }),
      this.logs.find({ where: { userId } }),
    ])

    const itemMap = new Map<string, EventItem[]>()
    for (const it of items) {
      const k = String(it.eventId)
      const list = itemMap.get(k)
      if (list) list.push(it)
      else itemMap.set(k, [it])
    }
    const logMap = new Map<string, EventDayLog[]>()
    for (const l of logs) {
      const k = String(l.eventId)
      const list = logMap.get(k)
      if (list) list.push(l)
      else logMap.set(k, [l])
    }
    return rows.map((r) => this.toView(r, itemMap.get(String(r.id)) ?? [], logMap.get(String(r.id)) ?? []))
  }

  async detail(userId: string, id: number) {
    const row = await this.repo.findOne({ where: { id: String(id), userId } })
    if (!row) throw new NotFoundException('日程不存在')
    const [items, logs] = await Promise.all([
      this.items.find({ where: { eventId: String(id) }, order: { sort: 'ASC' } }),
      this.logs.find({ where: { eventId: String(id) } }),
    ])
    return this.toView(row, items, logs)
  }

  private async replaceItems(userId: string, eventId: string, list: unknown) {
    await this.items.delete({ eventId })
    if (!Array.isArray(list) || !list.length) return
    const rows = list.slice(0, 100).map((it: any, i: number) => ({
      userId,
      eventId,
      sort: i,
      title: String(it?.t ?? '').slice(0, 128),
      ok: Boolean(it?.ok),
    }))
    await this.items.save(rows as never)
  }

  /** done / skip 两个 map 合并写：以传入的为准，整体替换该日程的每日状态 */
  private async replaceLogs(userId: string, eventId: string, done: unknown, skip: unknown) {
    await this.logs.delete({ eventId })
    const rows: Record<string, unknown>[] = []
    const d = done && typeof done === 'object' ? (done as Record<string, unknown>) : {}
    const s = skip && typeof skip === 'object' ? (skip as Record<string, unknown>) : {}
    const days = new Set([...Object.keys(d), ...Object.keys(s)])
    for (const date of days) {
      if (!DATE_RE.test(date)) continue
      const state = s[date] ? 'skip' : d[date] ? 'done' : ''
      if (!state) continue
      rows.push({ userId, eventId, date, state })
    }
    if (rows.length) await this.logs.save(rows as never)
  }

  async create(userId: string, dto: Record<string, unknown>) {
    if (!dto?.title) throw new BadRequestException('日程标题不能为空')
    if (!dto?.date || !DATE_RE.test(String(dto.date))) throw new BadRequestException('date 格式应为 YYYY-MM-DD')
    if (dto.kidId || dto.kid) {
      const kid = await this.kids.findOne({ where: { id: String(dto.kidId ?? dto.kid), userId } })
      if (!kid) throw new BadRequestException('孩子档案不存在')
    }

    const entity = Object.assign(this.repo.create(), { userId, ...fieldDefaults(FIELDS) })
    applyFields(entity as never, dto, FIELDS)
    const saved = await this.repo.save(entity)
    await this.replaceItems(userId, saved.id, dto.list)
    await this.replaceLogs(userId, saved.id, dto.done, dto.skip)
    return this.detail(userId, Number(saved.id))
  }

  async update(userId: string, id: number, dto: Record<string, unknown>) {
    const row = await this.repo.findOne({ where: { id: String(id), userId } })
    if (!row) throw new NotFoundException('日程不存在')
    applyFields(row as never, dto ?? {}, FIELDS)
    await this.repo.save(row)
    if (dto && 'list' in dto) await this.replaceItems(userId, String(id), dto.list)
    if (dto && ('done' in dto || 'skip' in dto)) await this.replaceLogs(userId, String(id), dto.done, dto.skip)
    return this.detail(userId, id)
  }

  /** 日历上勾一天：state = done / skip / none */
  async setDay(userId: string, id: number, dto: { date?: string; state?: string }) {
    const date = String(dto?.date ?? '')
    if (!DATE_RE.test(date)) throw new BadRequestException('date 格式应为 YYYY-MM-DD')
    const row = await this.repo.findOne({ where: { id: String(id), userId } })
    if (!row) throw new NotFoundException('日程不存在')

    const state = dto?.state === 'done' || dto?.state === 'skip' ? dto.state : null
    const existing = await this.logs.findOne({ where: { eventId: String(id), date } })
    if (!state) {
      if (existing) await this.logs.remove(existing)
      return { eventId: String(id), date, state: null }
    }
    if (existing) {
      existing.state = state
      await this.logs.save(existing)
    } else {
      await this.logs.save(this.logs.create({ userId, eventId: String(id), date, state }))
    }
    return { eventId: String(id), date, state }
  }

  async remove(userId: string, id: number) {
    const row = await this.repo.findOne({ where: { id: String(id), userId } })
    if (!row) throw new NotFoundException('日程不存在')
    await this.repo.remove(row)
    return { id: String(id) }
  }
}

@Controller('events')
@UseGuards(JwtAuthGuard)
export class EventController {
  constructor(private readonly events: EventService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query() q: { from?: string; to?: string; kidId?: string; type?: string },
  ) {
    return this.events.list(user.id, q ?? {})
  }

  @Get(':id')
  detail(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.events.detail(user.id, id)
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: Record<string, unknown>) {
    return this.events.create(user.id, dto ?? {})
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.events.update(user.id, id, dto ?? {})
  }

  @Put(':id/day')
  day(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { date?: string; state?: string },
  ) {
    return this.events.setDay(user.id, id, dto ?? {})
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.events.remove(user.id, id)
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Ev, EventItem, EventDayLog, Kid])],
  controllers: [EventController],
  providers: [EventService, JwtAuthGuard],
  exports: [EventService],
})
export class EventModule {}
