# ADR 0005: Account management and invitation lifecycle

- Status: Accepted
- Date: 2026-10-22

## Context

The approved A+C account experience adds personal profiles, password changes,
user administration and the complete invitation lifecycle to the existing
email/password authentication boundary. This decision resolves the corresponding
deferred items in ADR 0002 without granting administrators access to other users'
investment records.

## Decision

### Ownership and transport

The API users feature owns profile, access and invitation use cases. Its provider
module remains available to authentication; a separate `UsersHttpModule` composes
the users providers and the auth module's public guards, avoiding a circular Nest
module dependency. Web uses the public `@workspace/contracts/accounts` runtime
schemas over HTTP. Authorization is checked against current database state, not
client visibility or stale session roles.

Authenticated reads require an active session. Cookie-authenticated writes and
public invitation resolution/acceptance require the configured Web origin.
Responses use `Cache-Control: no-store`. Password operations and invitation
creation/acceptance are rate limited using the existing single-process throttle;
ADR 0002's distributed-deployment readiness gate still applies.

### Personal profile and passwords

- A user can change their own nickname (1–40 characters) and avatar. Login email,
  role and account status are never accepted by the profile mutation contract.
- Avatar uploads accept bounded PNG/JPEG/WebP data, decoded and resized by the API
  into a 256×256 WebP image with metadata removed. SVG, animated, corrupt,
  oversized and excessive-pixel images are rejected. The small normalized data
  URL is stored in the users table, avoiding an unconfigured external object
  store. No remote image URLs are fetched. Lists are limited to 20 users per page.
- Password changes require the current password. Newly set passwords use 15–128
  characters, without composition rules, trimming or normalization. Existing
  credentials continue to work; the legacy bootstrap workflow remains unchanged.
- Password update and revocation of all the user's sessions commit atomically.
  The current cookie is cleared and Web asks the user to log in again. Session
  creation compares the credential hash verified at login with the persisted
  hash, closing a concurrent old-password login race.
- Profile/access changes include an expected version; stale writes return 409
  instead of silently replacing a newer edit.

### User administration

- Super administrators may change `ADMIN`/`USER` roles and enable or disable
  other non-super-administrator accounts.
- Administrators may enable or disable ordinary users; they cannot change roles
  or modify peer administrators.
- Ordinary users have no administrative capabilities. Neither role may modify
  its own role/status through this surface. All super-administrator accounts are
  immutable through these endpoints, so the last active super administrator cannot
  be demoted or disabled by this UI/API. Recovery remains a controlled operation.
- Disabling a user revokes existing sessions in the same transaction. Enabling
  does not revive revoked sessions. Role changes take effect on the next request.
- Users are not deleted, and this feature never reads or changes portfolio data.

### Invitations

- Super administrators may invite `ADMIN` or `USER`; administrators may invite
  only `USER`. Invitations can never create `SUPER_ADMIN`.
- Each invitation has a cryptographically random 256-bit token, a normalized
  email, intended role, creator, creation/expiry timestamps and acceptance or
  revocation timestamps. Only the SHA-256 token hash is persisted.
- Links are displayed once, for the administrator to share. No email service is
  invoked. Bearer-link possession does not establish independent email ownership;
  this release does not label an invited email as verified.
- Tokens are carried in the Web URL fragment and posted in JSON to the API,
  keeping them out of request paths and referrers. No token is put in browser
  persistent storage or application logs.
- Links expire after seven days and can be accepted once. Regeneration creates a
  new record and revokes previous unaccepted links for that email. An administrator
  cannot replace a pending invitation for a role they cannot invite.
- Acceptance rechecks expiry, revocation, email uniqueness and the creator's
  current status/role before creating the account and consuming the invitation in
  one transaction. Accepting an invitation does not automatically log in.
- Invitation history reports pending, accepted, expired and revoked states. Raw
  links cannot be retrieved later; regeneration explicitly invalidates old links.

The application owns transaction boundaries through a users-owned port. Prisma
stays in infrastructure, using serializable transactions and at most two retries
for recognized serialization conflicts. Hashing and image processing happen
outside transactions. PostgreSQL integration tests cover concurrent acceptance,
stale writes, immediate revocation and permission changes.

## Out of scope

Public signup, email sending/verification, changing login email, password recovery,
MFA, deleting users, creating/editing super administrators, persistent audit event
retention and production migration execution remain separate work.

## References

- [ADR 0002](./0002-email-password-authentication-and-server-sessions.md)
- [OWASP authentication guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Sharp constructor and input limits](https://sharp.pixelplumbing.com/api-constructor/)
