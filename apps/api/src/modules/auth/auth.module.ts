import {
  type MiddlewareConsumer,
  Module,
  type NestModule,
} from '@nestjs/common';
import { seconds, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { DatabaseModule } from '../../common/database/database.module';
import { UsersModule } from '../users';
import { AUTH_SESSION_REPOSITORY } from './application/auth-session.repository';
import { LoginService } from './application/login.service';
import { LogoutService } from './application/logout.service';
import { ResolveAuthSessionService } from './application/resolve-auth-session.service';
import { SESSION_TOKEN_SERVICE } from './application/session-token.service';
import { NodeSessionTokenService } from './infrastructure/node-session-token.service';
import { PrismaAuthSessionRepository } from './infrastructure/prisma-auth-session.repository';
import { AuthController } from './presentation/auth.controller';
import { preventAuthResponseCaching } from './presentation/prevent-auth-response-caching.middleware';
import { SessionAuthenticationGuard } from './presentation/session-authentication.guard';
import { WebOriginGuard } from './presentation/web-origin.guard';

@Module({
  imports: [
    DatabaseModule,
    UsersModule,
    ThrottlerModule.forRoot({
      errorMessage: '请求过于频繁，请稍后再试。',
      throttlers: [
        {
          limit: 5,
          ttl: seconds(60),
        },
      ],
    }),
  ],
  controllers: [AuthController],
  providers: [
    LoginService,
    LogoutService,
    ResolveAuthSessionService,
    SessionAuthenticationGuard,
    ThrottlerGuard,
    WebOriginGuard,
    { provide: AUTH_SESSION_REPOSITORY, useClass: PrismaAuthSessionRepository },
    { provide: SESSION_TOKEN_SERVICE, useClass: NodeSessionTokenService },
  ],
  exports: [
    ResolveAuthSessionService,
    SessionAuthenticationGuard,
    WebOriginGuard,
    ThrottlerGuard,
    ThrottlerModule,
  ],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(preventAuthResponseCaching).forRoutes(AuthController);
  }
}
