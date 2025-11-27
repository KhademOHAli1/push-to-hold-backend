import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Service for democracy index data: timelines, evidence, and open data exports.
 * Provides transparency data about company democracy status changes.
 */
@Injectable()
export class DemocracyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get the democracy timeline for a company.
   * Combines status changes, evidence items, and pledge signatures
   * into a chronological timeline.
   * 
   * @param companyId - The company UUID
   * @returns Timeline events sorted by date (newest first)
   * @throws NotFoundException if company doesn't exist
   */
  async getCompanyTimeline(companyId: string) {
    // Verify company exists
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Get status history
    const statuses = await this.prisma.companyStatusHistory.findMany({
      where: { companyId },
      orderBy: { changedAt: 'desc' },
      select: {
        id: true,
        previousStatus: true,
        newStatus: true,
        reasonMarkdown: true,
        changedAt: true,
      },
    });

    // Get public evidence
    const evidence = await this.prisma.companyEvidence.findMany({
      where: { 
        companyId, 
        isPublic: true 
      },
      orderBy: { sourceDate: 'desc' },
      select: {
        id: true,
        type: true,
        title: true,
        sourceUrl: true,
        sourceName: true,
        sourceDate: true,
        impact: true,
      },
    });

    // Get pledges
    const pledges = await this.prisma.companyPledge.findMany({
      where: { 
        companyId,
        status: 'approved',
      },
      include: {
        pledge: {
          select: {
            version: true,
            title: true,
          },
        },
      },
      orderBy: { signedAt: 'desc' },
    });

    // Combine into a unified timeline
    const events = [
      ...statuses.map((s) => ({
        type: 'status_change' as const,
        date: s.changedAt,
        details: `Status changed from ${s.previousStatus} to ${s.newStatus}`,
        data: s,
      })),
      ...evidence.map((e) => ({
        type: 'evidence' as const,
        date: e.sourceDate,
        details: e.title,
        data: e,
      })),
      ...pledges.map((p) => ({
        type: 'pledge' as const,
        date: p.signedAt,
        details: `Signed democracy pledge v${p.pledge.version}`,
        data: {
          pledgeVersion: p.pledge.version,
          pledgeTitle: p.pledge.title,
          signatoryName: p.signatoryName,
          signatoryRole: p.signatoryRole,
        },
      })),
    ].sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });

    return {
      companyId,
      events,
      statuses,
      evidence,
    };
  }

  /**
   * Get all companies for open data export.
   * Returns basic company info and democracy status for transparency.
   * 
   * @returns List of all companies with democracy data
   */
  async getOpenDataCompanies() {
    return this.prisma.company.findMany({
      select: {
        id: true,
        officialName: true,
        displayName: true,
        democracyStatus: true,
        democracyScore: true,
        countryCode: true,
        sector: true,
        lastReviewAt: true,
      },
      orderBy: { officialName: 'asc' },
    });
  }

  /**
   * Get evidence items for a company.
   * 
   * @param companyId - The company UUID
   * @param onlyPublic - If true, only return public evidence
   * @returns List of evidence items sorted by date
   */
  async getCompanyEvidence(companyId: string, onlyPublic: boolean = true) {
    const where: Record<string, unknown> = { companyId };
    if (onlyPublic) {
      where.isPublic = true;
    }

    return this.prisma.companyEvidence.findMany({
      where,
      orderBy: { sourceDate: 'desc' },
    });
  }
}
