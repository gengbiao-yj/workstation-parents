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
import { Between, MoreThanOrEqual, Repository } from 'typeorm'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { applyFields, fieldDefaults, FieldSpec, numOr0, numOrUndefined, textOrEmpty } from '../../common/utils/mapper'
import { AuthUser, JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Kid } from '../kid/entities/kid.entity'
import { AbilityRecord, GrowthRecord, JournalEntry } from './entities/record.entities'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MONTH_RE = /^\d{4}-\d{2}$/

/* ================= 身高体重 ================= */

const GROWTH_FIELDS: FieldSpec[] = [
  { key: 'kidId', kind: 'ref', from: ['kid', 'kidId'] },
  { key: 'date', kind: 'date' },
  { key: 'h', kind: 'decimal' },
  { key: 'w', kind: 'decimal' },
  { key: 'vl', kind: 'decimal' },
  { key: 'vr', kind: 'decimal' },
]

@Injectable()
export class GrowthService {
  constructor(
    @InjectRepository(GrowthRecord) private readonly repo: Repository<GrowthRecord>,
    @InjectRepository(Kid) private readonly kids: Repository<Kid>,
  ) {}

  private toView(g: GrowthRecord) {
    return {
      id: String(g.id),
      kid: String(g.kidId),
      date: g.date,
      h: numOr0(g.h),
      w: numOr0(g.w),
      ...(g.vl === null ? {} : { vl: numOr0(g.vl) }),
      ...(g.vr === null ? {} : { vr: numOr0(g.vr) }),
    }
  }

  async list(userId: string, kidId?: string) {
    const where: Record<string, unknown> = { userId }
    if (kidId) where.kidId = kidId
    const rows = await this.repo.find({ where, order: { date: 'ASC', id: 'ASC' } })
    return rows.map((r) => this.toView(r))
  }

  async create(userId: string, dto: Record<string, unknown>) {
    if (!dto?.kidId && !dto?.kid) throw new BadRequestException('缺少 kidId')
    if (!dto?.date || !DATE_RE.test(String(dto.date))) throw new BadRequestException('date 格式应为 YYYY-MM-DD')
    const kid = await this.kids.findOne({ where: { id: String(dto.kidId ?? dto.kid), userId } })
    if (!kid) throw new BadRequestException('孩子档案不存在')
    const entity = Object.assign(this.repo.create(), { userId, ...fieldDefaults(GROWTH_FIELDS) })
    applyFields(entity as never, dto, GROWTH_FIELDS)
    return this.toView(await this.repo.save(entity))
  }

  async update(userId: string, id: number, dto: Record<string, unknown>) {
    const row = await this.repo.findOne({ where: { id: String(id), userId } })
    if (!row) throw new NotFoundException('记录不存在')
    applyFields(row as never, dto ?? {}, GROWTH_FIELDS)
    return this.toView(await this.repo.save(row))
  }

  async remove(userId: string, id: number) {
    const row = await this.repo.findOne({ where: { id: String(id), userId } })
    if (!row) throw new NotFoundException('记录不存在')
    await this.repo.remove(row)
    return { id: String(id) }
  }
}

/* ================= 成长日记 ================= */

const JOURNAL_FIELDS: FieldSpec[] = [
  { key: 'kidId', kind: 'ref', from: ['kid', 'kidId'] },
  { key: 'date', kind: 'date' },
  { key: 'mood', kind: 'text', max: 16 },
  { key: 'content', kind: 'text', from: 'text', max: 65535 },
  { key: 'dim', kind: 'text', max: 4 },
  { key: 'first', kind: 'bool' },
  { key: 't', kind: 'big' },
]

@Injectable()
export class JournalService {
  constructor(
    @InjectRepository(JournalEntry) private readonly repo: Repository<JournalEntry>,
    @InjectRepository(Kid) private readonly kids: Repository<Kid>,
  ) {}

  private toView(j: JournalEntry) {
    return {
      id: String(j.id),
      kid: String(j.kidId),
      date: j.date,
      mood: j.mood,
      text: j.content,
      dim: j.dim,
      ...(j.first ? { first: true } : {}),
      t: Number(j.t),
    }
  }

  async list(userId: string, q: { kidId?: string; from?: string; to?: string }) {
    const where: Record<string, unknown> = { userId }
    if (q.kidId) where.kidId = q.kidId
    if (q.from && q.to && DATE_RE.test(q.from) && DATE_RE.test(q.to)) where.date = Between(q.from, q.to)
    else if (q.from && DATE_RE.test(q.from)) where.date = MoreThanOrEqual(q.from)
    const rows = await this.repo.find({ where, order: { date: 'DESC', id: 'DESC' } })
    return rows.map((r) => this.toView(r))
  }

