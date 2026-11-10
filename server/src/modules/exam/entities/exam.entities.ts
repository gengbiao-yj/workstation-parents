import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'
import { OwnedEntity } from '../../../common/entities/base.entity'
import { Kid } from '../../kid/entities/kid.entity'

/** 考试成绩单（对应前端 Exam） */
@Entity('exams')
export class Exam extends OwnedEntity {
  @Index()
  @Column({ name: 'kid_id', type: 'bigint', unsigned: true })
  kidId: string

  @ManyToOne(() => Kid, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'kid_id' })
  kid: Kid

  @Column({ type: 'date' })
  date: string

  @Column({ type: 'varchar', length: 64 })
  name: string

  @Column({ type: 'text', nullable: true })
  note: string | null
}

/** 单科成绩（对应前端 ExamItem） */
@Entity('exam_items')
export class ExamItem extends OwnedEntity {
  @Index()
  @Column({ name: 'exam_id', type: 'bigint', unsigned: true })
  examId: string

  @ManyToOne(() => Exam, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exam_id' })
  exam: Exam

  @Column({ type: 'varchar', length: 32 })
  subject: string

  @Column({ type: 'decimal', precision: 5, scale: 1, nullable: true })
  score: string | null

  @Column({ type: 'decimal', precision: 5, scale: 1, nullable: true })
  full: string | null
}
