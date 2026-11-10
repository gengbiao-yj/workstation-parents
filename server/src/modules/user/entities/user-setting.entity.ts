import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm'
import { User } from './user.entity'

/** 对应前端 Settings 结构，一个账号一行 */
@Entity('user_settings')
export class UserSetting {
  @PrimaryColumn({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: string

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User

  @Column({ name: 'parent_name', type: 'varchar', length: 32, default: '' })
  parentName: string

  @Column({ name: 'parent_gender', type: 'char', length: 1, default: 'F' })
  parentGender: string

  @Column({ name: 'partner_name', type: 'varchar', length: 32, default: '' })
  partnerName: string

  @Column({ name: 'partner_gender', type: 'char', length: 1, default: 'M' })
  partnerGender: string

  @Column({ name: 'partner_show', type: 'boolean', default: true })
  partnerShow: boolean

  @Column({ type: 'boolean', default: true })
  anim: boolean

  @Column({ type: 'boolean', default: true })
  cat: boolean

  @Column({ name: 'ai_provider', type: 'varchar', length: 32, default: '' })
  aiProvider: string

  @Column({ name: 'ai_base', type: 'varchar', length: 255, default: '' })
  aiBase: string

  @Column({ name: 'ai_key', type: 'varchar', length: 255, default: '' })
  aiKey: string

  @Column({ name: 'ai_model', type: 'varchar', length: 64, default: '' })
  aiModel: string

  @Column({ name: 'ai_mask', type: 'boolean', default: true })
  aiMask: boolean

  // 用函数形式给原始默认值，否则 TypeORM 会把 0.7 归一化成整数 1
  @Column({ name: 'ai_temp', type: 'float', default: () => "'0.7'" })
  aiTemp: number

  @Column({ name: 'last_backup', type: 'bigint', default: 0 })
  lastBackup: string

  @Column({ type: 'boolean', default: false })
  onboarded: boolean

  @Column({ name: 'cur_kid', type: 'varchar', length: 64, default: '' })
  cur: string

  @Column({ name: 'mask_seq', type: 'int', default: 0 })
  maskSeq: number
}
