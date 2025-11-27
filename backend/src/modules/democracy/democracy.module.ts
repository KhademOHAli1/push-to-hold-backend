import { Module } from '@nestjs/common';
import { DemocracyController } from './democracy.controller';
import { DemocracyService } from './democracy.service';

@Module({
  controllers: [DemocracyController],
  providers: [DemocracyService],
  exports: [DemocracyService],
})
export class DemocracyModule {}
