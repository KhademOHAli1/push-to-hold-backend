import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CompanyQueryDto } from './dto/company-query.dto';
import { paginate } from '../../common/dto/pagination.dto';

/**
 * Service for managing company data and search operations.
 * Provides company listing, searching, and detailed company information.
 */
@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find all companies with optional filtering and pagination.
   * @param query - Query parameters for filtering and pagination
   * @returns Paginated list of companies matching the criteria
   */
  async findAll(query: CompanyQueryDto) {
    const { page = 1, pageSize = 20 } = query;
    
    const where: Record<string, unknown> = {};

    if (query.status) {
      where.democracyStatus = query.status;
    }
    
    if (query.country) {
      where.countryCode = query.country;
    }

    if (query.sector) {
      where.sector = {
        contains: query.sector,
        mode: 'insensitive',
      };
    }

    if (query.query) {
      where.OR = [
        { displayName: { contains: query.query, mode: 'insensitive' } },
        { officialName: { contains: query.query, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.company.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { displayName: 'asc' },
        select: {
          id: true,
          officialName: true,
          displayName: true,
          countryCode: true,
          sector: true,
          democracyStatus: true,
          democracyScore: true,
          lastReviewAt: true,
        },
      }),
      this.prisma.company.count({ where }),
    ]);

    return paginate(items, total, page, pageSize);
  }

  /**
   * Find a single company by ID with full details.
   * @param id - The company UUID
   * @returns Detailed company information including brands and pledge status
   * @throws NotFoundException if company doesn't exist
   */
  async findOne(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        brands: {
          select: {
            id: true,
            name: true,
          },
        },
        pledges: {
          where: { status: 'approved' },
          include: {
            pledge: {
              select: {
                version: true,
                title: true,
              },
            },
          },
          orderBy: { signedAt: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            follows: true,
          },
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const activePledge = company.pledges[0];

    return {
      id: company.id,
      officialName: company.officialName,
      displayName: company.displayName,
      countryCode: company.countryCode,
      sector: company.sector,
      sizeBracket: company.sizeBracket,
      websiteUrl: company.websiteUrl,
      democracyStatus: company.democracyStatus,
      democracyScore: company.democracyScore,
      statusReasonShort: company.statusReasonShort,
      lastReviewAt: company.lastReviewAt,
      brands: company.brands,
      pledge: activePledge
        ? {
            hasSigned: true,
            pledgeVersion: activePledge.pledge.version,
            signedAt: activePledge.signedAt,
          }
        : {
            hasSigned: false,
          },
      followersCount: company._count.follows,
    };
  }
}
