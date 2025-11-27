import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { CompanyQueryDto } from './dto/company-query.dto';

/**
 * Controller for company search and details.
 */
@ApiTags('Companies')
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  /**
   * List and search companies.
   */
  @Get()
  @ApiOperation({ 
    summary: 'List companies', 
    description: 'Retrieve a paginated list of companies with optional filters for search, industry, score, and region.' 
  })
  @ApiResponse({ status: 200, description: 'List of companies retrieved' })
  async list(@Query() query: CompanyQueryDto) {
    return this.companiesService.findAll(query);
  }

  /**
   * Get detailed company information.
   */
  @Get(':id')
  @ApiOperation({ 
    summary: 'Get company details', 
    description: 'Retrieve detailed information about a specific company including democracy score, pledges, and evidence.' 
  })
  @ApiParam({ name: 'id', description: 'Company UUID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: 200, description: 'Company details retrieved' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async detail(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }
}