  async create(userId: string, dto: Record<string, unknown>) {
    if (!dto?.kidId && !dto?.kid) throw new BadRequestException('缺少 kidId')
    if (!dto?.date || !DATE_RE.test(String(dto.date))) throw new BadRequestException('date 格式应为 YYYY-MM-DD')
    const kid = await this.kids.findOne({ where: { id: String(dto.kidId ?? dto.kid), userId } })
    if (!kid) throw new BadRequestException('孩子档案不存在')
    const entity = Object.assign(this.repo.create(), {
      userId,
      ...fieldDefaults(JOURNAL_FIELDS),
      t: String(Date.now()),
    })
    applyFields(entity as never, dto, JOURNAL_FIELDS)
    return this.toView(await this.repo.save(entity))
  }

  async update(userId: string, id: number, dto: Record<string, unknown>) {
    const row = await this.repo.findOne({ where: { id: String(id), userId } })
    if (!row) throw new NotFoundException('日记不存在')
    applyFields(row as never, dto ?? {}, JOURNAL_FIELDS)
    return this.toView(await this.repo.save(row))
  }

  async remove(userId: string, id: number) {
    const row = await this.repo.findOne({ where: { id: String(id), userId } })
    if (!row) throw new NotFoundException('日记不存在')
    await this.repo.remove(row)
    return { id: String(id) }
  }
}

/* ================= 五育能力月度评分 ================= */

const ABILITY_FIELDS: FieldSpec[] = [
  { key: 'kidId', kind: 'ref', from: ['kid', 'kidId'] },
  { key: 'month', kind: 'month' },
  { key: 'scores', kind: 'json', from: 's' },
  { key: 'note', kind: 'nullable', max: 65535 },
]

@Injectable()
export class AbilityService {
  constructor(
    @InjectRepository(AbilityRecord) private readonly repo: Repository<AbilityRecord>,
    @InjectRepository(Kid) private readonly kids: Repository<Kid>,
  ) {}

  private toView(a: AbilityRecord) {
    return {
      id: String(a.id),
      kid: String(a.kidId),
      month: a.month,
      s: a.scores ?? {},
      note: textOrEmpty(a.note),
    }
  }

  async list(userId: string, q: { kidId?: string; month?: string }) {
    const where: Record<string, unknown> = { userId }
    if (q.kidId) where.kidId = q.kidId
    if (q.month && MONTH_RE.test(q.month)) where.month = q.month
    const rows = await this.repo.find({ where, order: { month: 'ASC', id: 'ASC' } })
    return rows.map((r) => this.toView(r))
  }

  async create(userId: string, dto: Record<string, unknown>) {
    if (!dto?.kidId && !dto?.kid) throw new BadRequestException('缺少 kidId')
    if (!dto?.month || !MONTH_RE.test(String(dto.month))) throw new BadRequestException('month 格式应为 YYYY-MM')
    const kid = await this.kids.findOne({ where: { id: String(dto.kidId ?? dto.kid), userId } })
    if (!kid) throw new BadRequestException('孩子档案不存在')
    const entity = Object.assign(this.repo.create(), { userId, ...fieldDefaults(ABILITY_FIELDS) })
    applyFields(entity as never, dto, ABILITY_FIELDS)
    return this.toView(await this.repo.save(entity))
  }

  async update(userId: string, id: number, dto: Record<string, unknown>) {
    const row = await this.repo.findOne({ where: { id: String(id), userId } })
    if (!row) throw new NotFoundException('记录不存在')
    applyFields(row as never, dto ?? {}, ABILITY_FIELDS)
    return this.toView(await this.repo.save(row))
  }

  async remove(userId: string, id: number) {
    const row = await this.repo.findOne({ where: { id: String(id), userId } })
    if (!row) throw new NotFoundException('记录不存在')
    await this.repo.remove(row)
    return { id: String(id) }
  }
}

/* ================= 控制器 ================= */

@Controller('growth')
@UseGuards(JwtAuthGuard)
export class GrowthController {
  constructor(private readonly svc: GrowthService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('kidId') kidId?: string) {
    return this.svc.list(user.id, kidId)
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: Record<string, unknown>) {
    return this.svc.create(user.id, dto ?? {})
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.svc.update(user.id, id, dto ?? {})
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(user.id, id)
  }
}

@Controller('journal')
@UseGuards(JwtAuthGuard)
export class JournalController {
  constructor(private readonly svc: JournalService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() q: { kidId?: string; from?: string; to?: string }) {
    return this.svc.list(user.id, q ?? {})
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: Record<string, unknown>) {
    return this.svc.create(user.id, dto ?? {})
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.svc.update(user.id, id, dto ?? {})
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(user.id, id)
  }
}

@Controller('abilities')
@UseGuards(JwtAuthGuard)
export class AbilityController {
  constructor(private readonly svc: AbilityService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() q: { kidId?: string; month?: string }) {
    return this.svc.list(user.id, q ?? {})
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: Record<string, unknown>) {
    return this.svc.create(user.id, dto ?? {})
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.svc.update(user.id, id, dto ?? {})
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(user.id, id)
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([GrowthRecord, JournalEntry, AbilityRecord, Kid])],
  controllers: [GrowthController, JournalController, AbilityController],
  providers: [GrowthService, JournalService, AbilityService, JwtAuthGuard],
  exports: [GrowthService, JournalService, AbilityService],
})
export class RecordModule {}
