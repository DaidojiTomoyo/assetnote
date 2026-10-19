import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import {
  authSessionSchema,
  type AuthSession,
  type AuthRole,
  type LoginRequest,
} from '@workspace/contracts/auth';

import applicationConfig from '../../../common/config/application.config';
import type { UserRole } from '../../users';
import { InvalidCredentialsError } from '../application/invalid-credentials.error';
import { type LoginResult, LoginService } from '../application/login.service';
import { LogoutService } from '../application/logout.service';
import type { AuthenticatedRequest } from './authenticated-request';
import { LoginRequestPipe } from './login-request.pipe';
import { SessionAuthenticationGuard } from './session-authentication.guard';
import {
  createSessionCookieOptions,
  readSessionCookie,
} from './session-cookie';
import { WebOriginGuard } from './web-origin.guard';

interface AuthSessionResponseInput {
  readonly user: {
    readonly id: string;
    readonly email: string;
    readonly role: UserRole;
  };
  readonly expiresAt: Date;
}

function mapAuthSessionResponseRole(role: UserRole): AuthRole {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'SUPER_ADMIN';
    case 'ADMIN':
      return 'ADMIN';
    case 'USER':
      return 'USER';
  }
}

function mapAuthSessionResponse(result: AuthSessionResponseInput): AuthSession {
  return authSessionSchema.parse({
    user: {
      id: result.user.id,
      email: result.user.email,
      role: mapAuthSessionResponseRole(result.user.role),
    },
    expiresAt: result.expiresAt.toISOString(),
  });
}

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly loginService: LoginService,
    private readonly logoutService: LogoutService,
    @Inject(applicationConfig.KEY)
    private readonly config: ConfigType<typeof applicationConfig>,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(WebOriginGuard, ThrottlerGuard)
  async login(
    @Body(new LoginRequestPipe()) input: LoginRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthSession> {
    let result: LoginResult;

    try {
      result = await this.loginService.execute({
        email: input.email,
        password: input.password,
      });
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        this.logger.warn('凭证无效，登录被拒绝。');
        throw new UnauthorizedException({ message: error.message });
      }

      throw error;
    }

    response.cookie(this.config.sessionCookie.name, result.rawSessionToken, {
      ...createSessionCookieOptions(this.config.sessionCookie),
      expires: result.expiresAt,
    });

    this.logger.log('用户登录成功。');

    return mapAuthSessionResponse(result);
  }

  @Get('me')
  @UseGuards(SessionAuthenticationGuard)
  getCurrentUser(@Req() request: AuthenticatedRequest): AuthSession {
    return mapAuthSessionResponse(request.authSession);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(WebOriginGuard)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const rawSessionToken = readSessionCookie(
      request,
      this.config.sessionCookie.name,
    );

    try {
      const revoked = await this.logoutService.execute(rawSessionToken);

      if (revoked) {
        this.logger.log('退出登录时已撤销会话。');
      }
    } finally {
      response.clearCookie(
        this.config.sessionCookie.name,
        createSessionCookieOptions(this.config.sessionCookie),
      );
    }
  }
}
