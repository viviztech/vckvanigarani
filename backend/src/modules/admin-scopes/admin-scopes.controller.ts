import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { Auth } from '../../common/guards/auth.decorator';
import { SuperAdminOnly } from '../../common/guards/super-admin-only.decorator';
import { CurrentBearerId } from '../../common/decorators/current-bearer-id.decorator';
import { AdminScopesService } from './admin-scopes.service';
import { CreateAdminScopeDto } from './dto/create-admin-scope.dto';

@Controller('admin-scopes')
export class AdminScopesController {
  constructor(private readonly adminScopes: AdminScopesService) {}

  @Get()
  @SuperAdminOnly()
  list() {
    return this.adminScopes.list();
  }

  /** Any authenticated bearer can ask "what's my own role" — admin-web uses this to gate its own UI. */
  @Get('me')
  @Auth()
  me(@CurrentBearerId() bearerId: string) {
    return this.adminScopes.me(bearerId);
  }

  @Post()
  @SuperAdminOnly()
  grant(@Body() dto: CreateAdminScopeDto, @CurrentBearerId() bearerId: string) {
    return this.adminScopes.grant(dto, bearerId);
  }

  @Delete(':bearerId')
  @SuperAdminOnly()
  @HttpCode(HttpStatus.NO_CONTENT)
  revoke(@Param('bearerId') bearerId: string, @CurrentBearerId() actorBearerId: string) {
    return this.adminScopes.revoke(bearerId, actorBearerId);
  }
}
