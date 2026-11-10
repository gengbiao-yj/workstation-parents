import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Kid } from './entities/kid.entity'
import { KidController } from './kid.controller'
import { KidService } from './kid.service'

@Module({
  imports: [TypeOrmModule.forFeature([Kid])],
  controllers: [KidController],
  providers: [KidService, JwtAuthGuard],
  exports: [KidService],
})
export class KidModule {}
