import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { PortalModule } from '../src/modules/portal/portal.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PrismaModule } from '../src/prisma/prisma.module';

describe('PortalModule (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  const companyId = '550e8400-e29b-41d4-a716-446655440000';
  const pledgeId = '550e8400-e29b-41d4-a716-446655440001';
  const questionId = '550e8400-e29b-41d4-a716-446655440002';

  const portalPrismaMock: Partial<PrismaService> = {
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(null),
    } as any,
    company: {
      findUnique: jest.fn(async ({ where }) => {
        if (where.id === companyId) {
          return {
            id: companyId,
            displayName: 'Company 1',
            officialName: 'Company 1',
            democracyStatus: 'green',
            democracyScore: 80,
            pledges: [
              {
                id: 'company-pledge-1',
                companyId,
                pledgeId,
                status: 'approved',
                signedAt: new Date('2024-01-01'),
                pledge: { id: pledgeId, version: '1.0', title: 'Democracy Pledge' },
              },
            ],
            questions: [
              {
                id: questionId,
                companyId,
                templateId: null,
                questionText: 'What is your stance?',
                status: 'pending',
                aggregatedCount: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ],
            corrections: [],
            _count: { scans: 0, follows: 0 },
          };
        }
        return null;
      }),
    } as any,
    companyMembership: {
      findFirst: jest.fn(async ({ where }) => {
        if (
          where.userId === 'user-1' &&
          where.companyId === companyId &&
          where.isVerified === true
        ) {
          return {
            id: 'membership-1',
            userId: 'user-1',
            companyId,
            isVerified: true,
            role: 'rep',
          };
        }
        return null;
      }),
      findMany: jest.fn(async ({ where }) => {
        if (where?.userId === 'user-1' && where?.isVerified === true) {
          return [
            {
              id: 'membership-1',
              userId: 'user-1',
              companyId,
              role: 'rep',
              isVerified: true,
              company: {
                id: companyId,
                displayName: 'Company 1',
                officialName: 'Company 1',
                democracyStatus: 'green',
                democracyScore: 80,
              },
            },
          ];
        }
        return [];
      }),
    } as any,
    companyClaim: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(async ({ data }) => ({ id: 'claim-1', ...data })),
    } as any,
    pledge: {
      findUnique: jest.fn(async ({ where }) =>
        where.id === pledgeId ? { id: pledgeId, isActive: true, version: '1.0' } : null,
      ),
    } as any,
    companyPledge: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(async ({ data }) => ({ id: 'company-pledge-1', ...data })),
    } as any,
    companyQuestion: {
      findMany: jest.fn(async ({ where }) => [
        {
          id: 'question-1',
          companyId: where.companyId,
          templateId: null,
          questionText: 'What is your stance?',
          status: 'pending',
          answerMarkdown: null,
          aggregatedCount: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
      findFirst: jest.fn(async ({ where }) => {
        if (where.id === questionId && where.companyId === companyId) {
          return { id: questionId, companyId };
        }
        return null;
      }),
      update: jest.fn(async ({ where, data }) => ({
        id: where.id,
        companyId,
        ...data,
      })),
    } as any,
    companyCorrectionRequest: {
      create: jest.fn(async ({ data }) => ({ id: 'correction-1', ...data })),
      findMany: jest.fn(async ({ where }) => [
        {
          id: 'correction-1',
          companyId: where.companyId,
          status: 'open',
          subject: 'Subject',
          descriptionMarkdown: 'Desc',
          submittedByUserId: 'user-1',
          relatedEvidenceIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
    } as any,
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret-value-that-is-long-enough-to-be-safe';

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
        }),
        PrismaModule,
        PortalModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(portalPrismaMock)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await app.init();

    jwtService = new JwtService({ secret: process.env.JWT_SECRET });
  });

  afterAll(async () => {
    await app.close();
  });

  const tokenFor = (sub: string) => jwtService.sign({ sub, email: `${sub}@example.com`, role: 'rep' });

  it('denies access when user is not a verified member', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/portal/companies/${companyId}`)
      .set('Authorization', `Bearer ${tokenFor('user-2')}`);

    expect(res.status).toBe(403);
  });

  it('creates a claim when user is verified', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/portal/claims')
      .set('Authorization', `Bearer ${tokenFor('user-1')}`)
      .send({ companyId, proofType: 'domain_email', proofValue: 'rep@company.com' });

    if (res.status !== 201) {
      // Helpful when adjusting mocks/validation
      // eslint-disable-next-line no-console
      console.log('createClaim response', res.status, res.body);
    }
    expect(res.status).toBe(201);
    expect(res.body.id).toBe('claim-1');
  });

  it('signs a pledge for a verified company member', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/portal/companies/${companyId}/pledges`)
      .set('Authorization', `Bearer ${tokenFor('user-1')}`)
      .send({
        pledgeId,
        signatoryName: 'Rep One',
        signatoryRole: 'CEO',
        signedAt: new Date().toISOString(),
      });

    if (res.status !== 201) {
      // eslint-disable-next-line no-console
      console.log('signPledge response', res.status, res.body);
    }
    expect(res.status).toBe(201);
    expect(res.body.id).toBe('company-pledge-1');
  });

  it('answers a question for a verified company member', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/portal/companies/${companyId}/questions/${questionId}/answer`)
      .set('Authorization', `Bearer ${tokenFor('user-1')}`)
      .send({ answerMarkdown: 'Our answer' });

    expect(res.status).toBe(201);
    expect(res.body.answerMarkdown).toBe('Our answer');
  });

  it('submits a correction for a verified company member', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/portal/companies/${companyId}/corrections`)
      .set('Authorization', `Bearer ${tokenFor('user-1')}`)
      .send({ subject: 'Subject', descriptionMarkdown: 'Desc' });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe('correction-1');
  });
});
