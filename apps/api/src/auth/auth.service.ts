import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ClubMembersService } from '../club-members/club-members.service';
import { EmailService } from './email.service';
import { UsersService } from '../users/users.service';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
  private static readonly RESET_TOKEN_EXPIRY_HOURS = 1;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
    private readonly clubMembersService: ClubMembersService,
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    return ok ? user : null;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    if (!user) {
      await this.auditService.log({
        entityType: 'auth',
        action: 'auth.login.failed',
        metadata: { attemptedEmail: email },
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }
    await this.auditService.log({
      entityType: 'auth',
      action: 'auth.login.success',
      actorUserId: user.id,
      entityId: user.id,
    });
    const payload = { sub: user.id, email: user.email, role: user.role };
    const access_token = this.jwtService.sign(payload);
    return {
      access_token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    };
  }

  async register(fullName: string, email: string, password: string) {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.usersService.create({
      fullName,
      email,
      passwordHash,
      role: Role.PARTICIPANT,
    });
    await this.clubMembersService.linkMembersToUser(user.id, user.email);
    await this.auditService.log({
      entityType: 'auth',
      action: 'auth.register.success',
      actorUserId: user.id,
      entityId: user.id,
    });
    const payload = { sub: user.id, email: user.email, role: user.role };
    const access_token = this.jwtService.sign(payload);
    return {
      access_token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    };
  }

  async getMe(userId: string) {
    const now = new Date();
    const user = await this.prisma.user.findUnique({
      where: { id: userId, isActive: true },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        memberships: {
          where: {
            OR: [{ activeUntil: null }, { activeUntil: { gt: now } }],
          },
          select: {
            clubId: true,
            title: true,
            isPresident: true,
            club: {
              select: { id: true, name: true, code: true },
            },
          },
        },
      },
    });
    if (!user) throw new UnauthorizedException();
    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        memberships: user.memberships.map((m) => ({
          clubId: m.clubId,
          clubName: m.club.name,
          clubCode: m.club.code,
          title: m.title,
          isPresident: m.isPresident,
        })),
      },
    };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail, isActive: true },
    });
    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = await bcrypt.hash(rawToken, 10);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + AuthService.RESET_TOKEN_EXPIRY_HOURS);
      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });
      await this.emailService.sendPasswordResetEmail(user.email, rawToken);
      await this.auditService.log({
        entityType: 'auth',
        action: 'auth.password.reset.requested',
        actorUserId: user.id,
        entityId: user.id,
      });
    }
    return {
      message:
        'Si el correo existe en el sistema, recibirás instrucciones para restablecer tu contraseña.',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const tokens = await this.prisma.passwordResetToken.findMany({
      where: { usedAt: null, expiresAt: { gt: new Date() } },
      include: { user: true },
    });
    let validToken = null;
    for (const t of tokens) {
      if (await bcrypt.compare(token, t.tokenHash)) {
        validToken = t;
        break;
      }
    }
    if (!validToken) {
      await this.auditService.log({
        entityType: 'auth',
        action: 'auth.password.reset.failed',
        metadata: { reason: 'invalid_or_expired_token' },
      });
      throw new BadRequestException('El enlace de restablecimiento no es válido o ha expirado.');
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: validToken.userId },
        data: { passwordHash },
      });
      await tx.passwordResetToken.update({
        where: { id: validToken.id },
        data: { usedAt: new Date() },
      });
    });
    await this.auditService.log({
      entityType: 'auth',
      action: 'auth.password.reset.success',
      actorUserId: validToken.userId,
      entityId: validToken.userId,
    });
    return { message: 'Contraseña restablecida correctamente. Ya podés iniciar sesión.' };
  }

  async updateMe(
    userId: string,
    data: { fullName?: string; email?: string },
  ) {
    const user = await this.usersService.updateMe(userId, data);
    const shouldSync = data.fullName !== undefined || data.email !== undefined;
    if (shouldSync) {
      await this.clubMembersService.syncMemberDataFromUser(
        userId,
        user.fullName,
        user.email,
      );
    }
    await this.auditService.log({
      entityType: 'auth',
      action: 'auth.profile.updated',
      actorUserId: userId,
      entityId: userId,
      metadata: {
        fields: Object.keys(data).filter((k) => data[k as keyof typeof data] !== undefined),
      },
    });
    return { user };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, isActive: true },
    });
    if (!user) throw new UnauthorizedException();
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      await this.auditService.log({
        entityType: 'auth',
        action: 'auth.password.change.failed',
        actorUserId: userId,
        entityId: userId,
        metadata: { reason: 'wrong_current_password' },
      });
      throw new UnauthorizedException('Contraseña actual incorrecta');
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    await this.auditService.log({
      entityType: 'auth',
      action: 'auth.password.changed',
      actorUserId: userId,
      entityId: userId,
    });
    return { message: 'Contraseña actualizada correctamente.' };
  }
}
