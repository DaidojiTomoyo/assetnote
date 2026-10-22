import type { User, UserRole, UserStatus } from '../domain/user';
import type { AssignableRole } from '../domain/account-policy';

export const ACCOUNTS_REPOSITORY = Symbol('ACCOUNTS_REPOSITORY');
export interface AccountRecord extends User {
  nickname: string | null;
  avatar: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  version: number;
}
export interface InvitationRecord {
  id: string;
  email: string;
  role: AssignableRole;
  inviterId: string;
  createdAt: Date;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
}
export interface AccountFilter {
  search: string;
  role?: UserRole;
  status?: UserStatus;
  page: number;
}
export interface InvitationFilter {
  status?: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
  page: number;
}

export interface AccountStore {
  findUser(id: string): Promise<AccountRecord | null>;
  findByEmail(email: string): Promise<AccountRecord | null>;
  passwordHash(id: string): Promise<string | null>;
  listUsers(
    filter: AccountFilter,
  ): Promise<{ users: AccountRecord[]; total: number }>;
  updateUser(
    id: string,
    version: number,
    data: {
      nickname?: string;
      avatar?: string | null;
      role?: AssignableRole;
      status?: UserStatus;
      passwordHash?: string;
    },
  ): Promise<AccountRecord>;
  revokeSessions(userId: string, now: Date): Promise<void>;
  listInvitations(
    filter: InvitationFilter,
    now: Date,
  ): Promise<{ invitations: InvitationRecord[]; total: number }>;
  findInvitation(id: string): Promise<InvitationRecord | null>;
  findInvitationByHash(hash: string): Promise<InvitationRecord | null>;
  findPendingInvitation(
    email: string,
    now: Date,
  ): Promise<InvitationRecord | null>;
  revokeInvitations(email: string, now: Date): Promise<void>;
  revokeInvitation(id: string, now: Date): Promise<void>;
  createInvitation(input: {
    email: string;
    role: AssignableRole;
    tokenHash: string;
    inviterId: string;
    expiresAt: Date;
  }): Promise<InvitationRecord>;
  acceptInvitation(id: string, now: Date): Promise<void>;
  createUser(input: {
    email: string;
    nickname: string;
    role: AssignableRole;
    passwordHash: string;
  }): Promise<AccountRecord>;
}
export interface AccountsRepository {
  transaction<T>(operation: (store: AccountStore) => Promise<T>): Promise<T>;
}

export const INVITATION_TOKENS = Symbol('INVITATION_TOKENS');
export interface InvitationTokens {
  create(): string;
  hash(token: string): string;
}
export const AVATAR_PROCESSOR = Symbol('AVATAR_PROCESSOR');
export interface AvatarProcessor {
  process(input: string): Promise<string>;
}
