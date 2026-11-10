import { Controller, Get } from '@nestjs/common'
import { DataSource } from 'typeorm'

@Controller('health')
export class HealthController {
  constructor(private readonly ds: DataSource) {}

  @Get()
  async check() {
    let db: 'up' | 'down' = 'up'
    let message = 'ok'
    try {
      await this.ds.query('select 1')
    } catch (e) {
      db = 'down'
      message = (e as Error).message
    }
    return { ok: db === 'up', db, message, time: new Date().toISOString() }
  }
}
