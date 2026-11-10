import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'
import { OwnedEntity } from '../../../common/entities/base.entity'
import { Kid } from '../../kid/entities/kid.entity'

/** AI 会话（对应前端 Chat） */
@Entity('chats')
export class Chat extends OwnedEntity {
  @Index()
  @Column({ name: 'kid_id', type: 'bigint', unsigned: true, nullable: true })
  kidId: string | null

  @ManyToOne(() => Kid, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'kid_id' })
  kid: Kid | null

  @Column({ type: 'varchar', length: 128, default: '' })
  title: string

  /** 来源模板 id */
  @Column({ type: 'varchar', length: 32, nullable: true })
  tpl: string | null

  @Column({ type: 'bigint', unsigned: true, default: 0 })
  t: string

  @Column({ name: 'batch_only', type: 'boolean', default: false })
  batchOnly: boolean
}

/** 会话消息（对应前端 ChatMsg） */
@Entity('chat_messages')
export class ChatMessage extends OwnedEntity {
  @Index()
  @Column({ name: 'chat_id', type: 'bigint', unsigned: true })
  chatId: string

  @ManyToOne(() => Chat, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chat_id' })
  chat: Chat

  /** user / bot */
  @Column({ type: 'varchar', length: 8 })
  role: string

  @Column({ type: 'mediumtext' })
  content: string

  /** 气泡里显示的短文本 */
  @Column({ name: 'show_text', type: 'text', nullable: true })
  show: string | null

  @Column({ type: 'boolean', default: false })
  streaming: boolean

  @Column({ type: 'text', nullable: true })
  err: string | null

  @Column({ type: 'boolean', default: false })
  batch: boolean

  @Column({ type: 'bigint', unsigned: true, default: 0 })
  t: string

  @Column({ type: 'varchar', length: 64, default: '' })
  model: string

  @Column({ type: 'int', unsigned: true, default: 0 })
  sort: number
}
