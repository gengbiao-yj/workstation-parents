import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'
import { OwnedEntity } from '../../../common/entities/base.entity'
import { Kid } from '../../kid/entities/kid.entity'

/** 技能（对应前端 Skill） */
@Entity('skills')
export class Skill extends OwnedEntity {
  @Index()
  @Column({ name: 'kid_id', type: 'bigint', unsigned: true })
  kidId: string

  @ManyToOne(() => Kid, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'kid_id' })
  kid: Kid

  /** 前置技能 legacy id（前端 pre 字段），保留原值便于回溯 */
  @Column({ type: 'varchar', length: 64, nullable: true })
  pre: string | null

  @Column({ type: 'varchar', length: 64 })
  name: string

  @Column({ type: 'varchar', length: 4 })
  dim: string

  @Column({ type: 'varchar', length: 32, default: '' })
  icon: string

  @Column({ type: 'varchar', length: 255, default: '' })
  tip: string

  @Column({ type: 'date', nullable: true })
  start: string | null

  @Column({ type: 'text', nullable: true })
  note: string | null
}

/** 技能步骤（对应前端 SkillStep），完成日期为空表示未完成 */
@Entity('skill_steps')
export class SkillStep extends OwnedEntity {
  @Index()
  @Column({ name: 'skill_id', type: 'bigint', unsigned: true })
  skillId: string

  @ManyToOne(() => Skill, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'skill_id' })
  skill: Skill

  /** 步骤顺序，从 0 开始 */
  @Column({ type: 'int', unsigned: true, default: 0 })
  sort: number

  @Column({ type: 'varchar', length: 128 })
  title: string

  @Column({ name: 'done_date', type: 'date', nullable: true })
  done: string | null
}
