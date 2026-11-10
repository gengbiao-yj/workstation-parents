import { Column, Entity } from 'typeorm'
import { OwnedEntity } from '../../../common/entities/base.entity'

/** 待办（对应前端 Todo），不挂孩子，直接归属账号 */
@Entity('todos')
export class Todo extends OwnedEntity {
  @Column({ type: 'varchar', length: 255 })
  text: string

  @Column({ type: 'boolean', default: false })
  done: boolean

  @Column({ type: 'int', unsigned: true, default: 0 })
  sort: number
}
