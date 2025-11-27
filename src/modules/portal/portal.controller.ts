import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PortalService } from './portal.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CreateClaimDto, SignPledgeDto, AnswerQuestionDto, SubmitCorrectionDto } from './dto/portal.dto';

/**
 * Controller for company representative portal.
 * Provides self-service endpoints for company representatives to manage their company's democracy profile.
 */
@ApiTags('Portal')
@ApiBearerAuth()
@Controller('portal')
@UseGuards(JwtAuthGuard)
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  // ============================================
  // CLAIMS
  // ============================================

  /**
   * Create a new company claim request.
   */
  @Post('claims')
  @ApiOperation({ 
    summary: 'Claim a company', 
    description: 'Submit a request to be recognized as an authorized representative of a company.' 
  })
  @ApiResponse({ status: 201, description: 'Claim request submitted' })
  @ApiResponse({ status: 400, description: 'Invalid claim data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createClaim(@CurrentUser() user: JwtPayload, @Body() dto: CreateClaimDto) {
    return this.portalService.createClaim(user.sub, dto);
  }

  /**
   * Get all claims made by the current user.
   */
  @Get('claims')
  @ApiOperation({ 
    summary: 'Get my claims', 
    description: 'Retrieve all company claim requests made by the authenticated user.' 
  })
  @ApiResponse({ status: 200, description: 'List of claims retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getClaims(@CurrentUser() user: JwtPayload) {
    return this.portalService.getUserClaims(user.sub);
  }

  // ============================================
  // MY COMPANIES
  // ============================================

  /**
   * Get companies the user is authorized to manage.
   */
  @Get('companies')
  @ApiOperation({ 
    summary: 'Get my companies', 
    description: 'Retrieve all companies where the authenticated user is an authorized representative.' 
  })
  @ApiResponse({ status: 200, description: 'List of companies retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyCompanies(@CurrentUser() user: JwtPayload) {
    return this.portalService.getUserCompanies(user.sub);
  }

  /**
   * Get portal dashboard for a specific company.
   */
  @Get('companies/:companyId')
  @ApiOperation({ 
    summary: 'Get company portal data', 
    description: 'Retrieve comprehensive portal data for managing a specific company including pledges, questions, and score details.' 
  })
  @ApiParam({ name: 'companyId', description: 'Company UUID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Company portal data retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not authorized to manage this company' })
  async getCompanyPortal(@CurrentUser() user: JwtPayload, @Param('companyId') companyId: string) {
    return this.portalService.getCompanyPortalData(user.sub, companyId);
  }

  // ============================================
  // PLEDGES
  // ============================================

  /**
   * Get all active pledges available for signing.
   */
  @Get('pledges/active')
  @ApiOperation({ 
    summary: 'Get active pledges', 
    description: 'Retrieve all currently active democracy pledges that companies can sign.' 
  })
  @ApiResponse({ status: 200, description: 'List of active pledges retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getActivePledges() {
    return this.portalService.getActivePledges();
  }

  /**
   * Sign a pledge on behalf of a company.
   */
  @Post('companies/:companyId/pledges')
  @ApiOperation({ 
    summary: 'Sign a pledge', 
    description: 'Sign a democracy pledge on behalf of the company. This is a public commitment that affects the company\'s democracy score.' 
  })
  @ApiParam({ name: 'companyId', description: 'Company UUID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 201, description: 'Pledge signed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid pledge data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not authorized to manage this company' })
  async signPledge(
    @CurrentUser() user: JwtPayload,
    @Param('companyId') companyId: string,
    @Body() dto: SignPledgeDto,
  ) {
    return this.portalService.signPledge(user.sub, companyId, dto);
  }

  // ============================================
  // QUESTIONS
  // ============================================

  /**
   * Get questions directed to the company.
   */
  @Get('companies/:companyId/questions')
  @ApiOperation({ 
    summary: 'Get company questions', 
    description: 'Retrieve questions submitted to the company by consumers or moderators.' 
  })
  @ApiParam({ name: 'companyId', description: 'Company UUID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by question status (pending, answered, rejected)' })
  @ApiResponse({ status: 200, description: 'List of questions retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not authorized to manage this company' })
  async getQuestions(
    @CurrentUser() user: JwtPayload,
    @Param('companyId') companyId: string,
    @Query('status') status?: string,
  ) {
    return this.portalService.getCompanyQuestions(user.sub, companyId, status);
  }

  /**
   * Answer a question directed to the company.
   */
  @Post('companies/:companyId/questions/:questionId/answer')
  @ApiOperation({ 
    summary: 'Answer a question', 
    description: 'Submit an official company response to a consumer or moderator question.' 
  })
  @ApiParam({ name: 'companyId', description: 'Company UUID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiParam({ name: 'questionId', description: 'Question UUID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Question answered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid answer data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not authorized to manage this company' })
  async answerQuestion(
    @CurrentUser() user: JwtPayload,
    @Param('companyId') companyId: string,
    @Param('questionId') questionId: string,
    @Body() dto: AnswerQuestionDto,
  ) {
    return this.portalService.answerQuestion(user.sub, companyId, questionId, dto);
  }

  // ============================================
  // CORRECTIONS
  // ============================================

  /**
   * Submit a correction request for company data.
   */
  @Post('companies/:companyId/corrections')
  @ApiOperation({ 
    summary: 'Submit a correction', 
    description: 'Request a correction to inaccurate company data or evidence. Requires supporting documentation.' 
  })
  @ApiParam({ name: 'companyId', description: 'Company UUID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 201, description: 'Correction submitted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid correction data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not authorized to manage this company' })
  async submitCorrection(
    @CurrentUser() user: JwtPayload,
    @Param('companyId') companyId: string,
    @Body() dto: SubmitCorrectionDto,
  ) {
    return this.portalService.submitCorrection(user.sub, companyId, dto);
  }

  /**
   * Get all correction requests for a company.
   */
  @Get('companies/:companyId/corrections')
  @ApiOperation({ 
    summary: 'Get company corrections', 
    description: 'Retrieve all correction requests submitted for the company and their review status.' 
  })
  @ApiParam({ name: 'companyId', description: 'Company UUID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'List of corrections retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not authorized to manage this company' })
  async getCorrections(
    @CurrentUser() user: JwtPayload,
    @Param('companyId') companyId: string,
  ) {
    return this.portalService.getCompanyCorrections(user.sub, companyId);
  }
}
