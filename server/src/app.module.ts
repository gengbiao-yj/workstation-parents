import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { join } from 'node:path'
import { AuthModule } from './modules/auth/auth.module'
import { BookModule } from './modules/book/book.module'
import { ChatModule } from './modules/chat/chat.module'
import { EventModule } from './modules/event/event.module'
import { ExamModule } from './modules/exam/exam.module'
import { HabitModule } from './modules/habit/habit.module'
import { HealthModule } from './modules/health/health.module'
import { KidModule } from './modules/kid/kid.module'
import { PersonModule } from './modules/person/person.module'
import { RecordModule } from './modules/record/record.module'
import { SkillModule } from './modules/skill/skill.module'
import { SyncModule } from './modules/sync/sync.module'
import { TodoModule } from './modules/todo/todo.module'
import { UserModule } from './modules/user/user.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'mysql' as const,
        host: cfg.get<string>('DB_HOST', '127.0.0.1'),
        port: Number(cfg.get<string>('DB_PORT', '3306')),
        username: cfg.get<string>('DB_USER'),
        password: cfg.get<string>('DB_PASS'),
        database: cfg.get<string>('DB_NAME'),
        entities: [
          join(__dirname, '**', '*.entity{.ts,.js}'),
          join(__dirname, '**', '*.entities{.ts,.js}'),
        ],
        // 表结构一律走 migration，不靠 synchronize 自动改库
        synchronize: false,
        charset: 'utf8mb4',
        timezone: '+08:00',
        logging: cfg.get('NODE_ENV') === 'development' ? ['error', 'warn'] : ['error'],
      }),
    }),
    UserModule,
    AuthModule,
    KidModule,
    HabitModule,
    SkillModule,
    EventModule,
    PersonModule,
    RecordModule,
    BookModule,
    ExamModule,
    TodoModule,
    ChatModule,
    SyncModule,
    HealthModule,
  ],
})
export class AppModule {}
