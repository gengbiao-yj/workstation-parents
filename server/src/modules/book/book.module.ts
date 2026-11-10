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
import { Book } from './entities/book.entities'

/** 入参形状 = 前端 Book */
const FIELDS: FieldSpec[] = [
  { key: 'kidId', kind: 'ref', from: ['kid', 'kidId'] },
  { key: 'title', kind: 'text', max: 128 },
  { key: 'author', kind: 'text', max: 64 },
  { key: 'status', kind: 'text', max: 16, def: 'want' },
  { key: 'date', kind: 'date' },
  { key: 'rating', kind: 'int', min: 0, high: 255 },
  { key: 'note', kind: 'nullable', max: 65535 },
  { key: 'color', kind: 'text', max: 16 },
]

@Injectable()
export class BookService {
  constructor(
    @InjectRepository(Book) private readonly repo: Repository<Book>,
    @InjectRepository(Kid) private readonly kids: Repository<Kid>,
  ) {}

  private toView(b: Book) {
    return {
      id: String(b.id),
      kid: String(b.kidId),
      title: b.title,
      author: b.author,
      status: b.status,
      date: textOrEmpty(b.date),
      rating: b.rating,
      note: textOrEmpty(b.note),
      color: b.color,
    }
  }

  async list(userId: string, q: { kidId?: string; status?: string }) {
    const where: Record<string, unknown> = { userId }
    if (q.kidId) where.kidId = q.kidId
    if (q.status) where.status = q.status
    const rows = await this.repo.find({ where, order: { id: 'ASC' } })
    return rows.map((r) => this.toView(r))
  }

  async detail(userId: string, id: number) {
    const row = await this.repo.findOne({ where: { id: String(id), userId } })
    if (!row) throw new NotFoundException('书目不存在')
    return this.toView(row)
  }

  async create(userId: string, dto: Record<string, unknown>) {
    if (!dto?.title) throw new BadRequestException('书名不能为空')
    if (!dto?.kidId && !dto?.kid) throw new BadRequestException('缺少 kidId')
    const kid = await this.kids.findOne({ where: { id: String(dto.kidId ?? dto.kid), userId } })
    if (!kid) throw new BadRequestException('孩子档案不存在')
    const entity = Object.assign(this.repo.create(), { userId, ...fieldDefaults(FIELDS) })
    applyFields(entity as never, dto, FIELDS)
    return this.toView(await this.repo.save(entity))
  }

  async update(userId: string, id: number, dto: Record<string, unknown>) {
    const row = await this.repo.findOne({ where: { id: String(id), userId } })
    if (!row) throw new NotFoundException('书目不存在')
    applyFields(row as never, dto ?? {}, FIELDS)
    return this.toView(await this.repo.save(row))
  }

  async remove(userId: string, id: number) {
    const row = await this.repo.findOne({ where: { id: String(id), userId } })
    if (!row) throw new NotFoundException('书目不存在')
    await this.repo.remove(row)
    return { id: String(id) }
  }
}

@Controller('books')
@UseGuards(JwtAuthGuard)
export class BookController {
  constructor(private readonly books: BookService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() q: { kidId?: string; status?: string }) {
    return this.books.list(user.id, q ?? {})
  }

  @Get(':id')
  detail(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.books.detail(user.id, id)
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: Record<string, unknown>) {
    return this.books.create(user.id, dto ?? {})
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.books.update(user.id, id, dto ?? {})
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.books.remove(user.id, id)
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Book, Kid])],
  controllers: [BookController],
  providers: [BookService, JwtAuthGuard],
  exports: [BookService],
})
export class BookModule {}
