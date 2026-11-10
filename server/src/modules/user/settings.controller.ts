import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { AuthUser, JwtAuthGuard } from '../auth/jwt-auth.guard'
import { UpdateSettingsDto } from './dto/settings.dto'
import { SettingsService } from './settings.service'

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.settings.get(user.id)
  }

  @Patch()
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateSettingsDto) {
    return this.settings.update(user.id, dto)
  }
}
