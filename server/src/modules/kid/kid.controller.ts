import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { AuthUser, JwtAuthGuard } from '../auth/jwt-auth.guard'
import { CreateKidDto, UpdateKidDto } from './dto/kid.dto'
import { KidService } from './kid.service'

@Controller('kids')
@UseGuards(JwtAuthGuard)
export class KidController {
  constructor(private readonly kids: KidService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.kids.list(user.id)
  }

  @Get(':id')
  detail(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.kids.findOne(user.id, id)
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateKidDto) {
    return this.kids.create(user.id, dto)
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateKidDto,
  ) {
    return this.kids.update(user.id, id, dto)
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.kids.remove(user.id, id)
  }
}
