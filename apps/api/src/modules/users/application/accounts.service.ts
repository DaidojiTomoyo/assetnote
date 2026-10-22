import { Inject, Injectable } from '@nestjs/common';
import {
  accessCapabilities,
  AccountError,
  assertCanInvite,
  assertManager,
  inviteRoles,
  type AssignableRole,
} from '../domain/account-policy';
import type { UserStatus } from '../domain/user';
import { normalizeEmail } from '../domain/normalize-email';
import {
  ACCOUNTS_REPOSITORY,
  AVATAR_PROCESSOR,
  INVITATION_TOKENS,
  type AccountFilter,
  type AccountRecord,
  type AccountsRepository,
  type AccountStore,
  type AvatarProcessor,
  type InvitationFilter,
  type InvitationRecord,
  type InvitationTokens,
} from './accounts.repository';
import { PASSWORD_HASHER, type PasswordHasher } from './password-hasher';

export function invitationStatus(invitation: InvitationRecord, now: Date) {
  if (invitation.acceptedAt) return 'ACCEPTED';
  if (invitation.revokedAt) return 'REVOKED';
  return invitation.expiresAt <= now ? 'EXPIRED' : 'PENDING';
}

async function activeActor(
  store: AccountStore,
  id: string,
): Promise<AccountRecord> {
  const actor = await store.findUser(id);
  if (!actor || actor.status !== 'ACTIVE')
    throw new AccountError('forbidden', '账户已停用，请重新登录。');
  return actor;
}

@Injectable()
export class AccountsService {
  constructor(
    @Inject(ACCOUNTS_REPOSITORY)
    private readonly repository: AccountsRepository,
    @Inject(PASSWORD_HASHER) private readonly passwords: PasswordHasher,
    @Inject(INVITATION_TOKENS) private readonly tokens: InvitationTokens,
    @Inject(AVATAR_PROCESSOR) private readonly avatars: AvatarProcessor,
  ) {}

  profile(actorId: string) {
    return this.repository.transaction(async (store) => {
      const user = await activeActor(store, actorId);
      return {
        user,
        canManageUsers: inviteRoles(user).length > 0,
        inviteRoles: inviteRoles(user),
      };
    });
  }

  async updateProfile(
    actorId: string,
    input: { nickname: string; avatar?: string | null; version: number },
  ) {
    const avatar =
      typeof input.avatar === 'string'
        ? await this.avatars.process(input.avatar)
        : input.avatar;
    return this.repository.transaction(async (store) => {
      await activeActor(store, actorId);
      return store.updateUser(actorId, input.version, {
        nickname: input.nickname,
        ...(avatar !== undefined ? { avatar } : {}),
      });
    });
  }

  async changePassword(
    actorId: string,
    input: { currentPassword: string; newPassword: string },
  ): Promise<void> {
    const previousHash = await this.repository.transaction(async (store) => {
      await activeActor(store, actorId);
      return store.passwordHash(actorId);
    });
    if (
      !previousHash ||
      !(await this.passwords.verify(input.currentPassword, previousHash))
    )
      throw new AccountError('invalid', '当前密码不正确，请重新输入。');
    const passwordHash = await this.passwords.hash(input.newPassword);
    await this.repository.transaction(async (store) => {
      const actor = await activeActor(store, actorId);
      if ((await store.passwordHash(actorId)) !== previousHash)
        throw new AccountError('conflict', '密码已发生变化，请重新登录。');
      await store.updateUser(actorId, actor.version, { passwordHash });
      await store.revokeSessions(actorId, new Date());
    });
  }

  list(actorId: string, filter: AccountFilter) {
    return this.repository.transaction(async (store) => {
      assertManager(await activeActor(store, actorId));
      return store.listUsers(filter);
    });
  }

  detail(actorId: string, targetId: string) {
    return this.repository.transaction(async (store) => {
      const actor = await activeActor(store, actorId);
      assertManager(actor);
      const user = await store.findUser(targetId);
      if (!user) throw new AccountError('not-found', '用户不存在。');
      return { user, capabilities: accessCapabilities(actor, user) };
    });
  }

