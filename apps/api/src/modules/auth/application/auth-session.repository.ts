import type { User } from '../../users';

export const AUTH_SESSION_REPOSITORY = Symbol('AUTH_SESSION_REPOSITORY');

export interface CreateSessionForSuccessfulLoginInput {
  readonly userId: string;
  readonly credentialHash: string;
  readonly tokenHash: string;
  readonly expiresAt: Date;
  readonly authenticatedAt: Date;
}

export interface ActiveAuthSession {
  readonly id: string;
  readonly expiresAt: Date;
  readonly user: User;
}

export interface AuthSessionRepository {
  createForSuccessfulLogin(
    input: CreateSessionForSuccessfulLoginInput,
  ): Promise<boolean>;

  findActiveByTokenHash(
    tokenHash: string,
    now: Date,
  ): Promise<ActiveAuthSession | null>;

  revokeByTokenHash(tokenHash: string, revokedAt: Date): Promise<boolean>;
}
