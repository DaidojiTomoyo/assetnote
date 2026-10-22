import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../common/database/database.module';
import { BootstrapSuperAdminService } from './application/bootstrap-super-admin.service';
import { INITIAL_SUPER_ADMIN_REPOSITORY } from './application/initial-super-admin.repository';
import { PASSWORD_HASHER } from './application/password-hasher';
import { USER_REPOSITORY } from './application/user.repository';
import { Argon2PasswordHasher } from './infrastructure/argon2-password-hasher';
import { PrismaInitialSuperAdminRepository } from './infrastructure/prisma-initial-super-admin.repository';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository';
import { AccountsService } from './application/accounts.service';
import {
  ACCOUNTS_REPOSITORY,
  AVATAR_PROCESSOR,
  INVITATION_TOKENS,
} from './application/accounts.repository';
import { PrismaAccountsRepository } from './infrastructure/prisma-accounts.repository';
import {
  NodeInvitationTokens,
  SharpAvatarProcessor,
} from './infrastructure/account-media';

@Module({
  imports: [DatabaseModule],
  providers: [
    BootstrapSuperAdminService,
    AccountsService,
    { provide: ACCOUNTS_REPOSITORY, useClass: PrismaAccountsRepository },
    { provide: INVITATION_TOKENS, useClass: NodeInvitationTokens },
    { provide: AVATAR_PROCESSOR, useClass: SharpAvatarProcessor },
    {
      provide: INITIAL_SUPER_ADMIN_REPOSITORY,
      useClass: PrismaInitialSuperAdminRepository,
    },
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
  ],
  exports: [
    BootstrapSuperAdminService,
    USER_REPOSITORY,
    PASSWORD_HASHER,
    AccountsService,
  ],
})
export class UsersModule {}
