import 'reflect-metadata'
import { config as loadEnv } from 'dotenv'
import { join } from 'node:path'
import { DataSource } from 'typeorm'

loadEnv()

/** 供 TypeORM CLI 生成 / 执行 migration 使用 */
export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  entities: [
    join(__dirname, '..', '**', '*.entity{.ts,.js}'),
    join(__dirname, '..', '**', '*.entities{.ts,.js}'),
  ],
  migrations: [join(__dirname, 'migrations', '*{.ts,.js}')],
  charset: 'utf8mb4',
  timezone: '+08:00',
  synchronize: false,
})
