import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../src/modules/auth/auth.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PrismaModule } from '../src/prisma/prisma.module';

describe('AuthModule (e2e)', () => {
  let app: INestApplication;
  const users = new Map<string, any>();

  const prismaMock: Partial<PrismaService> = {
    user: {
      findUnique: jest.fn(async ({ where }) => {
        if (where.email) {
          return Array.from(users.values()).find((u) => u.email === where.email) ?? null;
        }
        if (where.id) {
          return users.get(where.id) ?? null;
        }
        return null;
      }),
      create: jest.fn(async ({ data, include }) => {
        const id = `user-${users.size + 1}`;
        const record = {
          id,
          email: data.email,
          passwordHash: data.passwordHash,
          role: data.role,
          deletedAt: null,
          profile: include?.profile
            ? { displayName: data.profile?.create?.displayName ?? null }
            : undefined,
          companyMemberships: [],
        };
        users.set(id, record);
        return record;
      }),
    } as any,
    companyMembership: {
      findMany: jest.fn().mockResolvedValue([]),
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
        AuthModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
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
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers, logs in, and returns profile', async () => {
    const registerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'user@example.com', password: 'password123', displayName: 'Test User' });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body.token).toBeDefined();
    expect(registerRes.body.user.email).toBe('user@example.com');

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'user@example.com', password: 'password123' });

    expect(loginRes.status).toBe(200);
    const token = loginRes.body.token as string;
    expect(token).toBeDefined();

    const meRes = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.email).toBe('user@example.com');
    expect(meRes.body.passwordHash).toBeUndefined();
  });
});
