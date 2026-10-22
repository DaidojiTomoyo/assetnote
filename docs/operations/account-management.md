# Account management

From the workspace avatar menu, open **账户设置**. Every user has personal profile
and account security pages. Managers additionally have user and invitation pages.

## Local rollout

The `20261022090000_user_accounts_and_invitations` migration adds nullable nickname
and avatar fields, an edit version counter and the invitation table. It does not
remove or rewrite existing users, passwords, sessions or investment records.
Inspect the local API environment and target database before applying migrations:

```bash
pnpm --filter api exec prisma migrate deploy
pnpm --filter api prisma:generate
```

Run this only against the verified local development database for a local rollout.
Production rollout is a separately authorized operation. No migration runs at API
startup. Restart the API after generation, then run the Web application with its
existing `NEXT_PUBLIC_API_ORIGIN` and matching API `WEB_ORIGIN`.

## Everyday operations

- Personal profiles support nicknames and locally uploaded static PNG/JPEG/WebP
  avatars; email remains read-only. Avatar previews are saved only with **保存资料**.
- Password changes require the old password and a new 15–128 character password.
  All sessions are revoked on success; sign in again on each device.
- Search/filter user lists, open a user detail page and save role changes or
  confirm status changes. Self and super-administrator access edits are blocked.
- Create an invitation for the intended email and role. Copy the displayed link
  and share it with that person through your chosen channel. AssetNote does not
  send email. Links expire after seven days and work only once.
- Invitation records never reveal an existing raw token. **重新生成** creates a new
  link and invalidates previous unaccepted links for the email; **撤销** immediately
  invalidates a pending invitation. Accepted invitations cannot be reused.
- A 409 response means another change won the race. Reload the latest record
  before resubmitting. This prevents a stale browser tab from overwriting newer data.

## HTTP surface

All endpoints are under `/api`, use shared runtime contracts and return a single
Chinese `message` for errors. Reads and writes are never cached.

| Method      | Path                        | Purpose                               |
| ----------- | --------------------------- | ------------------------------------- |
| GET / PATCH | `/account/profile`          | Read or edit own profile              |
| POST        | `/account/password`         | Change password and revoke sessions   |
| GET         | `/users`                    | Manager-only filtered, paginated list |
| GET         | `/users/:id`                | Details with allowed actions          |
| PATCH       | `/users/:id/access`         | Version-checked role/status change    |
| GET / POST  | `/invitations`              | History or create invitation          |
| POST        | `/invitations/:id/revoke`   | Revoke a pending invitation           |
| POST        | `/invitations/:id/reinvite` | Create a replacement invitation       |
| POST        | `/invitations/resolve`      | Inspect a bearer invitation           |
| POST        | `/invitations/accept`       | Create the invited account once       |

The last two endpoints do not require login but still enforce the configured Web
origin and rate limits. Every other endpoint requires an active session. User and
invitation lists return 20 rows per page, with a bounded 500-page maximum.
