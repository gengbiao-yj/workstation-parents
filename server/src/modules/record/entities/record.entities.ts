import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'
import { OwnedEntity } from '../../../common/entities/base.entity'
import { Kid } from '../../kid/entities/kid.entity'

/** 身高体重记录（对应前端 GrowthRecord） */
@Entity('growth_records')
export class GrowthRecord extends OwnedEntity {
  @Index()
  @Column({ name: 'kid_id', type: 'bigint', unsigned: true })
  kidId: string

  @ManyToOne(() => Kid, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'kid_id' })
  kid: Kid

  @Column({ type: 'date' })
  date: string

  /** 身高 cm */
  @Column({ type: 'decimal', precision: 5, scale: 1, nullable: true })
  h: string | null

  /** 体重 kg */
  @Column({ type: 'decimal', precision: 5, scale: 1, nullable: true })
  w: string | null

  /** 左 / 右眼视力 */
  @Column({ type: 'decimal', precision: 4, scale: 1, nullable: true })
  vl: string | null

  @Column({ type: 'decimal', precision: 4, scale: 1, nullable: true })
  vr: string | null
}

/** 成长日记（对应前端 JournalEntry） */
@Entity('journal_entries')
export class JournalEntry extends OwnedEntity {
  @Index()
  @Column({ name: 'kid_id', type: 'bigint', unsigned: true })
  kidId: string

  @ManyToOne(() => Kid, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'kid_id' })
  kid: Kid

  @Column({ type: 'date' })
  date: string

  @Column({ type: 'varchar', length: 16, default: '' })
  mood: string

  @Column({ type: 'text' })
  content: string

  @Column({ type: 'varchar', length: 4, default: '' })
  dim: string

  /** 是否“第一次”里程碑 */
  @Column({ name: 'is_first', type: 'boolean', default: false })
  first: boolean

  /** 前端毫秒时间戳 */
  @Column({ type: 'bigint', unsigned: true, default: 0 })
  t: string
}

/** 五育能力月度评级（对应前端 AbilityRecord，s 为 dim -> 分值） */
@Entity('ability_records')
export class AbilityRecord extends OwnedEntity {
  @Index()
  @Column({ name: 'kid_id', type: 'bigint', unsigned: true })
  kidId: string

  @ManyToOne(() => Kid, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'kid_id' })
  kid: Kid

  /** YYYY-MM */
  @Column({ type: 'char', length: 7 })
  month: string

  @Column({ type: 'json', nullable: true })
  scores: Record<string, number> | null

  @Column({ type: 'text', nullable: true })
  note: string | null
}
