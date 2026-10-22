import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { Prisma } from '../../../generated/prisma/client';
import type {
  AccountFilter,
  AccountRecord,
  AccountsRepository,
  AccountStore,
  InvitationFilter,
  InvitationRecord,
} from '../application/accounts.repository';
import { AccountError } from '../domain/account-policy';

const accountSelect = {
  id: true,
  email: true,
  nickname: true,
  avatar: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
  version: true,
} satisfies Prisma.UserSelect;
const invitationSelect = {
  id: true,
  email: true,
  role: true,
  inviterId: true,
  createdAt: true,
  expiresAt: true,
  acceptedAt: true,
  revokedAt: true,
} satisfies Prisma.UserInvitationSelect;

function mapInvitation(
  row: Prisma.UserInvitationGetPayload<{ select: typeof invitationSelect }>,
): InvitationRecord {
  if (row.role === 'SUPER_ADMIN')
    throw new Error('Invalid stored invitation role');
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    inviterId: row.inviterId,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    acceptedAt: row.acceptedAt,
    revokedAt: row.revokedAt,
  };
}

class PrismaAccountStore implements AccountStore {
  constructor(private readonly db: Prisma.TransactionClient) {}
  findUser(id: string): Promise<AccountRecord | null> {
    return this.db.user.findUnique({ where: { id }, select: accountSelect });
  }
  findByEmail(email: string): Promise<AccountRecord | null> {
    return this.db.user.findUnique({ where: { email }, select: accountSelect });
  }
  async passwordHash(id: string): Promise<string | null> {
    return (
      (
        await this.db.user.findUnique({
          where: { id },
          select: { passwordHash: true },
        })
      )?.passwordHash ?? null
    );
  }
  async listUsers(filter: AccountFilter) {
    const where: Prisma.UserWhereInput = {
      role: filter.role,
      status: filter.status,
      ...(filter.search
        ? {
            OR: [
              { email: { contains: filter.search, mode: 'insensitive' } },
              { nickname: { contains: filter.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [users, total] = await Promise.all([
      this.db.user.findMany({
        where,
        select: accountSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (filter.page - 1) * 20,
        take: 20,
      }),
      this.db.user.count({ where }),
    ]);
    return { users, total };
  }
  updateUser(
    id: string,
    version: number,
    data: Parameters<AccountStore['updateUser']>[2],
  ): Promise<AccountRecord> {
    return this.db.user.update({
      where: { id, version },
      data: { ...data, version: { increment: 1 } },
      select: accountSelect,
    });
  }
  async revokeSessions(userId: string, now: Date) {
    await this.db.authSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now },
    });
  }
  async listInvitations(filter: InvitationFilter, now: Date) {
    const statusWhere: Record<
      NonNullable<InvitationFilter['status']>,
      Prisma.UserInvitationWhereInput
    > = {
      PENDING: { acceptedAt: null, revokedAt: null, expiresAt: { gt: now } },
      EXPIRED: { acceptedAt: null, revokedAt: null, expiresAt: { lte: now } },
      REVOKED: { acceptedAt: null, revokedAt: { not: null } },
      ACCEPTED: { acceptedAt: { not: null } },
    };
    const where = filter.status ? statusWhere[filter.status] : {};
    const [rows, total] = await Promise.all([
      this.db.userInvitation.findMany({
        where,
        select: invitationSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (filter.page - 1) * 20,
        take: 20,
      }),
      this.db.userInvitation.count({ where }),
    ]);
    return { invitations: rows.map(mapInvitation), total };
  }
  async findInvitation(id: string) {
    const row = await this.db.userInvitation.findUnique({
      where: { id },
      select: invitationSelect,
    });
    return row ? mapInvitation(row) : null;
  }
  async findInvitationByHash(tokenHash: string) {
    const row = await this.db.userInvitation.findUnique({
      where: { tokenHash },
      select: invitationSelect,
    });
    return row ? mapInvitation(row) : null;
  }
  async findPendingInvitation(email: string, now: Date) {
    const row = await this.db.userInvitation.findFirst({
      where: {
        email,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      select: invitationSelect,
    });
    return row ? mapInvitation(row) : null;
  }
  async revokeInvitations(email: string, now: Date) {
    await this.db.userInvitation.updateMany({
      where: { email, acceptedAt: null, revokedAt: null },
      data: { revokedAt: now },
    });
  }
  async revokeInvitation(id: string, now: Date) {
    await this.db.userInvitation.update({
      where: { id, acceptedAt: null, revokedAt: null },
      data: { revokedAt: now },
      select: { id: true },
    });
  }
  async createInvitation(
    input: Parameters<AccountStore['createInvitation']>[0],
  ) {
    return mapInvitation(
      await this.db.userInvitation.create({
        data: input,
        select: invitationSelect,
      }),
    );
  }
  async acceptInvitation(id: string, now: Date) {
    await this.db.userInvitation.update({
      where: { id, acceptedAt: null, revokedAt: null, expiresAt: { gt: now } },
      data: { acceptedAt: now },
      select: { id: true },
    });
  }
  createUser(
    input: Parameters<AccountStore['createUser']>[0],
  ): Promise<AccountRecord> {
    return this.db.user.create({ data: input, select: accountSelect });
  }
}

@Injectable()
export class PrismaAccountsRepository implements AccountsRepository {
  constructor(private readonly prisma: PrismaService) {}
  async transaction<T>(
    operation: (store: AccountStore) => Promise<T>,
  ): Promise<T> {
    // Callbacks only perform database work; hashing and media processing happen before entering.
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await this.prisma.$transaction(
          (db) => operation(new PrismaAccountStore(db)),
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2034' && attempt < 2) continue;
          if (['P2025', 'P2034'].includes(error.code))
            throw new AccountError(
              'conflict',
              '资料已发生变化，请刷新后重试。',
            );
          if (error.code === 'P2002')
            throw new AccountError(
              'conflict',
              '该邮箱已存在账户，请刷新后重试。',
            );
        }
        throw error;
      }
    }
  }
}
