import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../common/database/prisma.service';
import type {
  ActiveAuthSession,
  AuthSessionRepository,
  CreateSessionForSuccessfulLoginInput,
} from '../application/auth-session.repository';

@Injectable()
export class PrismaAuthSessionRepository implements AuthSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createForSuccessfulLogin(
    input: CreateSessionForSuccessfulLoginInput,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (transaction) => {
      const updatedUsers = await transaction.user.updateMany({
        where: {
          id: input.userId,
          status: 'ACTIVE',
          passwordHash: input.credentialHash,
        },
        data: {
          lastLoginAt: input.authenticatedAt,
        },
      });

      if (updatedUsers.count !== 1) {
        return false;
      }

      await transaction.authSession.create({
        data: {
          userId: input.userId,
          tokenHash: input.tokenHash,
          expiresAt: input.expiresAt,
        },
        select: {
          id: true,
        },
      });

      return true;
    });
  }

  async findActiveByTokenHash(
    tokenHash: string,
    now: Date,
  ): Promise<ActiveAuthSession | null> {
    const session = await this.prisma.authSession.findUnique({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: {
          gt: now,
        },
        user: {
          is: {
            status: 'ACTIVE',
          },
        },
      },
      select: {
        id: true,
        expiresAt: true,
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            status: true,
          },
        },
      },
    });

    if (!session) {
      return null;
    }

    return {
      id: session.id,
      expiresAt: session.expiresAt,
      user: {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
        status: session.user.status,
      },
    };
  }

  async revokeByTokenHash(
    tokenHash: string,
    revokedAt: Date,
  ): Promise<boolean> {
    const result = await this.prisma.authSession.updateMany({
      where: {
        tokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt,
      },
    });

    return result.count === 1;
  }
}
