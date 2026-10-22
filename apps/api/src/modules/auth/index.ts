export { AuthModule } from './auth.module';
export { SessionAuthenticationGuard } from './presentation/session-authentication.guard';
export { WebOriginGuard } from './presentation/web-origin.guard';
export { createSessionCookieOptions } from './presentation/session-cookie';
export { preventAuthResponseCaching } from './presentation/prevent-auth-response-caching.middleware';
export type { AuthenticatedRequest } from './presentation/authenticated-request';
