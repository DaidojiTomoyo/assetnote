# ADR 0002: Email/password authentication and server-side sessions

- Status: Accepted
- Date: 2026-08-20

## Context

AssetNote currently has a single browser-based Web client and needs its first authenticated product boundary before portfolio features are added. Accounts are invitation-only: public registration is out of scope, and the initial super administrator must be provisioned through a controlled local operation.

The authentication design must support immediate session revocation and role or account-status changes without exposing password hashes, session credentials, Prisma records, or persistence types across the API boundary. Future stock-market SDK integrations are backend integrations and do not require user authentication tokens to be portable across third-party clients.

## Decision

### Identity and authorization

- The NestJS API owns authentication, authorization policy, users, password hashes, and sessions.
- Users authenticate with a normalized email address and password. Application code trims and lowercases email addresses before persistence and lookup. Password input is never trimmed or otherwise rewritten.
- The database enforces uniqueness for the normalized email value.
- Accounts have an explicit status of `ACTIVE` or `DISABLED`. Only active users may authenticate or use an existing session.
- Platform roles are `SUPER_ADMIN`, `ADMIN`, and `USER`.
- Role capabilities are expressed as explicit authorization policy rather than numeric role ordering:
  - a super administrator may invite an administrator or ordinary user;
  - an administrator may invite only an ordinary user;
  - an ordinary user may not invite users;
  - no invitation may create another super administrator.
- Resource ownership and collaboration roles for future portfolios are separate from platform roles. A platform administrator does not implicitly own or gain access to every user's portfolio.
- The first super administrator is created through a controlled bootstrap command. Public registration is not provided. Invitation delivery and acceptance are deferred.

### Password storage

- Passwords are hashed with Argon2id using parameters that meet the current OWASP baseline and are calibrated for the deployed API environment.
- Only the encoded Argon2id hash is persisted. Plaintext passwords, reversible password encryption, and password values in logs or migrations are prohibited.
- Password hashing and verification are provided through an application-owned port. The Argon2 implementation remains infrastructure and does not enter domain or transport models.
- Failed login responses do not reveal whether the email is unknown, the password is incorrect, or the account is disabled. Login attempts are rate limited and security-relevant outcomes are logged without credentials or session tokens.

### Sessions

- AssetNote uses opaque, server-side sessions rather than JWT access tokens for the browser client.
- A successful login creates a cryptographically random 256-bit session token. The raw token is returned only in a cookie; PostgreSQL stores only its SHA-256 hash.
- Session tokens contain no user identity, role, or other business data. The API resolves the session and current user on authenticated requests so revocation, account disabling, and role changes take effect immediately.
- Sessions have a fixed 24-hour absolute lifetime. Sliding expiration and “remember me” behavior are not part of the baseline.
- Logout revokes the server-side session and clears the browser cookie. Expired or revoked sessions are never accepted.
- Production uses a host-scoped cookie with `Secure`, `HttpOnly`, `SameSite=Lax`, and `Path=/`. Local HTTP development may omit `Secure` and the `__Host-` prefix but preserves `HttpOnly`, `SameSite`, and the narrowest practical scope.
- Authentication responses use `Cache-Control: no-store`. Browser credential requests are limited to the configured Web origin, and unsafe cookie-authenticated requests enforce the configured origin as part of the CSRF defense.
- Authentication credentials are not returned in response bodies or stored in browser local storage.

### API and persistence boundaries

- The initial authentication HTTP surface consists of login, current-user, and logout operations.
- Controllers validate and map transport data, application providers coordinate authentication, and infrastructure adapters implement password and persistence ports.
- Prisma `User` and `AuthSession` records remain infrastructure details. Password hashes and Prisma-generated types never appear in HTTP responses, domain entities, or shared contracts.
- `packages/contracts` remains deferred until the Web application consumes the authentication API and a real shared transport boundary exists.

### Production readiness gates

- The current login throttle uses Nest's process-local in-memory storage and derives its key from `req.ip`. This is suitable only for local development and a single trusted process. Before deployment behind a reverse proxy or with multiple API replicas, configure the exact trusted-proxy chain, use shared throttle storage, and enforce both network-source and normalized-account dimensions so clients neither share one accidental limit nor bypass a global limit across replicas.
- The initial bootstrap input currently accepts passwords containing 8 to 128 characters. This preserves the current local provisioning workflow but is not the final production password-policy decision. Before production without multi-factor authentication, either raise the minimum to the current OWASP-recommended 15 characters or explicitly accept and document the risk with compensating controls. Enabling MFA requires its own accepted design and does not happen implicitly.

## Consequences

Every authenticated request performs an indexed session lookup and resolves the current user. This is acceptable for the current product scale and provides simple, immediate revocation semantics. A distributed session cache may be introduced later without changing the browser credential model if scale requires it.

Session cleanup becomes an operational responsibility. Expired and sufficiently old revoked sessions must eventually be removed through a deliberate maintenance process rather than during request handling.

Cookie authentication requires HTTPS in production, exact-origin CORS with credentials, and CSRF controls for state-changing requests. A future mobile or third-party client would require a separate review of the credential transport and session strategy rather than automatically reusing the browser cookie.

User and session schema changes follow the migration and generated-client controls established by ADR 0001.

## Deferred decisions

ADR 0005 resolves profile editing, password changes, invitation links and
acceptance, and protection of super-administrator accounts for the first account
management release. The remaining items below are deferred only to the extent
they are not superseded by [ADR 0005](./0005-account-management-and-invitations.md).

- Invitation persistence, email delivery, token acceptance, expiration, revocation, and resend behavior
- Preventing removal or demotion of the last active super administrator and controlled account-recovery procedures
- Password changes, password recovery, email changes, and email verification outside invitation acceptance
- Multi-factor authentication and re-authentication for sensitive operations
- Sliding sessions, “remember me,” concurrent-session limits, and user-facing session management
- Distributed session storage or caching
- Mobile, desktop, or third-party API clients and any future JWT or OAuth requirements
- Persistent security-audit event storage and retention policy

## References

- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [NestJS authentication](https://docs.nestjs.com/security/authentication)
