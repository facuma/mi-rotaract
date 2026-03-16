/**
 * Convención de roles:
 * - SECRETARY = Secretaría (administración)
 * - PRESIDENT = Representante distrital (administración)
 * - Votantes = usuarios con MeetingParticipant.canVote en la reunión (típicamente presidentes de club, Membership.isPresident en un club)
 */
import { PrismaClient, Role, ReportType, ReportStatus, CommitteeStatus, MemberStatus } from '@prisma/client';
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
    update: {
      presidentEmail: 'presidente.alpha@mirotaract.org',
      enabledForDistrictMeetings: true,
    },
    create: {
      name: 'Club Alpha',
      code: 'CLUB-ALPHA',
      presidentEmail: 'presidente.alpha@mirotaract.org',
      enabledForDistrictMeetings: true,
    },
  });

  const clubBeta = await prisma.club.upsert({
    where: { code: 'CLUB-BETA' },
    update: {
      presidentEmail: 'presidente.beta@mirotaract.org',
      enabledForDistrictMeetings: true,
    },
    create: {
      name: 'Club Beta',
      code: 'CLUB-BETA',
      presidentEmail: 'presidente.beta@mirotaract.org',
      enabledForDistrictMeetings: true,
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

  const startPeriod = new Date();
  startPeriod.setMonth(startPeriod.getMonth() - 2);
  const endPeriod = new Date();
  endPeriod.setMonth(endPeriod.getMonth() + 4);
  const period = await prisma.districtPeriod.upsert({
    where: { id: 'seed-period-1' },
    update: {},
    create: {
      id: 'seed-period-1',
      name: 'Período 2024-2025',
      startDate: startPeriod,
      endDate: endPeriod,
      isCurrent: true,
    },
  });

  await prisma.report.upsert({
    where: {
      clubId_districtPeriodId_type: {
        clubId: clubAlpha.id,
        districtPeriodId: period.id,
        type: ReportType.MENSUAL,
      },
    },
    update: {},
    create: {
      clubId: clubAlpha.id,
      districtPeriodId: period.id,
      type: ReportType.MENSUAL,
      status: ReportStatus.SUBMITTED,
      submittedAt: new Date(),
    },
  });

  const comite = await prisma.committee.upsert({
    where: { id: 'seed-committee-1' },
    update: {},
    create: {
      id: 'seed-committee-1',
      name: 'Comité de Comunicación',
      description: 'Comité de ejemplo',
      coordinatorId: secretaria.id,
      status: CommitteeStatus.ACTIVE,
      districtPeriodId: period.id,
    },
  });

  await prisma.committeeObjective.upsert({
    where: { id: 'seed-obj-1' },
    update: {},
    create: {
      id: 'seed-obj-1',
      committeeId: comite.id,
      title: 'Objetivo de ejemplo',
      description: 'Descripción del objetivo',
      order: 0,
    },
  });

  // Members (Mis Socios) - Club Alpha
  const [presidenteAlphaFirst, presidenteAlphaLast] = presidenteAlpha.fullName.split(' ', 2);
  await prisma.member.upsert({
    where: { clubId_email: { clubId: clubAlpha.id, email: presidenteAlpha.email } },
    update: {},
    create: {
      clubId: clubAlpha.id,
      userId: presidenteAlpha.id,
      firstName: presidenteAlphaFirst,
      lastName: presidenteAlphaLast || presidenteAlphaFirst,
      email: presidenteAlpha.email,
      status: MemberStatus.ACTIVE,
      title: 'Presidente',
      isPresident: true,
      joinedAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.member.upsert({
    where: { clubId_email: { clubId: clubAlpha.id, email: 'socio.nuevo@example.com' } },
    update: {},
    create: {
      clubId: clubAlpha.id,
      firstName: 'Socio',
      lastName: 'Nuevo',
      email: 'socio.nuevo@example.com',
      status: MemberStatus.PENDIENTE,
      joinedAt: new Date(),
    },
  });

  // Members - Club Beta
  const [presidenteBetaFirst, presidenteBetaLast] = presidenteBeta.fullName.split(' ', 2);
  await prisma.member.upsert({
    where: { clubId_email: { clubId: clubBeta.id, email: presidenteBeta.email } },
    update: {},
    create: {
      clubId: clubBeta.id,
      userId: presidenteBeta.id,
      firstName: presidenteBetaFirst,
      lastName: presidenteBetaLast || presidenteBetaFirst,
      email: presidenteBeta.email,
      status: MemberStatus.ACTIVE,
      title: 'Presidente',
      isPresident: true,
      joinedAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
    },
  });

  console.log(
    'Seed OK: distrito, Club Alpha, Club Beta; secretaria@, representante@, presidente.alpha@, presidente.beta@ (password: password123). Reunión de ejemplo. Período distrital e informe de ejemplo. Comité de ejemplo.',
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
