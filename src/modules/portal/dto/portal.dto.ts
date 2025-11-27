import { IsString, IsOptional, IsUUID, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a company claim request.
 */
export class CreateClaimDto {
  @ApiProperty({
    description: 'The company ID to claim',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  companyId: string;

  @ApiProperty({
    description: 'Type of proof for the claim',
    example: 'domain_email',
    enum: ['domain_email', 'document', 'manual'],
  })
  @IsString()
  proofType: string;

  @ApiPropertyOptional({
    description: 'Proof value (e.g., company email address)',
    example: 'representative@company.de',
  })
  @IsOptional()
  @IsString()
  proofValue?: string;
}

/**
 * DTO for signing a democracy pledge.
 */
export class SignPledgeDto {
  @ApiProperty({
    description: 'The pledge ID to sign',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  pledgeId: string;

  @ApiProperty({
    description: 'Name of the person signing',
    example: 'Dr. Maria Schmidt',
  })
  @IsString()
  signatoryName: string;

  @ApiProperty({
    description: 'Role/title of the signatory',
    example: 'Geschäftsführerin',
  })
  @IsString()
  signatoryRole: string;

  @ApiProperty({
    description: 'Date when the pledge was signed',
    example: '2025-01-15T10:00:00Z',
  })
  @IsDateString()
  signedAt: string;

  @ApiPropertyOptional({
    description: 'URL to the signed pledge document (PDF)',
    example: 'https://example.com/pledge-signed.pdf',
  })
  @IsOptional()
  @IsString()
  pledgeDocUrl?: string;
}

/**
 * DTO for answering a company question.
 */
export class AnswerQuestionDto {
  @ApiProperty({
    description: 'Answer in Markdown format',
    example: 'We do not cooperate with any extremist organizations...',
  })
  @IsString()
  answerMarkdown: string;
}

/**
 * DTO for submitting a correction request.
 */
export class SubmitCorrectionDto {
  @ApiProperty({
    description: 'Subject of the correction request',
    example: 'Incorrect association membership claim',
  })
  @IsString()
  subject: string;

  @ApiProperty({
    description: 'Description of the correction in Markdown',
    example: 'We have left Association X as of 2024-12-01. See attached proof.',
  })
  @IsString()
  descriptionMarkdown: string;

  @ApiPropertyOptional({
    description: 'IDs of related evidence items',
    type: [String],
    example: ['123e4567-e89b-12d3-a456-426614174000'],
  })
  @IsOptional()
  @IsUUID('4', { each: true })
  relatedEvidenceIds?: string[];
}
