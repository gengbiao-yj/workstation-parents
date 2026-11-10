import { BadRequestException, Body, Controller, Delete, Get, Post, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { AuthUser, JwtAuthGuard } from '../auth/jwt-auth.guard'
import { ImportBody } from './state.types'
import { SyncService } from './sync.service'

/**
 * 整库同步。
 *
 * POST /api/import  把前端 AppState 一次性写成关系数据（localStorage 迁移、备份恢复都走这里）
 * GET  /api/export  反过来把关系数据组装回 AppState，前端直接 replaceAll()
 * DELETE /api/data  清空当前账号的业务数据
 */
@Controller()
@UseGuards(JwtAuthGuard)
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  @Post('import')
  async import(@CurrentUser() user: AuthUser, @Body() body: ImportBody) {
    const mode = body?.mode === 'merge' ? 'merge' : 'replace'
    const state = body?.state ?? (body as unknown as ImportBody['state'])
    if (!state) throw new BadRequestException('请求体缺少 state')
    return this.sync.importState(user.id, state, mode)
  }

  @Get('export')
  export(@CurrentUser() user: AuthUser) {
    return this.sync.exportState(user.id)
  }

  /** 与 /export 等价，语义更贴近前端：拿到整份 state */
  @Get('state')
  state(@CurrentUser() user: AuthUser) {
    return this.sync.exportState(user.id)
  }

  @Delete('state')
  clear(@CurrentUser() user: AuthUser) {
    return this.sync.importState(user.id, { settings: undefined }, 'replace')
  }
}
