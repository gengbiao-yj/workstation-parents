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
  UseGuards,
} from '@nestjs/common'
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { applyFields, fieldDefaults, FieldSpec } from '../../common/utils/mapper'
import { AuthUser, JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Todo } from './entities/todo.entities'

/** 入参形状 = 前端 Todo */
const FIELDS: FieldSpec[] = [
  { key: 'text', kind: 'text', max: 255 },
  { key: 'done', kind: 'bool' },
  { key: 'sort', kind: 'int', min: 0 },
]

@Injectable()
export class TodoService {
  constructor(@InjectRepository(Todo) private readonly repo: Repository<Todo>) {}

  private toView(t: Todo) {
    return { id: String(t.id), text: t.text, done: t.done }
  }

  async list(userId: string) {
    const rows = await this.repo.find({ where: { userId }, order: { sort: 'ASC', id: 'ASC' } })
    return rows.map((r) => this.toView(r))
  }

  async create(userId: string, dto: Record<string, unknown>) {
    if (!dto?.text) throw new BadRequestException('待办内容不能为空')
    const count = await this.repo.count({ where: { userId } })
    const entity = Object.assign(this.repo.create(), { userId, ...fieldDefaults(FIELDS), sort: count })
    applyFields(entity as never, dto, FIELDS)
    return this.toView(await this.repo.save(entity))
  }

  async update(userId: string, id: number, dto: Record<string, unknown>) {
    const row = await this.repo.findOne({ where: { id: String(id), userId } })
    if (!row) throw new NotFoundException('待办不存在')
    applyFields(row as never, dto ?? {}, FIELDS)
    return this.toView(await this.repo.save(row))
  }

  /** 整表重排：按传入的 id 顺序写 sort */
  async reorder(userId: string, ids: unknown) {
    if (!Array.isArray(ids)) throw new BadRequestException('ids 必须是数组')
    const rows = await this.repo.find({ where: { userId } })
    const order = new Map(ids.map((id, i) => [String(id), i]))
    for (const row of rows) {
      const next = order.get(String(row.id))
      if (next !== undefined && row.sort !== next) {
        row.sort = next
        await this.repo.save(row)
      }
    }
    return this.list(userId)
  }

  async remove(userId: string, id: number) {
    const row = await this.repo.findOne({ where: { id: String(id), userId } })
    if (!row) throw new NotFoundException('待办不存在')
    await this.repo.remove(row)
    return { id: String(id) }
  }
}

@Controller('todos')
@UseGuards(JwtAuthGuard)
export class TodoController {
  constructor(private readonly todos: TodoService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.todos.list(user.id)
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: Record<string, unknown>) {
    return this.todos.create(user.id, dto ?? {})
  }

  @Put('reorder')
  reorder(@CurrentUser() user: AuthUser, @Body() dto: { ids?: unknown }) {
    return this.todos.reorder(user.id, dto?.ids)
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.todos.update(user.id, id, dto ?? {})
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.todos.remove(user.id, id)
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Todo])],
  controllers: [TodoController],
  providers: [TodoService, JwtAuthGuard],
  exports: [TodoService],
})
export class TodoModule {}
