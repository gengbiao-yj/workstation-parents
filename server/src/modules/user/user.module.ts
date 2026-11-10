import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { User } from './entities/user.entity'
import { UserSetting } from './entities/user-setting.entity'
import { SettingsController } from './settings.controller'
import { SettingsService } from './settings.service'

@Module({
  imports: [TypeOrmModule.forFeature([User, UserSetting])],
  controllers: [SettingsController],
  providers: [SettingsService, JwtAuthGuard],
  exports: [SettingsService],
})
export class UserModule {}
