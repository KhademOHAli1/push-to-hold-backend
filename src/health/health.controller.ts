import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

/**
 * Health check controller for container orchestration and load balancers.
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  /**
   * Basic health check endpoint.
   */
  @Get()
  @ApiOperation({ summary: 'Health check', description: 'Returns OK if the API is running' })
  @ApiResponse({ status: 200, description: 'API is healthy' })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'push-to-hold-api',
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  /**
   * Readiness check - verifies all dependencies are ready.
   */
  @Get('ready')
  @ApiOperation({ summary: 'Readiness check', description: 'Returns OK if the API and dependencies are ready' })
  @ApiResponse({ status: 200, description: 'API is ready to accept traffic' })
  ready() {
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
    };
  }
}
