import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePeriodDto } from './dto/create-period.dto';
import { UpdatePeriodDto } from './dto/update-period.dto';

@Injectable()
export class PeriodsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.districtPeriod.findMany({
      orderBy: { startDate: 'desc' },
    });
  }

  async findOne(id: string) {
    const period = await this.prisma.districtPeriod.findUnique({
      where: { id },
    });
    if (!period) throw new NotFoundException('Período no encontrado');
    return period;
  }

  async findCurrent() {
    return this.prisma.districtPeriod.findFirst({
      where: { isCurrent: true },
    });
  }

  async create(dto: CreatePeriodDto) {
    const data = {
      name: dto.name.trim(),
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      isCurrent: dto.isCurrent ?? false,
    };
    if (data.isCurrent) {
      await this.prisma.districtPeriod.updateMany({
        where: {},
        data: { isCurrent: false },
      });
    }
    return this.prisma.districtPeriod.create({ data });
  }

  async update(id: string, dto: UpdatePeriodDto) {
    await this.findOne(id);
    const data: Record<string, unknown> = {};
    if (dto.name != null) data.name = dto.name.trim();
    if (dto.startDate != null) data.startDate = new Date(dto.startDate);
    if (dto.endDate != null) data.endDate = new Date(dto.endDate);
    if (dto.isCurrent === true) {
      await this.prisma.districtPeriod.updateMany({
        where: {},
        data: { isCurrent: false },
      });
      data.isCurrent = true;
    } else if (dto.isCurrent === false) {
      data.isCurrent = false;
    }
    return this.prisma.districtPeriod.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.districtPeriod.delete({ where: { id } });
  }
}
