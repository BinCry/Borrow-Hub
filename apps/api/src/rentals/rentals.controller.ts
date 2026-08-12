import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import {
  ApproveRentalDto,
  CancelRentalDto,
  ConfirmHandoverDto,
  CreateRentalRequestDto,
  DeclineRentalDto,
  RecordPaymentDto,
  RentalListQueryDto,
  ReportIssueDto,
  SignContractDto,
  StartHandoverDto,
} from './rentals.dto';
import { RentalsService } from './rentals.service';

@Controller('rentals')
export class RentalsController {
  constructor(private readonly rentalsService: RentalsService) {}

  @Get('my')
  listMine(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: RentalListQueryDto,
  ) {
    return this.rentalsService.listMine(currentUser, query);
  }

  @Post()
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateRentalRequestDto,
  ) {
    return this.rentalsService.create(currentUser, dto);
  }

  @Get(':rentalId')
  getById(
    @Param('rentalId') rentalId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.rentalsService.getById(rentalId, currentUser);
  }

  @Patch(':rentalId/approve')
  approve(
    @Param('rentalId') rentalId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: ApproveRentalDto,
  ) {
    return this.rentalsService.approve(rentalId, currentUser, dto);
  }

  @Patch(':rentalId/decline')
  decline(
    @Param('rentalId') rentalId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: DeclineRentalDto,
  ) {
    return this.rentalsService.decline(rentalId, currentUser, dto);
  }

  @Post(':rentalId/cancel')
  cancel(
    @Param('rentalId') rentalId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CancelRentalDto,
  ) {
    return this.rentalsService.cancel(rentalId, currentUser, dto);
  }

  @Post(':rentalId/pay')
  recordPayment(
    @Param('rentalId') rentalId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: RecordPaymentDto,
  ) {
    return this.rentalsService.recordPayment(rentalId, currentUser, dto);
  }

  @Post(':rentalId/sign')
  signContract(
    @Param('rentalId') rentalId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: SignContractDto,
  ) {
    return this.rentalsService.signContract(rentalId, currentUser, dto);
  }

  @Post(':rentalId/handover')
  startHandover(
    @Param('rentalId') rentalId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: StartHandoverDto,
  ) {
    return this.rentalsService.startHandover(rentalId, currentUser, dto);
  }

  @Post(':rentalId/handover/:handoverId/confirm')
  confirmHandover(
    @Param('rentalId') rentalId: string,
    @Param('handoverId') handoverId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: ConfirmHandoverDto,
  ) {
    return this.rentalsService.confirmHandover(
      rentalId,
      handoverId,
      currentUser,
      dto,
    );
  }

  @Post(':rentalId/return-request')
  requestReturn(
    @Param('rentalId') rentalId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.rentalsService.requestReturn(rentalId, currentUser);
  }

  @Post(':rentalId/report-issue')
  reportIssue(
    @Param('rentalId') rentalId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: ReportIssueDto,
  ) {
    return this.rentalsService.reportIssue(rentalId, currentUser, dto);
  }
}
