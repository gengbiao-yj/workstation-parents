import { Module } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { SyncController } from './sync.controller'
import { SyncService } from './sync.service'

@Module({
  controllers: [SyncController],
  providers: [SyncService, JwtAuthGuard],
  exports: [SyncService],
})
export class SyncModule {}
