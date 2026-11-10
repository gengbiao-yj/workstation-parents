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
import { applyFields, fieldDefaults, FieldSpec, numOr0, textOrEmpty } from '../../common/utils/mapper'
import { AuthUser, JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Kid } from '../kid/entities/kid.entity'
import { Exam, ExamItem } from './entities/exam.entities'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** 入参形状 = 前端 Exam（含 items 数组） */
const FIELDS: FieldSpec[] = [
  { key: 'kidId', kind: 'ref', from: ['kid', 'kidId'] },
  { key: 'date', kind: 'date' },
  { key: 'name', kind: 'text', max: 64 },
  { key: 'note', kind: 'nullable', max: 65535 },
]

@Injectable()
export class ExamService {
  constructor(
    @InjectRepository(Exam) private readonly repo: Repository<Exam>,
    @InjectRepository(ExamItem) private readonly items: Repository<ExamItem>,
    @InjectRepository(Kid) private readonly kids: Repository<Kid>,
  ) {}

  private toView(e: Exam, items: ExamItem[]) {
    return {
      id: String(e.id),
      kid: String(e.kidId),
      date: e.date,
      name: e.name,
      note: textOrEmpty(e.note),
      items: items.map((it) => ({ sub: it.subject, score: numOr0(it.score), full: numOr0(it.full) })),
    }
  }

  private groupItems(rows: ExamItem[]) {
    const map = new Map<string, ExamItem[]>()
    for (const r of rows) {
      const k = String(r.examId)
      const list = map.get(k)
      if (list) list.push(r)
      else map.set(k, [r])
    }
    return map
  }

  async list(userId: string, q: { kidId?: string; from?: string; to?: string }) {
    const where: Record<string, unknown> = { userId }
    if (q.kidId) where.kidId = q.kidId
    const [rows, items] = await Promise.all([
      this.repo.find({ where, order: { date: 'DESC', id: 'ASC' } }),
      this.items.find({ where: { userId }, order: { id: 'ASC' } }),
    ])
    const grouped = this.groupItems(items)
    return rows.map((r) => this.toView(r, grouped.get(String(r.id)) ?? []))
  }

  async detail(userId: string, id: number) {
    const row = await this.repo.findOne({ where: { id: String(id), userId } })
    if (!row) throw new NotFoundException('成绩单不存在')
    const items = await this.items.find({ where: { examId: String(id) }, order: { id: 'ASC' } })
    return this.toView(row, items)
  }

  private async replaceItems(userId: string, examId: string, items: unknown) {
    await this.items.delete({ examId })
    if (!Array.isArray(items) || !items.length) return
    // exam_items 没有排序列，靠自增 id 保序（先删后插）
    const rows = items.slice(0, 50).map((it: any) => ({
      userId,
      examId,
      subject: String(it?.sub ?? '').slice(0, 32),
      score: it?.score === undefined || it?.score === null || it?.score === '' ? null : String(Number(it.score)),
      full: it?.full === undefined || it?.full === null || it?.full === '' ? null : String(Number(it.full)),
    }))
    await this.items.save(rows as never)
  }

  async create(userId: string, dto: Record<string, unknown>) {
    if (!dto?.kidId && !dto?.kid) throw new BadRequestException('缺少 kidId')
    if (!dto?.date || !DATE_RE.test(String(dto.date))) throw new BadRequestException('date 格式应为 YYYY-MM-DD')
    const kid = await this.kids.findOne({ where: { id: String(dto.kidId ?? dto.kid), userId } })
    if (!kid) throw new BadRequestException('孩子档案不存在')
    const entity = Object.assign(this.repo.create(), { userId, ...fieldDefaults(FIELDS) })
    applyFields(entity as never, dto, FIELDS)
    const saved = await this.repo.save(entity)
    await this.replaceItems(userId, saved.id, dto.items)
    return this.detail(userId, Number(saved.id))
  }

  async update(userId: string, id: number, dto: Record<string, unknown>) {
    const row = await this.repo.findOne({ where: { id: String(id), userId } })
    if (!row) throw new NotFoundException('成绩单不存在')
    applyFields(row as never, dto ?? {}, FIELDS)
    await this.repo.save(row)
    if (dto && 'items' in dto) await this.replaceItems(userId, String(id), dto.items)
    return this.detail(userId, id)
  }

  async remove(userId: string, id: number) {
    const row = await this.repo.findOne({ where: { id: String(id), userId } })
    if (!row) throw new NotFoundException('成绩单不存在')
    await this.repo.remove(row)
    return { id: String(id) }
  }
}

@Controller('exams')
@UseGuards(JwtAuthGuard)
export class ExamController {
  constructor(private readonly exams: ExamService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() q: { kidId?: string; from?: string; to?: string }) {
    return this.exams.list(user.id, q ?? {})
  }

  @Get(':id')
  detail(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.exams.detail(user.id, id)
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: Record<string, unknown>) {
    return this.exams.create(user.id, dto ?? {})
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.exams.update(user.id, id, dto ?? {})
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.exams.remove(user.id, id)
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Exam, ExamItem, Kid])],
  controllers: [ExamController],
  providers: [ExamService, JwtAuthGuard],
  exports: [ExamService],
})
export class ExamModule {}
