import { Body, Controller, Get, Param, Put, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EmailTemplateType, Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EventEmailsService } from './event-emails.service';
import { UpdateTemplateDto } from './dto/update-template.dto';

@Controller('events/:id')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class EventEmailsController {
  constructor(private readonly service: EventEmailsService) {}

  @Get('email-templates')
  @Roles(Role.DISTRICT_SECRETARY, Role.PRESIDENT, Role.DISTRICT_RDR)
  async listTemplates(@Param('id') eventId: string) {
    await this.service.assertEventExists(eventId);
    return this.service.listTemplates(eventId);
  }

  @Put('email-templates/:type')
  @Roles(Role.DISTRICT_SECRETARY, Role.PRESIDENT, Role.DISTRICT_RDR)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async upsertTemplate(
    @Param('id') eventId: string,
    @Param('type') type: EmailTemplateType,
    @Body() dto: UpdateTemplateDto,
  ) {
    await this.service.assertEventExists(eventId);
    return this.service.upsertTemplate(eventId, type, dto);
  }

  @Get('email-logs')
  @Roles(Role.DISTRICT_SECRETARY, Role.PRESIDENT, Role.DISTRICT_RDR)
  async logs(@Param('id') eventId: string) {
    await this.service.assertEventExists(eventId);
    return this.service.listLogs(eventId);
  }
}
