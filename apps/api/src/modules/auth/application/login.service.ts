import { Inject, Injectable } from '@nestjs/common';

import { PASSWORD_HASHER, USER_REPOSITORY, normalizeEmail } from '../../users';
import type { PasswordHasher, User, UserRepository } from '../../users';
import {
  AUTH_SESSION_REPOSITORY,
  type AuthSessionRepository,
} from './auth-session.repository';
import { InvalidCredentialsError } from './invalid-credentials.error';
import {
  SESSION_TOKEN_SERVICE,
  type SessionTokenService,
} from './session-token.service';

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

export interface LoginInput {
  readonly email: string;
  readonly password: string;
}

export interface LoginResult {
  readonly user: User;
  readonly rawSessionToken: string;
  readonly expiresAt: Date;
}

@Injectable()
export class LoginService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
    @Inject(AUTH_SESSION_REPOSITORY)
    private readonly authSessionRepository: AuthSessionRepository,
    @Inject(SESSION_TOKEN_SERVICE)
    private readonly sessionTokenService: SessionTokenService,
  ) {}

  async execute(input: LoginInput): Promise<LoginResult> {
    const normalizedEmail = normalizeEmail(input.email);
    const user =
      await this.userRepository.findForAuthenticationByEmail(normalizedEmail);

    let passwordMatches = false;

    if (user) {
      passwordMatches = await this.passwordHasher.verify(
        input.password,
        user.passwordHash,
      );
    } else {
      await this.passwordHasher.hash(input.password);
    }

    if (!user || !passwordMatches || user.status !== 'ACTIVE') {
      throw new InvalidCredentialsError();
    }

    const authenticatedAt = new Date();
    const expiresAt = new Date(authenticatedAt.getTime() + SESSION_DURATION_MS);
    const sessionToken = this.sessionTokenService.generate();

    const sessionCreated =
      await this.authSessionRepository.createForSuccessfulLogin({
        userId: user.id,
        credentialHash: user.passwordHash,
        tokenHash: sessionToken.tokenHash,
        expiresAt,
        authenticatedAt,
      });

    if (!sessionCreated) {
      throw new InvalidCredentialsError();
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
      },
      rawSessionToken: sessionToken.rawToken,
      expiresAt,
    };
  }
}
