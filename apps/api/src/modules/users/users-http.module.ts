import {
  Module,
  type MiddlewareConsumer,
  type NestModule,
} from '@nestjs/common';
import { AuthModule, preventAuthResponseCaching } from '../auth';
import { UsersModule } from './users.module';
import {
  AcceptInvitationController,
  AccountController,
  InvitationsController,
  UsersController,
} from './presentation/accounts.controller';

const controllers = [
  AccountController,
  UsersController,
  AcceptInvitationController,
  InvitationsController,
];
// Auth consumes the users provider module; HTTP composition depends on both without a module cycle.
@Module({ imports: [UsersModule, AuthModule], controllers })
export class UsersHttpModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(preventAuthResponseCaching).forRoutes(...controllers);
  }
}
