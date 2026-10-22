import type { PasswordHasher, UserRepository } from '../../users';
import type { AuthSessionRepository } from './auth-session.repository';
import { InvalidCredentialsError } from './invalid-credentials.error';
import { LoginService } from './login.service';
import type { SessionTokenService } from './session-token.service';

const AUTHENTICATED_AT = new Date('2026-08-24T08:00:00.000Z');
const EXPIRES_AT = new Date('2026-08-25T08:00:00.000Z');
const RAW_SESSION_TOKEN = 'raw-session-token';
const TOKEN_HASH = 'a'.repeat(64);

const ACTIVE_USER = {
  id: '8a5c15a2-a356-4c7a-9107-d79f73330742',
  email: 'user@example.com',
  passwordHash: 'encoded-password-hash',
  role: 'USER',
  status: 'ACTIVE',
} as const;

describe('LoginService', () => {
  let findUser: jest.Mock<
    ReturnType<UserRepository['findForAuthenticationByEmail']>,
    Parameters<UserRepository['findForAuthenticationByEmail']>
  >;
  let hashPassword: jest.Mock<
    ReturnType<PasswordHasher['hash']>,
    Parameters<PasswordHasher['hash']>
  >;
  let verifyPassword: jest.Mock<
    ReturnType<PasswordHasher['verify']>,
    Parameters<PasswordHasher['verify']>
  >;
  let createSession: jest.Mock<
    ReturnType<AuthSessionRepository['createForSuccessfulLogin']>,
    Parameters<AuthSessionRepository['createForSuccessfulLogin']>
  >;
  let generateSessionToken: jest.Mock<
    ReturnType<SessionTokenService['generate']>,
    Parameters<SessionTokenService['generate']>
  >;
  let userRepository: UserRepository;
  let passwordHasher: PasswordHasher;
  let authSessionRepository: AuthSessionRepository;
  let sessionTokenService: SessionTokenService;
  let loginService: LoginService;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(AUTHENTICATED_AT);

    findUser = jest.fn<
      ReturnType<UserRepository['findForAuthenticationByEmail']>,
      Parameters<UserRepository['findForAuthenticationByEmail']>
    >();
    hashPassword = jest.fn<
      ReturnType<PasswordHasher['hash']>,
      Parameters<PasswordHasher['hash']>
    >();
    verifyPassword = jest.fn<
      ReturnType<PasswordHasher['verify']>,
      Parameters<PasswordHasher['verify']>
    >();
    createSession = jest.fn<
      ReturnType<AuthSessionRepository['createForSuccessfulLogin']>,
      Parameters<AuthSessionRepository['createForSuccessfulLogin']>
    >();
    generateSessionToken = jest.fn<
      ReturnType<SessionTokenService['generate']>,
      Parameters<SessionTokenService['generate']>
    >();

    userRepository = {
      findForAuthenticationByEmail: findUser,
    };

    passwordHasher = {
      hash: hashPassword,
      verify: verifyPassword,
    };

    authSessionRepository = {
      createForSuccessfulLogin: createSession,
      findActiveByTokenHash: jest.fn<
        ReturnType<AuthSessionRepository['findActiveByTokenHash']>,
        Parameters<AuthSessionRepository['findActiveByTokenHash']>
      >(),
      revokeByTokenHash: jest.fn<
        ReturnType<AuthSessionRepository['revokeByTokenHash']>,
        Parameters<AuthSessionRepository['revokeByTokenHash']>
      >(),
    };

    sessionTokenService = {
      generate: generateSessionToken,
      hash: jest.fn<
        ReturnType<SessionTokenService['hash']>,
        Parameters<SessionTokenService['hash']>
      >(),
    };

    generateSessionToken.mockReturnValue({
      rawToken: RAW_SESSION_TOKEN,
      tokenHash: TOKEN_HASH,
    });
    hashPassword.mockResolvedValue('discarded-password-hash');
    createSession.mockResolvedValue(true);

    loginService = new LoginService(
      userRepository,
      passwordHasher,
      authSessionRepository,
      sessionTokenService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates a fixed 24-hour session for valid credentials', async () => {
    findUser.mockResolvedValue(ACTIVE_USER);
    verifyPassword.mockResolvedValue(true);

    const result = await loginService.execute({
      email: '  User@Example.COM  ',
      password: '  exact password  ',
    });

    expect(findUser).toHaveBeenCalledWith('user@example.com');
    expect(verifyPassword).toHaveBeenCalledWith(
      '  exact password  ',
      ACTIVE_USER.passwordHash,
    );
    expect(hashPassword).not.toHaveBeenCalled();

    expect(createSession).toHaveBeenCalledWith({
      userId: ACTIVE_USER.id,
      credentialHash: ACTIVE_USER.passwordHash,
      tokenHash: TOKEN_HASH,
      authenticatedAt: AUTHENTICATED_AT,
      expiresAt: EXPIRES_AT,
    });

    expect(result).toEqual({
      user: {
        id: ACTIVE_USER.id,
        email: ACTIVE_USER.email,
        role: ACTIVE_USER.role,
        status: ACTIVE_USER.status,
      },
      rawSessionToken: RAW_SESSION_TOKEN,
      expiresAt: EXPIRES_AT,
    });
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('uses dummy hashing and rejects an unknown email', async () => {
    findUser.mockResolvedValue(null);

    await expect(
      loginService.execute({
        email: 'missing@example.com',
        password: 'submitted password',
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);

    expect(hashPassword).toHaveBeenCalledWith('submitted password');
    expect(verifyPassword).not.toHaveBeenCalled();
    expect(generateSessionToken).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
  });

  it('rejects an incorrect password without creating a session', async () => {
    findUser.mockResolvedValue(ACTIVE_USER);
    verifyPassword.mockResolvedValue(false);

    await expect(
      loginService.execute({
        email: ACTIVE_USER.email,
        password: 'incorrect password',
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);

    expect(generateSessionToken).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
  });

  it('rejects a disabled user after verifying the password', async () => {
    findUser.mockResolvedValue({
      ...ACTIVE_USER,
      status: 'DISABLED',
    });
    verifyPassword.mockResolvedValue(true);

    await expect(
      loginService.execute({
        email: ACTIVE_USER.email,
        password: 'correct password',
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);

    expect(verifyPassword).toHaveBeenCalled();
    expect(generateSessionToken).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
  });

  it('rejects the login when the user becomes disabled before session creation', async () => {
    findUser.mockResolvedValue(ACTIVE_USER);
    verifyPassword.mockResolvedValue(true);
    createSession.mockResolvedValue(false);

    await expect(
      loginService.execute({
        email: ACTIVE_USER.email,
        password: 'correct password',
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);

    expect(generateSessionToken).toHaveBeenCalledTimes(1);
    expect(createSession).toHaveBeenCalledWith({
      userId: ACTIVE_USER.id,
      credentialHash: ACTIVE_USER.passwordHash,
      tokenHash: TOKEN_HASH,
      authenticatedAt: AUTHENTICATED_AT,
      expiresAt: EXPIRES_AT,
    });
  });
});
