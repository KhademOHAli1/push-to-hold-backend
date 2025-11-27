import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DemocracyStatus } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

/**
 * DTO for company search and filtering.
 */
export class CompanyQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Search query for company name',
    example: 'Nestlé',
  })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({
    description: 'Filter by democracy status',
    enum: ['green', 'yellow', 'red'],
    example: 'green',
  })
  @IsOptional()
  @IsEnum(DemocracyStatus, { message: 'status must be green, yellow, or red' })
  status?: DemocracyStatus;

  @ApiPropertyOptional({
    description: 'Filter by country code (ISO 2-letter)',
    example: 'DE',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    description: 'Filter by sector',
    example: 'Food & Beverage',
  })
  @IsOptional()
  @IsString()
  sector?: string;
}
