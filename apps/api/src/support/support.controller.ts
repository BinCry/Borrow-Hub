import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import {
  AddSupportTicketNoteDto,
  AssignSupportTicketDto,
  CreateSupportTicketDto,
  SupportTicketQueryDto,
  UpdateSupportTicketStatusDto,
} from './support.dto';
import { SupportService } from './support.service';

@Controller('support/tickets')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get()
  list(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: SupportTicketQueryDto,
  ) {
    return this.supportService.list(currentUser, query);
  }

  @Post()
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateSupportTicketDto,
  ) {
    return this.supportService.create(currentUser, dto);
  }

  @Get(':ticketId')
  getById(
    @Param('ticketId') ticketId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.supportService.getById(ticketId, currentUser);
  }

  @Patch(':ticketId/assign')
  assign(
    @Param('ticketId') ticketId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: AssignSupportTicketDto,
  ) {
    return this.supportService.assign(ticketId, currentUser, dto);
  }

  @Patch(':ticketId/status')
  updateStatus(
    @Param('ticketId') ticketId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: UpdateSupportTicketStatusDto,
  ) {
    return this.supportService.updateStatus(ticketId, currentUser, dto);
  }

  @Post(':ticketId/notes')
  addNote(
    @Param('ticketId') ticketId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: AddSupportTicketNoteDto,
  ) {
    return this.supportService.addNote(ticketId, currentUser, dto);
  }
}
