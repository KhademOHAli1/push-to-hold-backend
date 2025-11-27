import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma database service that extends PrismaClient.
 * Handles database connection lifecycle and provides access to all Prisma models.
 * 
 * This service is globally available through PrismaModule.
 * 
 * @example
 * ```typescript
 * constructor(private readonly prisma: PrismaService) {}
 * 
 * async findUser(id: string) {
 *   return this.prisma.user.findUnique({ where: { id } });
 * }
 * ```
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
    });
  }

  /**
   * Connect to the database when the module initializes.
   */
  async onModuleInit() {
    await this.$connect();
  }

  /**
   * Disconnect from the database when the module is destroyed.
   */
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
