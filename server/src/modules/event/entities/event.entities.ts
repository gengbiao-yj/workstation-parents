import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm'
import { OwnedEntity } from '../../../common/entities/base.entity'
import { Kid } from '../../kid/entities/kid.entity'

/** 日程（对应前端 Ev） */
@Entity('events')
export class Ev extends OwnedEntity {
  /** 空字符串 / NULL = 全家事件 */
  @Index()
  @Column({ name: 'kid_id', type: 'bigint', unsigned: true, nullable: true })
  kidId: string | null

  @ManyToOne(() => Kid, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'kid_id' })
  kid: Kid | null

  @Column({ type: 'varchar', length: 16 })
  type: string

  @Column({ type: 'varchar', length: 128 })
  title: string

  @Column({ type: 'date' })
  date: string

  /** HH:mm */
  @Column({ name: 'start_time', type: 'varchar', length: 5, default: '' })
  start: string

  @Column({ name: 'end_time', type: 'varchar', length: 5, default: '' })
  endT: string

  /** none / daily / weekly（repeat 是 MySQL 保留字，列名加后缀） */
  @Column({ name: 'repeat_rule', type: 'varchar', length: 8, default: 'none' })
  repeat: string

  @Column({ type: 'date', nullable: true })
  until: string | null

  @Column({ type: 'date', nullable: true })
  end: string | null

  @Column({ type: 'varchar', length: 128, default: '' })
  place: string

  @Column({ type: 'text', nullable: true })
  note: string | null

  /** 复盘（AI 或手写） */
  @Column({ type: 'text', nullable: true })
  review: string | null

  @Column({ type: 'varchar', length: 32, default: '' })
  fav: string

  @Column({ type: 'tinyint', unsigned: true, default: 0 })
  rating: number

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  budget: string | null
}

/** 出行清单项（对应前端 OutListItem） */
@Entity('event_items')
export class EventItem extends OwnedEntity {
  @Index()
  @Column({ name: 'event_id', type: 'bigint', unsigned: true })
  eventId: string

  @ManyToOne(() => Ev, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: Ev

  @Column({ type: 'int', unsigned: true, default: 0 })
  sort: number

  @Column({ type: 'varchar', length: 128 })
  title: string

  @Column({ type: 'boolean', default: false })
  ok: boolean
}

/**
 * 某一天的状态（替代前端 ev.done / ev.skip 两个 map）。
 * 有行 = 该天有记录；state 区分完成 / 单独取消。
 */
@Entity('event_day_logs')
@Unique('uk_event_day', ['eventId', 'date'])
export class EventDayLog extends OwnedEntity {
  @Index()
  @Column({ name: 'event_id', type: 'bigint', unsigned: true })
  eventId: string

  @ManyToOne(() => Ev, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: Ev

  @Column({ type: 'date' })
  date: string

  /** done / skip */
  @Column({ type: 'varchar', length: 8 })
  state: string
}
