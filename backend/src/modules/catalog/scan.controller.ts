import { Controller, Get, Param, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiHeader } from '@nestjs/swagger';
import { ScanService } from './scan.service';
import { Request } from 'express';

/**
 * Controller for barcode scanning and product lookup.
 */
@ApiTags('Scan')
@Controller('scan')
export class ScanController {
  constructor(private readonly scanService: ScanService) {}

  /**
   * Scan a product barcode (GTIN) and retrieve company democracy status.
   */
  @Get(':gtin')
  @ApiOperation({ 
    summary: 'Scan a product barcode', 
    description: 'Scans a GTIN barcode to lookup the product, brand, and parent company democracy status.' 
  })
  @ApiParam({ name: 'gtin', description: 'GTIN barcode (EAN-13, UPC-A, etc.)', example: '0123456789012' })
  @ApiHeader({ name: 'x-app-platform', required: false, description: 'App platform (ios, android, web)' })
  @ApiHeader({ name: 'x-country-code', required: false, description: 'ISO country code (US, GB, DE, etc.)' })
  @ApiResponse({ status: 200, description: 'Product and company democracy status retrieved' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async scan(@Param('gtin') gtin: string, @Req() req: Request) {
    const context = {
      userId: (req as any).user?.sub,
      platform: req.headers['x-app-platform'] as string,
      countryCode: req.headers['x-country-code'] as string,
    };
    
    return this.scanService.scanGtin(gtin, context);
  }
}
