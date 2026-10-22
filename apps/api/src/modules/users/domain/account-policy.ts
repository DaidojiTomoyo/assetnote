import type { User, UserRole } from './user';

export type AssignableRole = 'ADMIN' | 'USER';
export class AccountError extends Error {
  constructor(
    readonly kind: 'forbidden' | 'not-found' | 'conflict' | 'invalid',
    message: string,
  ) {
    super(message);
  }
}

export function inviteRoles(actor: User): AssignableRole[] {
  if (actor.status !== 'ACTIVE') return [];
  if (actor.role === 'SUPER_ADMIN') return ['ADMIN', 'USER'];
  if (actor.role === 'ADMIN') return ['USER'];
  return [];
}

export function assertManager(actor: User): void {
  if (!inviteRoles(actor).length)
    throw new AccountError('forbidden', '你没有用户管理权限。');
}

export function assertCanInvite(actor: User, role: UserRole): void {
  if (!inviteRoles(actor).some((allowed) => allowed === role)) {
    throw new AccountError('forbidden', '你不能邀请该角色的用户。');
  }
}

export function accessCapabilities(
  actor: User,
  target: User,
): { canChangeStatus: boolean; roleOptions: AssignableRole[] } {
  const editable =
    actor.status === 'ACTIVE' &&
    actor.id !== target.id &&
    target.role !== 'SUPER_ADMIN';
  return {
    canChangeStatus:
      editable &&
      (actor.role === 'SUPER_ADMIN' ||
        (actor.role === 'ADMIN' && target.role === 'USER')),
    roleOptions:
      editable && actor.role === 'SUPER_ADMIN' ? ['ADMIN', 'USER'] : [],
  };
}