  changeAccess(
    actorId: string,
    targetId: string,
    input: { role?: AssignableRole; status?: UserStatus; version: number },
  ) {
    return this.repository.transaction(async (store) => {
      const actor = await activeActor(store, actorId);
      assertManager(actor);
      const target = await store.findUser(targetId);
      if (!target) throw new AccountError('not-found', '用户不存在。');
      const capabilities = accessCapabilities(actor, target);
      if (
        (input.role !== undefined &&
          !capabilities.roleOptions.includes(input.role)) ||
        (input.status !== undefined && !capabilities.canChangeStatus)
      )
        throw new AccountError(
          'forbidden',
          '不能修改当前账户、超级管理员或权限范围外的用户。',
        );
      const user = await store.updateUser(targetId, input.version, {
        role: input.role,
        status: input.status,
      });
      if (input.status === 'DISABLED')
        await store.revokeSessions(targetId, new Date());
      return { user, capabilities: accessCapabilities(actor, user) };
    });
  }

  invitations(actorId: string, filter: InvitationFilter) {
    return this.repository.transaction(async (store) => {
      const actor = await activeActor(store, actorId);
      assertManager(actor);
      return { ...(await store.listInvitations(filter, new Date())), actor };
    });
  }

  createInvitation(
    actorId: string,
    input: { email: string; role: AssignableRole },
  ) {
    return this.issueInvitation(actorId, input);
  }

  private async issueInvitation(
    actorId: string,
    input: { email: string; role: AssignableRole } | { invitationId: string },
  ) {
    const token = this.tokens.create();
    const tokenHash = this.tokens.hash(token);
    const result = await this.repository.transaction(async (store) => {
      const actor = await activeActor(store, actorId);
      assertManager(actor);
      const previous =
        'invitationId' in input
          ? await store.findInvitation(input.invitationId)
          : null;
      if ('invitationId' in input && !previous)
        throw new AccountError('not-found', '邀请不存在。');
      if (previous?.acceptedAt)
        throw new AccountError('conflict', '该邀请已接受，无法重新生成。');
      const email = normalizeEmail(
        'email' in input ? input.email : (previous?.email ?? ''),
      );
      const role = 'role' in input ? input.role : (previous?.role ?? 'USER');
      assertCanInvite(actor, role);
      if (await store.findByEmail(email))
        throw new AccountError(
          'conflict',
          '该邮箱已存在账户，请在用户列表中查看。',
        );
      const now = new Date();
      const pending = await store.findPendingInvitation(email, now);
      if (pending) assertCanInvite(actor, pending.role);
      await store.revokeInvitations(email, now);
      const invitation = await store.createInvitation({
        email,
        role,
        inviterId: actor.id,
        tokenHash,
        expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      });
      return { invitation, actor };
    });
    return { ...result, token };
  }

  reinvite(actorId: string, invitationId: string) {
    return this.issueInvitation(actorId, { invitationId });
  }

  revokeInvitation(actorId: string, invitationId: string) {
    return this.repository.transaction(async (store) => {
      const actor = await activeActor(store, actorId);
      const invitation = await store.findInvitation(invitationId);
      if (!invitation) throw new AccountError('not-found', '邀请不存在。');
      assertCanInvite(actor, invitation.role);
      if (invitationStatus(invitation, new Date()) !== 'PENDING')
        throw new AccountError(
          'conflict',
          '该邀请已失效或已接受，请刷新记录。',
        );
      await store.revokeInvitation(invitationId, new Date());
    });
  }

  private async validInvitation(store: AccountStore, tokenHash: string) {
    const invitation = await store.findInvitationByHash(tokenHash);
    const invalid = new AccountError(
      'invalid',
      '邀请已过期、撤销或接受，请联系管理员重新邀请。',
    );
    if (!invitation || invitationStatus(invitation, new Date()) !== 'PENDING')
      throw invalid;
    const inviter = await store.findUser(invitation.inviterId);
    if (!inviter || !inviteRoles(inviter).includes(invitation.role))
      throw invalid;
    if (await store.findByEmail(invitation.email)) throw invalid;
    return invitation;
  }

  resolveInvitation(token: string) {
    return this.repository.transaction((store) =>
      this.validInvitation(store, this.tokens.hash(token)),
    );
  }

  async acceptInvitation(input: {
    token: string;
    nickname: string;
    password: string;
  }): Promise<void> {
    const tokenHash = this.tokens.hash(input.token);
    await this.repository.transaction((store) =>
      this.validInvitation(store, tokenHash),
    );
    const passwordHash = await this.passwords.hash(input.password);
    await this.repository.transaction(async (store) => {
      const invitation = await this.validInvitation(store, tokenHash);
      await store.createUser({
        email: invitation.email,
        role: invitation.role,
        nickname: input.nickname,
        passwordHash,
      });
      await store.acceptInvitation(invitation.id, new Date());
    });
  }
}
