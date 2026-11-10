import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'
import { OwnedEntity } from '../../../common/entities/base.entity'
import { Kid } from '../../kid/entities/kid.entity'

/** 阅读书目（对应前端 Book） */
@Entity('books')
export class Book extends OwnedEntity {
  @Index()
  @Column({ name: 'kid_id', type: 'bigint', unsigned: true })
  kidId: string

  @ManyToOne(() => Kid, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'kid_id' })
  kid: Kid

  @Column({ type: 'varchar', length: 128 })
  title: string

  @Column({ type: 'varchar', length: 64, default: '' })
  author: string

  /** want / reading / done */
  @Column({ type: 'varchar', length: 16, default: 'want' })
  status: string

  @Column({ type: 'date', nullable: true })
  date: string | null

  @Column({ type: 'tinyint', unsigned: true, default: 0 })
  rating: number

  @Column({ type: 'text', nullable: true })
  note: string | null

  @Column({ type: 'varchar', length: 16, default: '' })
  color: string
}
