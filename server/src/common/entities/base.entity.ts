import {
  Column,
  CreateDateColumn,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm'
import { User } from '../../modules/user/entities/user.entity'

/**
 * 业务表公共字段。
 *
 * 主键为 BIGINT UNSIGNED 自增，由数据库生成。
 * mysql2 在 TypeORM 里默认开启 bigNumberStrings，BIGINT 读出来就是字符串，
 * 因此接口层直接输出字符串 id，前端 `id: string` 的契约不用改。
 *
 * legacy_id 用于承接 localStorage 里的存量 id（k1、h3 这类），
 * 导入时写进这一列做映射，新数据留空。
 *
 * user_id 上有指向 users 的外键（ON DELETE CASCADE）：删账号时业务数据自动清空，
 * 不会留下没有归属的孤儿行。之前只有子表之间的外键，顶层归属列漏了。
 */
export abstract class OwnedEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string

  @Index()
  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: string

  /** 只用于建外键，查询一律用 userId，避免多一次 join */
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User

  @Index()
  @Column({ name: 'legacy_id', type: 'varchar', length: 64, nullable: true })
  legacyId: string | null

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date
}
