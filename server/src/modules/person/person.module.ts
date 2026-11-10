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
import { Repository } from 'typeorm'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { applyFields, fieldDefaults, FieldSpec, textOrEmpty } from '../../common/utils/mapper'
import { AuthUser, JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Kid } from '../kid/entities/kid.entity'
import { Person, PersonGreeting } from './entities/person.entities'

/** 入参形状 = 前端 Person（含 greeted 年份 map） */
const FIELDS: FieldSpec[] = [
  { key: 'kidId', kind: 'ref', from: ['kid', 'kidId'] },
  { key: 'name', kind: 'text', max: 32 },
  { key: 'rel', kind: 'text', max: 16, def: 'friend' },
  { key: 'label', kind: 'text', max: 32 },
  { key: 'close', kind: 'int', min: 1, high: 3, def: 1 },
  { key: 'gender', kind: 'text', max: 1, def: 'F' },
  { key: 'birthday', kind: 'date' },
  { key: 'likes', kind: 'text', max: 255 },
  { key: 'contact', kind: 'text', max: 128 },
  { key: 'note', kind: 'nullable', max: 65535 },
  { key: 'met', kind: 'date' },
  { key: 'sibling', kind: 'nullable', max: 64 },
  { key: 'adult', kind: 'bool' },
]

@Injectable()
export class PersonService {
  constructor(
    @InjectRepository(Person) private readonly repo: Repository<Person>,
    @InjectRepository(PersonGreeting) private readonly greetings: Repository<PersonGreeting>,
    @InjectRepository(Kid) private readonly kids: Repository<Kid>,
  ) {}

  private toView(p: Person, years: number[]) {
    const greeted: Record<string, boolean> = {}
    for (const y of years) greeted[String(y)] = true
    return {
      id: String(p.id),
      kid: p.kidId === null ? '' : String(p.kidId),
      name: p.name,
      rel: p.rel,
      label: p.label,
      close: p.close,
      gender: p.gender,
      birthday: textOrEmpty(p.birthday),
      likes: p.likes,
      contact: p.contact,
      note: textOrEmpty(p.note),
      met: textOrEmpty(p.met),
      greeted,
      ...(p.mk === null ? {} : { mk: p.mk }),
      ...(p.sibling ? { sibling: p.sibling } : {}),
      ...(p.adult ? { adult: true } : {}),
    }
  }

  private groupYears(rows: PersonGreeting[]) {
    const map = new Map<string, number[]>()
    for (const r of rows) {
      const k = String(r.personId)
      const list = map.get(k)
      if (list) list.push(r.year)
      else map.set(k, [r.year])
    }
    return map
  }

  async list(userId: string, kidId?: string) {
    const where: Record<string, unknown> = { userId }
    if (kidId) where.kidId = kidId
    const [rows, years] = await Promise.all([
      this.repo.find({ where, order: { close: 'DESC', id: 'ASC' } }),
      this.greetings.find({ where: { userId }, order: { year: 'ASC' } }),
    ])
    const grouped = this.groupYears(years)
    return rows.map((r) => this.toView(r, grouped.get(String(r.id)) ?? []))
  }

  async detail(userId: string, id: number) {
    const row = await this.repo.findOne({ where: { id: String(id), userId } })
    if (!row) throw new NotFoundException('联系人不存在')
    const years = await this.greetings.find({ where: { personId: String(id) }, order: { year: 'ASC' } })
    return this.toView(row, years.map((y) => y.year))
  }

  private async replaceGreetings(userId: string, personId: string, greeted: unknown) {
    await this.greetings.delete({ personId })
    if (!greeted || typeof greeted !== 'object') return
    const rows: Record<string, unknown>[] = []
    for (const [year, on] of Object.entries(greeted as Record<string, unknown>)) {
      const y = Number(year)
      if (!on || !Number.isInteger(y) || y < 1900 || y > 2999) continue
      rows.push({ userId, personId, year: y })
    }
    if (rows.length) await this.greetings.save(rows as never)
  }

  private applyMk(row: Person, dto: Record<string, unknown>) {
    if (!('mk' in dto)) return
    const v = dto.mk
    row.mk = v === null || v === undefined || v === '' ? null : Math.round(Number(v))
  }

  async create(userId: string, dto: Record<string, unknown>) {
    if (!dto?.name) throw new BadRequestException('联系人姓名不能为空')
    if (dto.kidId || dto.kid) {
      const kid = await this.kids.findOne({ where: { id: String(dto.kidId ?? dto.kid), userId } })
      if (!kid) throw new BadRequestException('孩子档案不存在')
    }
    const entity = Object.assign(this.repo.create(), { userId, ...fieldDefaults(FIELDS) })
    applyFields(entity as never, dto, FIELDS)
    this.applyMk(entity, dto)
    const saved = await this.repo.save(entity)
    await this.replaceGreetings(userId, saved.id, dto.greeted)
    return this.detail(userId, Number(saved.id))
  }

  async update(userId: string, id: number, dto: Record<string, unknown>) {
    const row = await this.repo.findOne({ where: { id: String(id), userId } })
    if (!row) throw new NotFoundException('联系人不存在')
    applyFields(row as never, dto ?? {}, FIELDS)
    this.applyMk(row, dto ?? {})
    await this.repo.save(row)
    if (dto && 'greeted' in dto) await this.replaceGreetings(userId, String(id), dto.greeted)
    return this.detail(userId, id)
  }

  /** 生日祝福勾选：year 传 0 或不传表示取消 */
  async setGreeting(userId: string, id: number, dto: { year?: number; greeted?: boolean }) {
    const row = await this.repo.findOne({ where: { id: String(id), userId } })
    if (!row) throw new NotFoundException('联系人不存在')
    const year = Number(dto?.year)
    if (!Number.isInteger(year) || year < 1900 || year > 2999) throw new BadRequestException('year 不合法')

    const existing = await this.greetings.findOne({ where: { personId: String(id), year } })
    if (dto.greeted === false) {
      if (existing) await this.greetings.remove(existing)
      return { personId: String(id), year, greeted: false }
    }
    if (!existing) await this.greetings.save(this.greetings.create({ userId, personId: String(id), year }))
    return { personId: String(id), year, greeted: true }
  }

  async remove(userId: string, id: number) {
    const row = await this.repo.findOne({ where: { id: String(id), userId } })
    if (!row) throw new NotFoundException('联系人不存在')
    await this.repo.remove(row)
    return { id: String(id) }
  }
}

@Controller('people')
@UseGuards(JwtAuthGuard)
export class PersonController {
  constructor(private readonly people: PersonService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('kidId') kidId?: string) {
    return this.people.list(user.id, kidId)
  }

  @Get(':id')
  detail(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.people.detail(user.id, id)
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: Record<string, unknown>) {
    return this.people.create(user.id, dto ?? {})
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.people.update(user.id, id, dto ?? {})
  }

  @Put(':id/greetings')
  greet(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { year?: number; greeted?: boolean },
  ) {
    return this.people.setGreeting(user.id, id, dto ?? {})
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.people.remove(user.id, id)
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Person, PersonGreeting, Kid])],
  controllers: [PersonController],
  providers: [PersonService, JwtAuthGuard],
  exports: [PersonService],
})
export class PersonModule {}
