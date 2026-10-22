import {
  type ArgumentsHost,
  BadRequestException,
  Catch,
  type ExceptionFilter,
  type PipeTransform,
} from '@nestjs/common';
import type { Response } from 'express';
import { accountSchema, invitationSchema } from '@workspace/contracts/accounts';
import type {
  AccountRecord,
  InvitationRecord,
} from '../application/accounts.repository';
import { invitationStatus } from '../application/accounts.service';
import { AccountError, inviteRoles } from '../domain/account-policy';
import type { User } from '../domain/user';

type ParseResult<T> =
  | { success: true; data: T }
  | {
      success: false;
      error: { issues: readonly { code: string; message: string }[] };
    };
interface Schema<T> {
  safeParse(value: unknown): ParseResult<T>;
}
export class ContractPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: Schema<T>) {}
  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success)
      throw new BadRequestException({
        message:
          result.error.issues[0]?.code === 'unrecognized_keys'
            ? '请求中包含不允许的字段。'
            : (result.error.issues[0]?.message ?? '请求参数不正确。'),
      });
    return result.data;
  }
}
@Catch(AccountError)
export class AccountErrorFilter implements ExceptionFilter<AccountError> {
  catch(error: AccountError, host: ArgumentsHost): void {
    const status = {
      forbidden: 403,
      'not-found': 404,
      conflict: 409,
      invalid: 400,
    }[error.kind];
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(status)
      .json({ message: error.message });
  }
}
export function mapAccount(user: AccountRecord) {
  return accountSchema.parse({
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    avatar: user.avatar,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    version: user.version,
  });
}
export function mapInvitation(invitation: InvitationRecord, actor: User) {
  const status = invitationStatus(invitation, new Date());
  const allowed = inviteRoles(actor).includes(invitation.role);
  return invitationSchema.parse({
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    status,
    createdAt: invitation.createdAt.toISOString(),
    expiresAt: invitation.expiresAt.toISOString(),
    acceptedAt: invitation.acceptedAt?.toISOString() ?? null,
    canRevoke: allowed && status === 'PENDING',
    canReinvite: allowed && status !== 'ACCEPTED',
  });
}
