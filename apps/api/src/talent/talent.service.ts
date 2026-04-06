import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import type { SearchTalentDto } from './dto/search-talent.dto';

@Injectable()
export class TalentService {
  constructor(private readonly prisma: PrismaService) {}

  async searchPublic(query: SearchTalentDto) {
    return this.searchInternal(query, undefined);
  }

  async search(query: SearchTalentDto, viewer: CurrentUserPayload) {
    return this.searchInternal(query, viewer);
  }

  private async searchInternal(
    query: SearchTalentDto,
    viewer?: CurrentUserPayload,
  ) {
    const { q, clubId, profession, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const profileWhere: Record<string, unknown> = {
      talentVisible: true,
      OR: [
        { profession: { not: null, notIn: [''] } },
        { bio: { not: null, notIn: [''] } },
      ],
    };
    if (profession?.trim()) {
      profileWhere.profession = {
        contains: profession.trim(),
        mode: 'insensitive',
      };
    }

    const where: Record<string, unknown> = {
      isActive: true,
      profile: profileWhere,
    };

    if (q?.trim()) {
      where.fullName = {
        contains: q.trim(),
        mode: 'insensitive',
      };
    }

    if (clubId) {
      where.memberships = {
        some: {
          clubId,
          OR: [
            { activeUntil: null },
            { activeUntil: { gt: new Date() } },
          ],
        },
      };
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          fullName: true,
          email: true,
          profile: {
            select: {
              profession: true,
              bio: true,
              city: true,
              linkedInUrl: true,
              contactEmailPublic: true,
            },
          },
          memberships: {
            where: {
              OR: [
                { activeUntil: null },
                { activeUntil: { gt: new Date() } },
              ],
            },
            include: {
              club: { select: { id: true, name: true, code: true } },
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const items = users.map((u) =>
      this.toPublicCard(u, viewer),
    );
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getPublicCard(userId: string, viewer: CurrentUserPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        memberships: {
          where: {
            OR: [
              { activeUntil: null },
              { activeUntil: { gt: new Date() } },
            ],
          },
          include: { club: { select: { id: true, name: true, code: true } } },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const isOwnProfile = viewer.id === userId;
    const isDistrital =
      viewer.role === Role.SECRETARY || viewer.role === Role.PRESIDENT || viewer.role === Role.RDR;
    const isCompany = viewer.role === Role.COMPANY;

    if (isOwnProfile) {
      return this.toFullProfile(user);
    }

    if (!user.profile?.talentVisible) {
      throw new NotFoundException('Perfil no visible');
    }

    if (
      !user.profile.profession &&
      !user.profile.bio
    ) {
      throw new NotFoundException('Perfil incompleto');
    }

    if (isDistrital || isCompany) {
      return this.toFullProfile(user);
    }

    return this.toPublicCard(user, viewer);
  }

  private toPublicCard(
    user: {
    id: string;
    fullName: string;
    email?: string;
    profile: {
      profession: string | null;
      bio: string | null;
      city: string | null;
      linkedInUrl: string | null;
      contactEmailPublic?: boolean;
    } | null;
      memberships: Array<{
        club: { id: string; name: string; code: string };
      }>;
    },
    viewer?: CurrentUserPayload,
  ) {
    const isDistrital =
      viewer?.role === Role.SECRETARY || viewer?.role === Role.PRESIDENT;
    const isOwnProfile = viewer?.id === user.id;
    const isCompany = viewer?.role === Role.COMPANY;

    const canSeeEmail =
      !!user.profile?.contactEmailPublic &&
      !!user.email &&
      (isDistrital || isOwnProfile || isCompany);

    return {
      id: user.id,
      fullName: user.fullName,
      profession: user.profile?.profession ?? null,
      bio: user.profile?.bio ?? null,
      city: user.profile?.city ?? null,
      linkedInUrl: user.profile?.linkedInUrl ?? null,
      clubs: user.memberships.map((m) => m.club),
      email: canSeeEmail ? user.email : undefined,
    };
  }

  private toFullProfile(user: {
    id: string;
    fullName: string;
    email: string;
    profile: Record<string, unknown> | null;
    memberships: Array<{
      club: { id: string; name: string; code: string };
    }>;
  }) {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      profile: user.profile,
      clubs: user.memberships.map((m) => m.club),
    };
  }
}
