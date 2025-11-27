import { Module } from '@nestjs/common';
import { ScanController } from './scan.controller';
import { ScanService } from './scan.service';
import { OpenFactsService } from './open-facts.service';
import { BrandMatcherService } from './brand-matcher.service';

@Module({
  controllers: [ScanController],
  providers: [ScanService, OpenFactsService, BrandMatcherService],
  exports: [ScanService, OpenFactsService, BrandMatcherService],
})
export class CatalogModule {}
