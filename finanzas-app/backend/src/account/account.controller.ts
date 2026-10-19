import { Body, Controller, HttpCode, HttpStatus, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccountService } from './account.service';
import { DeleteAccountDto } from './dto/delete-account.dto';

@ApiTags('Cuenta')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Post('delete')
  @HttpCode(HttpStatus.OK)
  @Throttle({ medium: { ttl: 60000, limit: 3 } })
  @ApiOperation({ summary: 'Eliminar mi cuenta (requiere contraseña)' })
  deleteAccount(@Request() req, @Body() dto: DeleteAccountDto) {
    return this.accountService.deleteAccount(req.user.id, dto.password);
  }
}
