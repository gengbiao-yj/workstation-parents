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
import { applyFields, fieldDefaults, FieldSpec } from '../../common/utils/mapper'
import { AuthUser, JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Kid } from '../kid/entities/kid.entity'
import { Chat, ChatMessage } from './entities/chat.entities'

/** 入参形状 = 前端 Chat（含 msgs 数组） */
const FIELDS: FieldSpec[] = [
  { key: 'kidId', kind: 'ref', from: ['kid', 'kidId'] },
  { key: 'title', kind: 'text', max: 128 },
  { key: 'tpl', kind: 'nullable', max: 32 },
  { key: 't', kind: 'big' },
  { key: 'batchOnly', kind: 'bool' },
]

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Chat) private readonly repo: Repository<Chat>,
    @InjectRepository(ChatMessage) private readonly msgs: Repository<ChatMessage>,
    @InjectRepository(Kid) private readonly kids: Repository<Kid>,
  ) {}

  private toView(c: Chat, msgs: ChatMessage[]) {
    return {
      id: String(c.id),
      title: c.title,
      ...(c.kidId === null ? {} : { kid: String(c.kidId) }),
      ...(c.tpl ? { tpl: c.tpl } : {}),
      t: Number(c.t),
      ...(c.batchOnly ? { batchOnly: true } : {}),
      msgs: msgs.map((m) => ({
        role: m.role as 'user' | 'bot',
        content: m.content,
        ...(m.show === null ? {} : { show: m.show }),
        ...(m.streaming ? { streaming: true } : {}),
        ...(m.err === null ? {} : { err: m.err }),
        ...(m.batch ? { batch: true } : {}),
        ...(Number(m.t) ? { t: Number(m.t) } : {}),
        ...(m.model ? { model: m.model } : {}),
      })),
    }
  }

  private groupMsgs(rows: ChatMessage[]) {
    const map = new Map<string, ChatMessage[]>()
    for (const r of rows) {
      const k = String(r.chatId)
      const list = map.get(k)
      if (list) list.push(r)
      else map.set(k, [r])
    }
    for (const list of map.values()) list.sort((a, b) => a.sort - b.sort || Number(a.id) - Number(b.id))
    return map
  }

  async list(userId: string, q: { kidId?: string }) {
    const where: Record<string, unknown> = { userId }
    if (q.kidId) where.kidId = q.kidId
    const [rows, msgs] = await Promise.all([
      this.repo.find({ where, order: { t: 'DESC', id: 'DESC' } }),
      this.msgs.find({ where: { userId }, order: { sort: 'ASC' } }),
    ])
    const grouped = this.groupMsgs(msgs)
    return rows.map((r) => this.toView(r, grouped.get(String(r.id)) ?? []))
  }

  async detail(userId: string, id: number) {
    const row = await this.repo.findOne({ where: { id: String(id), userId } })
    if (!row) throw new NotFoundException('会话不存在')
    const msgs = await this.msgs.find({ where: { chatId: String(id) }, order: { sort: 'ASC' } })
    return this.toView(row, msgs)
  }

  private rowOf(userId: string, chatId: string, msg: any, sort: number) {
    return {
      userId,
      chatId,
      role: msg?.role === 'user' ? 'user' : 'bot',
      content: String(msg?.content ?? '').slice(0, 16777215),
      show: msg?.show === undefined || msg?.show === null || msg?.show === '' ? null : String(msg.show).slice(0, 65535),
      streaming: Boolean(msg?.streaming),
      err: msg?.err === undefined || msg?.err === null ? null : String(msg.err).slice(0, 65535),
      batch: Boolean(msg?.batch),
      t: Number(msg?.t) > 0 ? String(Math.floor(Number(msg.t))) : '0',
      model: String(msg?.model ?? '').slice(0, 64),
      sort,
    }
  }

  /** 消息整体替换：前端每次提交完整 msgs，流式生成结束后再同步一次 */
  private async replaceMsgs(userId: string, chatId: string, list: unknown) {
    await this.msgs.delete({ chatId })
    if (!Array.isArray(list) || !list.length) return
    const rows = list.slice(0, 500).map((m: any, i: number) => this.rowOf(userId, chatId, m, i))
    await this.msgs.save(rows as never)
  }

  async create(userId: string, dto: Record<string, unknown>) {
    if (dto?.kidId) {
      const kid = await this.kids.findOne({ where: { id: String(dto.kidId ?? dto.kid), userId } })
      if (!kid) throw new BadRequestException('孩子档案不存在')
    }
    const entity = Object.assign(this.repo.create(), {
      userId,
      ...fieldDefaults(FIELDS),
      t: String(Date.now()),
    })
    applyFields(entity as never, dto, FIELDS)
    const saved = await this.repo.save(entity)
    await this.replaceMsgs(userId, saved.id, dto.msgs)
    return this.detail(userId, Number(saved.id))
  }

  async update(userId: string, id: number, dto: Record<string, unknown>) {
    const row = await this.repo.findOne({ where: { id: String(id), userId } })
    if (!row) throw new NotFoundException('会话不存在')
    applyFields(row as never, dto ?? {}, FIELDS)
    await this.repo.save(row)
    if (dto && 'msgs' in dto) await this.replaceMsgs(userId, String(id), dto.msgs)
    return this.detail(userId, id)
  }

  /** 追加一条消息（流式生成时先把 user 消息落库，再更新 bot 消息） */
  async appendMessage(userId: string, id: number, dto: Record<string, unknown>) {
    const row = await this.repo.findOne({ where: { id: String(id), userId } })
    if (!row) throw new NotFoundException('会话不存在')
    const max = await this.msgs.find({ where: { chatId: String(id) }, order: { sort: 'DESC' }, take: 1 })
    const sort = max.length ? max[0].sort + 1 : 0
    await this.msgs.save(this.msgs.create(this.rowOf(userId, String(id), dto, sort) as unknown as ChatMessage))
    return this.detail(userId, id)
  }

  async remove(userId: string, id: number) {
    const row = await this.repo.findOne({ where: { id: String(id), userId } })
    if (!row) throw new NotFoundException('会话不存在')
    await this.repo.remove(row)
    return { id: String(id) }
  }
}

@Controller('chats')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chats: ChatService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('kidId') kidId?: string) {
    return this.chats.list(user.id, { kidId })
  }

  @Get(':id')
  detail(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.chats.detail(user.id, id)
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: Record<string, unknown>) {
    return this.chats.create(user.id, dto ?? {})
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.chats.update(user.id, id, dto ?? {})
  }

  @Post(':id/messages')
  append(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.chats.appendMessage(user.id, id, dto ?? {})
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.chats.remove(user.id, id)
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Chat, ChatMessage, Kid])],
  controllers: [ChatController],
  providers: [ChatService, JwtAuthGuard],
  exports: [ChatService],
})
export class ChatModule {}
