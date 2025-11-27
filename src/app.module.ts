import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { RedisCacheModule } from './cache/cache.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { DemocracyModule } from './modules/democracy/democracy.module';
import { PortalModule } from './modules/portal/portal.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    RedisCacheModule, // Redis caching (global)
    PrismaModule,
    HealthModule,
    AuthModule,
    CatalogModule,
    CompaniesModule,
    DemocracyModule,
    PortalModule,
    // AdminModule can be added later
  ],
})
export class AppModule {}
