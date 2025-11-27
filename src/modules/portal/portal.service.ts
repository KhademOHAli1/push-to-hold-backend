import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClaimDto, SignPledgeDto, AnswerQuestionDto, SubmitCorrectionDto } from './dto/portal.dto';

/**
 * Service for the company portal.
 * Handles company claims, pledge signing, question answering, and corrections.
 * All operations require verified company membership.
 */
@Injectable()
export class PortalService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // COMPANY CLAIMS
  // ============================================

  async createClaim(userId: string, dto: CreateClaimDto) {
    // Check if company exists
    const company = await this.prisma.company.findUnique({
      where: { id: dto.companyId },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Check if user already has a pending claim for this company
    const existingClaim = await this.prisma.companyClaim.findFirst({
      where: {
        userId,
        companyId: dto.companyId,
        status: 'pending',
      },
    });

    if (existingClaim) {
      throw new BadRequestException('You already have a pending claim for this company');
    }

    return this.prisma.companyClaim.create({
      data: {
        userId,
        companyId: dto.companyId,
        proofType: dto.proofType,
        proofValue: dto.proofValue,
      },
    });
  }

  async getUserClaims(userId: string) {
    return this.prisma.companyClaim.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ============================================
  // COMPANY ACCESS (for verified reps)
  // ============================================

  async getUserCompanies(userId: string) {
    const memberships = await this.prisma.companyMembership.findMany({
      where: { 
        userId,
        isVerified: true,
      },
      include: {
        company: {
          select: {
            id: true,
            displayName: true,
            officialName: true,
            democracyStatus: true,
            democracyScore: true,
          },
        },
      },
    });

    return memberships.map((m) => ({
      ...m.company,
      membershipRole: m.role,
    }));
  }

  async getCompanyPortalData(userId: string, companyId: string) {
    // Verify user has access to this company
    await this.verifyCompanyAccess(userId, companyId);

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        pledges: {
          include: {
            pledge: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        questions: {
          where: { status: 'pending' },
          orderBy: { aggregatedCount: 'desc' },
        },
        corrections: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            scans: true,
            follows: true,
          },
        },
      },
    });

    return company;
  }

  // ============================================
  // PLEDGE SIGNING
  // ============================================

  async getActivePledges() {
    return this.prisma.pledge.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async signPledge(userId: string, companyId: string, dto: SignPledgeDto) {
    await this.verifyCompanyAccess(userId, companyId);

    // Check if pledge exists
    const pledge = await this.prisma.pledge.findUnique({
      where: { id: dto.pledgeId },
    });

    if (!pledge || !pledge.isActive) {
      throw new NotFoundException('Pledge not found or not active');
    }

    // Check if company already signed this pledge
    const existingPledge = await this.prisma.companyPledge.findFirst({
      where: {
        companyId,
        pledgeId: dto.pledgeId,
        status: { in: ['pending_review', 'approved'] },
      },
    });

    if (existingPledge) {
      throw new BadRequestException('Company has already signed or is pending review for this pledge');
    }

    return this.prisma.companyPledge.create({
      data: {
        companyId,
        pledgeId: dto.pledgeId,
        signatoryName: dto.signatoryName,
        signatoryRole: dto.signatoryRole,
        signedAt: new Date(dto.signedAt),
        pledgeDocUrl: dto.pledgeDocUrl,
        createdByUserId: userId,
        status: 'pending_review',
      },
    });
  }

  // ============================================
  // QUESTIONS
  // ============================================

  async getCompanyQuestions(userId: string, companyId: string, status?: string) {
    await this.verifyCompanyAccess(userId, companyId);

    const where: any = { companyId };
    if (status) {
      where.status = status;
    }

    return this.prisma.companyQuestion.findMany({
      where,
      include: {
        template: true,
      },
      orderBy: [
        { status: 'asc' },
        { aggregatedCount: 'desc' },
      ],
    });
  }

  async answerQuestion(userId: string, companyId: string, questionId: string, dto: AnswerQuestionDto) {
    await this.verifyCompanyAccess(userId, companyId);

    const question = await this.prisma.companyQuestion.findFirst({
      where: {
        id: questionId,
        companyId,
      },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    return this.prisma.companyQuestion.update({
      where: { id: questionId },
      data: {
        answerMarkdown: dto.answerMarkdown,
        answeredByUserId: userId,
        status: 'answered',
      },
    });
  }

  // ============================================
  // CORRECTIONS
  // ============================================

  async submitCorrection(userId: string, companyId: string, dto: SubmitCorrectionDto) {
    await this.verifyCompanyAccess(userId, companyId);

    return this.prisma.companyCorrectionRequest.create({
      data: {
        companyId,
        submittedByUserId: userId,
        subject: dto.subject,
        descriptionMarkdown: dto.descriptionMarkdown,
        relatedEvidenceIds: dto.relatedEvidenceIds ?? [],
        status: 'open',
      },
    });
  }

  async getCompanyCorrections(userId: string, companyId: string) {
    await this.verifyCompanyAccess(userId, companyId);

    return this.prisma.companyCorrectionRequest.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ============================================
  // HELPERS
  // ============================================

  private async verifyCompanyAccess(userId: string, companyId: string) {
    const membership = await this.prisma.companyMembership.findFirst({
      where: {
        userId,
        companyId,
        isVerified: true,
      },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this company');
    }

    return membership;
  }
}
