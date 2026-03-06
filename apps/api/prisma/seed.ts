/**
 * Convención de roles:
 * - SECRETARY = Secretaría (administración)
 * - PRESIDENT = Representante distrital (administración)
 * - Votantes = usuarios con MeetingParticipant.canVote en la reunión (típicamente presidentes de club, Membership.isPresident en un club)
 */
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('password123', 10);

  const distrito = await prisma.club.upsert({
    where: { code: 'DISTRITO-EJEMPLO' },
    update: {},
    create: {
      name: 'Distrito Ejemplo',
      code: 'DISTRITO-EJEMPLO',
    },
  });

  const clubAlpha = await prisma.club.upsert({
    where: { code: 'CLUB-ALPHA' },
    update: {},
    create: {
      name: 'Club Alpha',
      code: 'CLUB-ALPHA',
    },
  });

  const clubBeta = await prisma.club.upsert({
    where: { code: 'CLUB-BETA' },
    update: {},
    create: {
      name: 'Club Beta',
      code: 'CLUB-BETA',
    },
  });

  const secretaria = await prisma.user.upsert({
    where: { email: 'secretaria@mirotaract.org' },
    update: {},
    create: {
      fullName: 'Secretaría Distrital',
      email: 'secretaria@mirotaract.org',
      passwordHash: hash,
      role: Role.SECRETARY,
    },
  });

  const representante = await prisma.user.upsert({
    where: { email: 'representante@mirotaract.org' },
    update: {},
    create: {
      fullName: 'Representante Distrital',
      email: 'representante@mirotaract.org',
      passwordHash: hash,
      role: Role.PRESIDENT,
    },
  });

  const presidenteAlpha = await prisma.user.upsert({
    where: { email: 'presidente.alpha@mirotaract.org' },
    update: {},
    create: {
      fullName: 'Presidente Club Alpha',
      email: 'presidente.alpha@mirotaract.org',
      passwordHash: hash,
      role: Role.PARTICIPANT,
    },
  });

  const presidenteBeta = await prisma.user.upsert({
    where: { email: 'presidente.beta@mirotaract.org' },
    update: {},
    create: {
      fullName: 'Presidente Club Beta',
      email: 'presidente.beta@mirotaract.org',
      passwordHash: hash,
      role: Role.PARTICIPANT,
    },
  });

  await prisma.membership.upsert({
    where: { userId_clubId: { userId: secretaria.id, clubId: distrito.id } },
    update: {},
    create: {
      userId: secretaria.id,
      clubId: distrito.id,
      title: 'Secretaría',
      isPresident: false,
    },
  });

  await prisma.membership.upsert({
    where: { userId_clubId: { userId: representante.id, clubId: distrito.id } },
    update: {},
    create: {
      userId: representante.id,
      clubId: distrito.id,
      title: 'Representante distrital',
      isPresident: false,
    },
  });

  await prisma.membership.upsert({
    where: { userId_clubId: { userId: presidenteAlpha.id, clubId: clubAlpha.id } },
    update: {},
    create: {
      userId: presidenteAlpha.id,
      clubId: clubAlpha.id,
      title: 'Presidente',
      isPresident: true,
    },
  });

  await prisma.membership.upsert({
    where: { userId_clubId: { userId: presidenteBeta.id, clubId: clubBeta.id } },
    update: {},
    create: {
      userId: presidenteBeta.id,
      clubId: clubBeta.id,
      title: 'Presidente',
      isPresident: true,
    },
  });

  const meeting = await prisma.meeting.upsert({
    where: { id: 'seed-meeting-ejemplo' },
    update: {},
    create: {
      id: 'seed-meeting-ejemplo',
      title: 'Reunión distrital de ejemplo',
      description: 'Reunión creada por el seed para pruebas',
      status: 'SCHEDULED',
      scheduledAt: new Date(Date.now() + 86400000),
      createdById: representante.id,
      clubId: distrito.id,
    },
  });

  await prisma.meetingParticipant.upsert({
    where: {
      meetingId_userId: { meetingId: meeting.id, userId: presidenteAlpha.id },
    },
    update: {},
    create: {
      meetingId: meeting.id,
      userId: presidenteAlpha.id,
      canVote: true,
    },
  });

  await prisma.meetingParticipant.upsert({
    where: {
      meetingId_userId: { meetingId: meeting.id, userId: presidenteBeta.id },
    },
    update: {},
    create: {
      meetingId: meeting.id,
      userId: presidenteBeta.id,
      canVote: true,
    },
  });

  console.log(
    'Seed OK: distrito, Club Alpha, Club Beta; secretaria@, representante@, presidente.alpha@, presidente.beta@ (password: password123). Reunión de ejemplo con participantes que pueden votar.',
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
