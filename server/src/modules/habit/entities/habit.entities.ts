import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm'
import { OwnedEntity } from '../../../common/entities/base.entity'
import { Kid } from '../../kid/entities/kid.entity'

/** 习惯定义（对应前端 Habit） */
@Entity('habits')
export class Habit extends OwnedEntity {
  @Index()
  @Column({ name: 'kid_id', type: 'bigint', unsigned: true })
  kidId: string

  @ManyToOne(() => Kid, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'kid_id' })
  kid: Kid

  /** 五育维度：de/zhi/ti/mei/lao */
  @Column({ type: 'varchar', length: 4 })
  dim: string

  @Column({ type: 'varchar', length: 32 })
  name: string

  /** 空字符串 = 做到就算 */
  @Column({ type: 'varchar', length: 16, default: '' })
  unit: string

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 1 })
  target: string

  /** 每周哪几天，1-7（周一为 1） */
  @Column({ type: 'json', nullable: true })
  days: number[] | null

  /** 是否启用（避免用 MySQL 保留字 on 做列名） */
  @Column({ name: 'is_on', type: 'boolean', default: true })
  on: boolean

  /** 特殊类型，例如 read 用于统计阅读分钟数 */
  @Column({ type: 'varchar', length: 32, default: '' })
  kind: string

  @Column({ type: 'date', nullable: true })
  since: string | null
}

/**
 * 打卡流水。
 * 前端原本是 checks[kidId][date][habitId] = true | number 的嵌套 map，
 * 拆成行之后按 (habit_id, date) 唯一，value 为空表示“做到就算”。
 */
@Entity('habit_checks')
@Unique('uk_habit_check', ['habitId', 'date'])
export class HabitCheck extends OwnedEntity {
  @Index()
  @Column({ name: 'kid_id', type: 'bigint', unsigned: true })
  kidId: string

  @Column({ name: 'habit_id', type: 'bigint', unsigned: true })
  habitId: string

  @ManyToOne(() => Habit, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'habit_id' })
  habit: Habit

  @Column({ type: 'date' })
  date: string

  /** 数量（分钟/页/次），NULL = 仅打卡 */
  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  value: string | null
}
