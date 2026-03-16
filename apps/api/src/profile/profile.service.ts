import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AttachmentsService } from '../attachments/attachments.service';
import { UpsertProfileDto } from './dto/upsert-profile.dto';
import { UpdateVisibilityDto } from './dto/update-visibility.dto';

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly attachments: AttachmentsService,
  ) {}

  async getMyProfile(userId: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });
    if (profile) return profile;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, email: true },
    });
    if (!user) return null;

    return {
      id: null,
      userId: user.id,
      photoUrl: null,
      profession: null,
      bio: null,
      city: null,
      linkedInUrl: null,
      skills: [],
      interests: [],
      experienceJson: null,
      availability: null,
      contactEmailPublic: false,
      talentVisible: false,
      createdAt: null,
      updatedAt: null,
    };
  }

  async upsertProfile(userId: string, dto: UpsertProfileDto) {
    const data = {
      profession: dto.profession ?? undefined,
      bio: dto.bio ?? undefined,
      city: dto.city ?? undefined,
      linkedInUrl: dto.linkedInUrl ?? undefined,
      skills: dto.skills ?? [],
      interests: dto.interests ?? [],
      experienceJson: dto.experienceJson ?? undefined,
      availability: dto.availability ?? undefined,
      contactEmailPublic: dto.contactEmailPublic ?? false,
      talentVisible: dto.talentVisible ?? false,
    };

    const profile = await this.prisma.userProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });

    await this.audit.log({
      actorUserId: userId,
      action: 'profile.upserted',
      entityType: 'UserProfile',
      entityId: profile.id,
      metadata: { userId },
    });

    return profile;
  }

  async updateVisibility(userId: string, dto: UpdateVisibilityDto) {
    const previous = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    const profile = await this.prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        talentVisible: dto.talentVisible,
      },
      update: { talentVisible: dto.talentVisible },
    });

    if (previous && previous.talentVisible !== dto.talentVisible) {
      await this.audit.log({
        actorUserId: userId,
        action: 'profile.talentVisible.changed',
        entityType: 'UserProfile',
        entityId: profile.id,
        metadata: {
          from: previous.talentVisible,
          to: dto.talentVisible,
        },
      });
    }

    return profile;
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    await this.attachments.upload(
      'user_avatar',
      userId,
      file,
      userId,
      { actorUserId: userId },
    );
    const photoUrl = `/profile/avatar/${userId}`;
    await this.prisma.userProfile.upsert({
      where: { userId },
      create: { userId, photoUrl },
      update: { photoUrl },
    });
    await this.audit.log({
      actorUserId: userId,
      action: 'profile.avatar.uploaded',
      entityType: 'UserProfile',
      entityId: userId,
      metadata: { userId },
    });
    return { photoUrl };
  }
}
