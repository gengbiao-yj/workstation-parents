import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string

  @Column({ type: 'varchar', length: 64, unique: true })
  username: string

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string

  @Column({ type: 'varchar', length: 32, default: '' })
  nickname: string

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date
}
