import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm'
import { OwnedEntity } from '../../../common/entities/base.entity'
import { Kid } from '../../kid/entities/kid.entity'

/** 关系网联系人（对应前端 Person） */
@Entity('people')
export class Person extends OwnedEntity {
  @Index()
  @Column({ name: 'kid_id', type: 'bigint', unsigned: true, nullable: true })
  kidId: string | null

  @ManyToOne(() => Kid, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'kid_id' })
  kid: Kid | null

  @Column({ type: 'varchar', length: 32 })
  name: string

  /** family / friend / classmate / teacher / coach / neighbor */
  @Column({ type: 'varchar', length: 16 })
  rel: string

  @Column({ type: 'varchar', length: 32, default: '' })
  label: string

  /** 亲近程度 1-3 */
  @Column({ type: 'tinyint', unsigned: true, default: 1 })
  close: number

  @Column({ type: 'char', length: 1, default: 'F' })
  gender: string

  @Column({ type: 'date', nullable: true })
  birthday: string | null

  @Column({ type: 'varchar', length: 255, default: '' })
  likes: string

  @Column({ type: 'varchar', length: 128, default: '' })
  contact: string

  @Column({ type: 'text', nullable: true })
  note: string | null

  @Column({ type: 'date', nullable: true })
  met: string | null

  /** 兄弟姐妹，存对方 legacy id */
  @Column({ name: 'sibling_ref', type: 'varchar', length: 64, nullable: true })
  sibling: string | null

  @Column({ type: 'boolean', default: false })
  adult: boolean

  @Column({ type: 'int', nullable: true })
  mk: number | null
}

/** 生日祝福记录（替代前端 greeted: Record<year, boolean>） */
@Entity('person_greetings')
@Unique('uk_person_year', ['personId', 'year'])
export class PersonGreeting extends OwnedEntity {
  @Index()
  @Column({ name: 'person_id', type: 'bigint', unsigned: true })
  personId: string

  @ManyToOne(() => Person, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'person_id' })
  person: Person

  @Column({ type: 'smallint', unsigned: true })
  year: number
}
