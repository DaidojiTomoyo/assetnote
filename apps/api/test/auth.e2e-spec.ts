import { HttpStatus, type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { authSessionSchema } from '@workspace/contracts/auth';

import { AppModule } from '../src/app.module';
import { configureHttpApplication } from '../src/common/bootstrap/configure-http-application';
import applicationConfig, {
  type ApplicationConfig,
} from '../src/common/config/application.config';
import databaseConfig from '../src/common/config/database.config';
import { InvalidCredentialsError } from '../src/modules/auth/application/invalid-credentials.error';
import { LoginService } from '../src/modules/auth/application/login.service';
import { LogoutService } from '../src/modules/auth/application/logout.service';
import { ResolveAuthSessionService } from '../src/modules/auth/application/resolve-auth-session.service';

const TEST_APPLICATION_CONFIG = {
  environment: 'test',
  port: 3001,
  webOrigin: 'http://localhost:3000',
  sessionCookie: {
    name: 'assetnote_session',
    secure: false,
  },
} satisfies ApplicationConfig;

const AUTHENTICATED_USER = {
  id: '8a5c15a2-a356-4c7a-9107-d79f73330742',
  email: 'user@example.com',
  role: 'USER',
  status: 'ACTIVE',
} as const;

const EXPIRES_AT = new Date('2026-08-25T08:00:00.000Z');
const RAW_SESSION_TOKEN = 'raw-session-token';
const ACTIVE_SESSION = {
  id: '111f7695-607e-4401-b8d2-d00526cc6892',
  expiresAt: EXPIRES_AT,
  user: AUTHENTICATED_USER,
} as const;

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;
  let executeLogin: jest.Mock<
    ReturnType<LoginService['execute']>,
    Parameters<LoginService['execute']>
  >;
  let executeLogout: jest.Mock<
    ReturnType<LogoutService['execute']>,
    Parameters<LogoutService['execute']>
  >;
  let resolveAuthSession: jest.Mock<
    ReturnType<ResolveAuthSessionService['execute']>,
    Parameters<ResolveAuthSessionService['execute']>
  >;

  beforeEach(async () => {
    executeLogin = jest.fn<
      ReturnType<LoginService['execute']>,
      Parameters<LoginService['execute']>
    >();
    executeLogout = jest.fn<
      ReturnType<LogoutService['execute']>,
      Parameters<LogoutService['execute']>
    >();
    resolveAuthSession = jest.fn<
      ReturnType<ResolveAuthSessionService['execute']>,
      Parameters<ResolveAuthSessionService['execute']>
    >();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(databaseConfig.KEY)
      .useValue({
        url: 'postgresql://test:test@127.0.0.1:1/assetnote_test',
      })
      .overrideProvider(applicationConfig.KEY)
      .useValue(TEST_APPLICATION_CONFIG)
      .overrideProvider(LoginService)
      .useValue({ execute: executeLogin })
      .overrideProvider(LogoutService)
      .useValue({ execute: executeLogout })
      .overrideProvider(ResolveAuthSessionService)
      .useValue({ execute: resolveAuthSession })
      .compile();

    app = moduleFixture.createNestApplication();
    configureHttpApplication(app, TEST_APPLICATION_CONFIG);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('logs in, writes the protected session cookie, and omits the token from the body', async () => {
    executeLogin.mockResolvedValue({
      user: AUTHENTICATED_USER,
      rawSessionToken: RAW_SESSION_TOKEN,
      expiresAt: EXPIRES_AT,
    });

    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Origin', TEST_APPLICATION_CONFIG.webOrigin)
      .send({
        email: '  User@Example.COM  ',
        password: '  exact password  ',
      })
      .expect(HttpStatus.OK)
      .expect('Cache-Control', 'no-store')
      .expect({
        user: {
          id: AUTHENTICATED_USER.id,
          email: AUTHENTICATED_USER.email,
          role: AUTHENTICATED_USER.role,
        },
        expiresAt: EXPIRES_AT.toISOString(),
      });

    expect(executeLogin).toHaveBeenCalledWith({
      email: 'User@Example.COM',
      password: '  exact password  ',
    });
    expect(response.text).not.toContain(RAW_SESSION_TOKEN);
    expect(authSessionSchema.safeParse(response.body).success).toBe(true);

    const setCookieHeaders = response.headers['set-cookie'];

    expect(setCookieHeaders).toHaveLength(1);
    expect(setCookieHeaders?.[0]).toContain(
      `assetnote_session=${RAW_SESSION_TOKEN}`,
    );
    expect(setCookieHeaders?.[0]).toContain('Path=/');
    expect(setCookieHeaders?.[0]).toContain(
      `Expires=${EXPIRES_AT.toUTCString()}`,
    );
    expect(setCookieHeaders?.[0]).toContain('HttpOnly');
    expect(setCookieHeaders?.[0]).toContain('SameSite=Lax');
    expect(setCookieHeaders?.[0]).not.toContain('Secure');
  });

  it('maps all invalid credentials to the same unauthorized response', async () => {
    executeLogin.mockRejectedValue(new InvalidCredentialsError());

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Origin', TEST_APPLICATION_CONFIG.webOrigin)
      .send({
        email: 'missing@example.com',
        password: 'submitted password',
      })
      .expect(HttpStatus.UNAUTHORIZED)
      .expect('Cache-Control', 'no-store')
      .expect({
        message: '邮箱或密码错误。',
      });
  });

  it('returns only the first Chinese validation message', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Origin', TEST_APPLICATION_CONFIG.webOrigin)
      .send({
        email: 'not-an-email',
        password: '',
      })
      .expect(HttpStatus.BAD_REQUEST)
      .expect('Cache-Control', 'no-store')
      .expect({
        message: '邮箱格式不正确。',
      });

    expect(executeLogin).not.toHaveBeenCalled();
  });

  it('returns one Chinese message for an additional request field', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Origin', TEST_APPLICATION_CONFIG.webOrigin)
      .send({
        email: 'user@example.com',
        password: 'submitted password',
        unexpected: true,
      })
      .expect(HttpStatus.BAD_REQUEST)
      .expect('Cache-Control', 'no-store')
      .expect({
        message: '请求中包含不允许的字段。',
      });

    expect(executeLogin).not.toHaveBeenCalled();
  });

  it.each([
    { email: 'user@example.com', password: '' },
    { email: 'user@example.com', password: 'x'.repeat(1025) },
    { email: 'user@example.com', password: 'secret', role: 'SUPER_ADMIN' },
  ])(
    'rejects invalid shared-contract input before authentication: %p',
    async (input) => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('Origin', TEST_APPLICATION_CONFIG.webOrigin)
        .send(input)
        .expect(HttpStatus.BAD_REQUEST);

      expect(executeLogin).not.toHaveBeenCalled();
    },
  );

  it('rejects login requests outside the configured Web origin', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Origin', 'https://attacker.example')
      .send({
        email: 'user@example.com',
        password: 'submitted password',
      })
      .expect(HttpStatus.FORBIDDEN)
      .expect('Cache-Control', 'no-store')
      .expect({
        message: '不允许当前请求来源。',
      });

    expect(executeLogin).not.toHaveBeenCalled();
  });

  it('limits login attempts to five requests per minute for one client', async () => {
    executeLogin.mockRejectedValue(new InvalidCredentialsError());

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('Origin', TEST_APPLICATION_CONFIG.webOrigin)
        .send({
          email: 'user@example.com',
          password: 'incorrect password',
        })
        .expect(HttpStatus.UNAUTHORIZED);
    }

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Origin', TEST_APPLICATION_CONFIG.webOrigin)
      .send({
        email: 'user@example.com',
        password: 'incorrect password',
      })
      .expect(HttpStatus.TOO_MANY_REQUESTS)
      .expect('Cache-Control', 'no-store')
      .expect({
        message: '请求过于频繁，请稍后再试。',
      });

    expect(executeLogin).toHaveBeenCalledTimes(5);
  });

  it('returns the current user for an active session without exposing its token', async () => {
    resolveAuthSession.mockResolvedValue(ACTIVE_SESSION);

    const response = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set(
        'Cookie',
        `${TEST_APPLICATION_CONFIG.sessionCookie.name}=${RAW_SESSION_TOKEN}`,
      )
      .expect(HttpStatus.OK)
      .expect('Cache-Control', 'no-store')
      .expect({
        user: {
          id: AUTHENTICATED_USER.id,
          email: AUTHENTICATED_USER.email,
          role: AUTHENTICATED_USER.role,
        },
        expiresAt: EXPIRES_AT.toISOString(),
      });

    expect(resolveAuthSession).toHaveBeenCalledWith(RAW_SESSION_TOKEN);
    expect(response.text).not.toContain(RAW_SESSION_TOKEN);
  });

  it('rejects missing and inactive sessions with the same unauthorized response', async () => {
    const expectedResponse = {
      message: '请先登录。',
    };

    await request(app.getHttpServer())
      .get('/api/auth/me')
      .expect(HttpStatus.UNAUTHORIZED)
      .expect('Cache-Control', 'no-store')
      .expect(expectedResponse);

    expect(resolveAuthSession).not.toHaveBeenCalled();

    resolveAuthSession.mockResolvedValue(null);

    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set(
        'Cookie',
        `${TEST_APPLICATION_CONFIG.sessionCookie.name}=${RAW_SESSION_TOKEN}`,
      )
      .expect(HttpStatus.UNAUTHORIZED)
      .expect('Cache-Control', 'no-store')
      .expect(expectedResponse);

    expect(resolveAuthSession).toHaveBeenCalledWith(RAW_SESSION_TOKEN);
  });

  it('revokes the server session and clears the browser cookie on logout', async () => {
    executeLogout.mockResolvedValue(true);

    const response = await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Origin', TEST_APPLICATION_CONFIG.webOrigin)
      .set(
        'Cookie',
        `${TEST_APPLICATION_CONFIG.sessionCookie.name}=${RAW_SESSION_TOKEN}`,
      )
      .expect(HttpStatus.NO_CONTENT)
      .expect('Cache-Control', 'no-store');

    expect(executeLogout).toHaveBeenCalledWith(RAW_SESSION_TOKEN);
    expect(response.text).toBe('');

    const setCookieHeaders = response.headers['set-cookie'];

    expect(setCookieHeaders).toHaveLength(1);
    expect(setCookieHeaders?.[0]).toContain('assetnote_session=;');
    expect(setCookieHeaders?.[0]).toContain('Path=/');
    expect(setCookieHeaders?.[0]).toContain(
      'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    );
    expect(setCookieHeaders?.[0]).toContain('HttpOnly');
    expect(setCookieHeaders?.[0]).toContain('SameSite=Lax');
    expect(setCookieHeaders?.[0]).not.toContain('Secure');
  });

  it('rejects logout outside the configured Web origin', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Origin', 'https://attacker.example')
      .set(
        'Cookie',
        `${TEST_APPLICATION_CONFIG.sessionCookie.name}=${RAW_SESSION_TOKEN}`,
      )
      .expect(HttpStatus.FORBIDDEN)
      .expect('Cache-Control', 'no-store')
      .expect({
        message: '不允许当前请求来源。',
      });

    expect(executeLogout).not.toHaveBeenCalled();
  });
});
