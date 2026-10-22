import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import {
  acceptInvitationSchema,
  accountDetailSchema,
  accountListSchema,
  accountProfileSchema,
  accountQuerySchema,
  changeAccessSchema,
  changePasswordSchema,
  createInvitationSchema,
  createdInvitationSchema,
  invitationListSchema,
  invitationPreviewSchema,
  invitationQuerySchema,
  resolveInvitationSchema,
  updateProfileSchema,
  type AcceptInvitation,
  type AccountQuery,
  type ChangeAccess,
  type ChangePassword,
  type CreateInvitation,
  type InvitationQuery,
  type UpdateProfile,
} from '@workspace/contracts/accounts';
import applicationConfig from '../../../common/config/application.config';
import {
  createSessionCookieOptions,
  SessionAuthenticationGuard,
  WebOriginGuard,
  type AuthenticatedRequest,
} from '../../auth';
import { AccountsService } from '../application/accounts.service';
import {
  AccountErrorFilter,
  ContractPipe,
  mapAccount,
  mapInvitation,
} from './accounts-http';

@Controller('account')
@UseFilters(AccountErrorFilter)
@UseGuards(SessionAuthenticationGuard)
export class AccountController {
  constructor(
    private readonly accounts: AccountsService,
    @Inject(applicationConfig.KEY)
    private readonly config: ConfigType<typeof applicationConfig>,
  ) {}
  @Get('profile')
  async profile(@Req() request: AuthenticatedRequest) {
    const profile = await this.accounts.profile(request.authSession.user.id);
    return accountProfileSchema.parse({
      ...profile,
      user: mapAccount(profile.user),
    });
  }
  @Patch('profile')
  @UseGuards(WebOriginGuard)
  async updateProfile(
    @Req() request: AuthenticatedRequest,
    @Body(new ContractPipe(updateProfileSchema)) input: UpdateProfile,
  ) {
    return mapAccount(
      await this.accounts.updateProfile(request.authSession.user.id, input),
    );
  }
  @Post('password')
  @HttpCode(204)
  @UseGuards(WebOriginGuard, ThrottlerGuard)
  async changePassword(
    @Req() request: AuthenticatedRequest,
    @Body(new ContractPipe(changePasswordSchema)) input: ChangePassword,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.accounts.changePassword(request.authSession.user.id, input);
    response.clearCookie(
      this.config.sessionCookie.name,
      createSessionCookieOptions(this.config.sessionCookie),
    );
  }
}

@Controller('users')
@UseFilters(AccountErrorFilter)
@UseGuards(SessionAuthenticationGuard)
export class UsersController {
  constructor(private readonly accounts: AccountsService) {}
  @Get()
  async list(
    @Req() request: AuthenticatedRequest,
    @Query(new ContractPipe(accountQuerySchema)) query: AccountQuery,
  ) {
    const result = await this.accounts.list(request.authSession.user.id, query);
    return accountListSchema.parse({
      ...result,
      users: result.users.map(mapAccount),
      page: query.page,
      pageSize: 20,
    });
  }
  @Get(':id')
  async detail(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const result = await this.accounts.detail(request.authSession.user.id, id);
    return accountDetailSchema.parse({
      ...result,
      user: mapAccount(result.user),
    });
  }
  @Patch(':id/access')
  @UseGuards(WebOriginGuard)
  async changeAccess(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ContractPipe(changeAccessSchema)) input: ChangeAccess,
  ) {
    const result = await this.accounts.changeAccess(
      request.authSession.user.id,
      id,
      input,
    );
    return accountDetailSchema.parse({
      ...result,
      user: mapAccount(result.user),
    });
  }
}

@Controller('invitations')
@UseFilters(AccountErrorFilter)
@UseGuards(SessionAuthenticationGuard)
export class InvitationsController {
  constructor(
    private readonly accounts: AccountsService,
    @Inject(applicationConfig.KEY)
    private readonly config: ConfigType<typeof applicationConfig>,
  ) {}
  private created(
    result: Awaited<ReturnType<AccountsService['createInvitation']>>,
  ) {
    return createdInvitationSchema.parse({
      invitation: mapInvitation(result.invitation, result.actor),
      link: `${this.config.webOrigin}/invite#${result.token}`,
    });
  }
  @Get()
  async list(
    @Req() request: AuthenticatedRequest,
    @Query(new ContractPipe(invitationQuerySchema)) query: InvitationQuery,
  ) {
    const result = await this.accounts.invitations(
      request.authSession.user.id,
      query,
    );
    return invitationListSchema.parse({
      invitations: result.invitations.map((item) =>
        mapInvitation(item, result.actor),
      ),
      total: result.total,
      page: query.page,
      pageSize: 20,
    });
  }
  @Post()
  @UseGuards(WebOriginGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async create(
    @Req() request: AuthenticatedRequest,
    @Body(new ContractPipe(createInvitationSchema)) input: CreateInvitation,
  ) {
    return this.created(
      await this.accounts.createInvitation(request.authSession.user.id, input),
    );
  }
  @Post(':id/reinvite')
  @UseGuards(WebOriginGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async reinvite(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.created(
      await this.accounts.reinvite(request.authSession.user.id, id),
    );
  }
  @Post(':id/revoke')
  @HttpCode(204)
  @UseGuards(WebOriginGuard)
  revoke(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.accounts.revokeInvitation(request.authSession.user.id, id);
  }
}

@Controller('invitations')
@UseFilters(AccountErrorFilter)
@UseGuards(WebOriginGuard, ThrottlerGuard)
export class AcceptInvitationController {
  constructor(private readonly accounts: AccountsService) {}
  @Post('resolve')
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async resolve(
    @Body(new ContractPipe(resolveInvitationSchema)) input: { token: string },
  ) {
    const invitation = await this.accounts.resolveInvitation(input.token);
    return invitationPreviewSchema.parse({
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt.toISOString(),
    });
  }
  @Post('accept')
  @HttpCode(204)
  accept(
    @Body(new ContractPipe(acceptInvitationSchema)) input: AcceptInvitation,
  ) {
    return this.accounts.acceptInvitation(input);
  }
}
