import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { CompaniesController } from '../src/modules/companies/companies.controller';
import { CompaniesService } from '../src/modules/companies/companies.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('CompaniesModule (e2e validation)', () => {
  let app: INestApplication;

  const prismaMock: Partial<PrismaService> = {
    company: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findUnique: jest.fn().mockResolvedValue(null),
    } as any,
    $transaction: jest.fn(async (promises: any[]) => Promise.all(promises)) as any,
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
        }),
      ],
      controllers: [CompaniesController],
      providers: [
        CompaniesService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects invalid status enum', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/companies')
      .query({ status: 'blue' });

    expect(res.status).toBe(400);
    expect(res.body.message).toEqual(
      expect.arrayContaining(['status must be green, yellow, or red']),
    );
  });

  it('rejects page below minimum', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/companies')
      .query({ page: 0 });

    expect(res.status).toBe(400);
    expect(res.body.message).toEqual(
      expect.arrayContaining(['page must not be less than 1']),
    );
  });

  it('rejects pageSize above maximum', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/companies')
      .query({ pageSize: 101 });

    expect(res.status).toBe(400);
    expect(res.body.message).toEqual(
      expect.arrayContaining(['pageSize must not be greater than 100']),
    );
  });
});
