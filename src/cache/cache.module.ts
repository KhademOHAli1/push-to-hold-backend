import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-ioredis-yet';

/**
 * Global Redis cache module for fast lookups.
 * Provides ~1-5ms response times vs ~50-200ms for database queries.
 */
@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        
        // If Redis is available, use it
        if (redisUrl) {
          return {
            store: await redisStore({
              url: redisUrl,
              ttl: 300000, // 5 minutes default TTL
            }),
          };
        }
        
        // Fallback to in-memory cache (for development without Redis)
        return {
          ttl: 300000, // 5 minutes
          max: 10000,  // Max 10k items in memory
        };
      },
    }),
  ],
  exports: [CacheModule],
})
export class RedisCacheModule {}
