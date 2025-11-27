import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { DemocracyService } from './democracy.service';

/**
 * Controller for democracy timeline, evidence, and open data endpoints.
 */
@ApiTags('Democracy')
@Controller()
export class DemocracyController {
  constructor(private readonly democracyService: DemocracyService) {}

  /**
   * Get a company's democracy timeline showing changes over time.
   */
  @Get('companies/:id/timeline')
  @ApiOperation({ 
    summary: 'Get company timeline', 
    description: 'Retrieve a chronological timeline of democracy score changes, pledges, and significant events for a company.' 
  })
  @ApiParam({ name: 'id', description: 'Company UUID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Company timeline retrieved' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async timeline(@Param('id') id: string) {
    return this.democracyService.getCompanyTimeline(id);
  }

  /**
   * Get documented evidence for a company's democracy score.
   */
  @Get('companies/:id/evidence')
  @ApiOperation({ 
    summary: 'Get company evidence', 
    description: 'Retrieve all evidence items that support the company\'s democracy score including public statements, actions, and verified data.' 
  })
  @ApiParam({ name: 'id', description: 'Company UUID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Company evidence retrieved' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async evidence(@Param('id') id: string) {
    return this.democracyService.getCompanyEvidence(id);
  }

  /**
   * Get open data export of all companies (for transparency).
   */
  @Get('open-data/companies')
  @ApiOperation({ 
    summary: 'Open data export', 
    description: 'Retrieve an open data export of all companies and their democracy scores for transparency and third-party verification.' 
  })
  @ApiResponse({ status: 200, description: 'Open data export retrieved' })
  async openDataCompanies() {
    return this.democracyService.getOpenDataCompanies();
  }
}
