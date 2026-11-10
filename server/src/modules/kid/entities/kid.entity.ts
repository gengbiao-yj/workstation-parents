import { Column, Entity } from 'typeorm'
import { OwnedEntity } from '../../../common/entities/base.entity'

@Entity('kids')
export class Kid extends OwnedEntity {
  @Column({ type: 'varchar', length: 32 })
  name: string

  @Column({ type: 'char', length: 1, default: 'M' })
  gender: string

  @Column({ type: 'date', nullable: true })
  birthday: string | null

  @Column({ type: 'varchar', length: 8, default: 'k' })
  stage: string

  @Column({ type: 'tinyint', unsigned: true, default: 0 })
  color: number

  @Column({ type: 'varchar', length: 64, default: '' })
  school: string

  @Column({ type: 'varchar', length: 32, default: '' })
  grade: string

  @Column({ type: 'varchar', length: 32, default: '' })
  cls: string

  @Column({ type: 'varchar', length: 32, default: '' })
  teacher: string

  @Column({ type: 'varchar', length: 255, default: '' })
  interests: string

  @Column({ type: 'varchar', length: 255, default: '' })
  personality: string

  @Column({ type: 'varchar', length: 255, default: '' })
  health: string

  @Column({ type: 'text', nullable: true })
  note: string | null

  @Column({ type: 'json', nullable: true })
  tags: string[] | null

  @Column({ type: 'int', nullable: true })
  mk: number | null
}
