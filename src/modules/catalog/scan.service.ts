import { Injectable, NotFoundException, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../../prisma/prisma.service';
import { OpenFactsService } from './open-facts.service';
import { BrandMatcherService } from './brand-matcher.service';

/**
 * Context information for a product scan.
 */
interface ScanContext {
  /** User ID if authenticated */
  userId?: string;
  /** Platform: 'ios', 'android', 'web' */
  platform?: string;
  /** ISO country code, e.g., 'DE' */
  countryCode?: string;
}

/**
 * Cached scan result format
 */
export interface CachedScanResult {
  gtin: string;
  product: {
    name: string;
    imageUrl: string | null;
    category: string | null;
    brand: { id: string; name: string } | null;
  };
  company: {
    id: string;
    displayName: string;
    officialName: string;
    democracyStatus: string;
    democracyScore: number | null;
    statusReasonShort: string | null;
    lastReviewAt: Date | null;
  } | null;
}

// Cache TTL in seconds
const CACHE_TTL_SCAN = 3600; // 1 hour for scan results
const CACHE_TTL_PRODUCT = 86400; // 24 hours for products

/**
 * Service for handling barcode scans and product lookups.
 * Resolves GTIN → Product → Brand → Company and returns democracy status.
 * 
 * OPTIMIZED for speed with:
 * - Redis caching (1h for scans, 24h for products)
 * - Parallel external API calls
 * - Smart brand-to-company matching
 */
@Injectable()
export class ScanService {
  private readonly logger = new Logger(ScanService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly openFactsService: OpenFactsService,
    private readonly brandMatcherService: BrandMatcherService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  /**
   * Scan a GTIN (barcode) and return product and company information.
   * 
   * OPTIMIZED Flow:
   * 1. Check Redis cache first (target: <5ms)
   * 2. If cache miss, look up product in local database
   * 3. If not found, fetch from Open Food Facts in parallel
   * 4. Use smart brand matching to find company
   * 5. Cache and return result
   * 
   * @param gtin - The barcode/GTIN to scan (EAN-8, EAN-13, UPC-A)
   * @param context - Optional scan context (user, platform, country)
   * @returns Product info, brand, and company with democracy status
   * @throws NotFoundException if product not found
   */
  async scanGtin(gtin: string, context?: ScanContext) {
    const startTime = Date.now();
    
    // 1. Normalize GTIN
    const normalized = this.normalizeGtin(gtin);
    const cacheKey = `scan:${normalized}`;

    // 2. Check cache first (fastest path)
    const cached = await this.cache.get<CachedScanResult>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for ${normalized} in ${Date.now() - startTime}ms`);
      // Record scan async (don't wait)
      this.recordScan(normalized, cached.company?.id, context).catch(() => {});
      return cached;
    }

    // 3. Look up product in local DB
    let product = await this.prisma.product.findUnique({
      where: { gtin: normalized },
      include: {
        brand: {
          include: {
            company: true,
          },
        },
        companyOverride: {
          include: {
            company: true,
          },
        },
      },
    });

    // 4. If not found locally, fetch from external sources
    if (!product) {
      product = await this.fetchAndStoreFromExternalSource(normalized);
    }

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // 5. Determine the company (override takes precedence)
    const company = product.companyOverride?.company ?? product.brand?.company;

    // 6. Build result
    const result: CachedScanResult = {
      gtin: product.gtin,
      product: {
        name: product.name ?? `Product ${product.gtin}`,
        imageUrl: product.imageUrl,
        category: product.category,
        brand: product.brand
          ? {
              id: product.brand.id,
              name: product.brand.name,
            }
          : null,
      },
      company: company
        ? {
            id: company.id,
            displayName: company.displayName ?? company.officialName,
            officialName: company.officialName,
            democracyStatus: company.democracyStatus,
            democracyScore: company.democracyScore,
            statusReasonShort: company.statusReasonShort,
            lastReviewAt: company.lastReviewAt,
          }
        : null,
    };

    // 7. Cache the result
    await this.cache.set(cacheKey, result, CACHE_TTL_SCAN * 1000);

    // 8. Record the scan event (async, don't wait)
    this.recordScan(normalized, company?.id, context).catch(() => {});

    const elapsed = Date.now() - startTime;
    this.logger.log(`Scan completed in ${elapsed}ms: ${product.name}`);

    return result;
  }

  private normalizeGtin(gtin: string): string {
    // Remove any non-digit characters
    let normalized = gtin.replace(/\D/g, '');
    
    // Pad to 13 digits if it's a valid EAN-8 or UPC-A
    if (normalized.length === 8) {
      normalized = normalized.padStart(13, '0');
    } else if (normalized.length === 12) {
      normalized = normalized.padStart(13, '0');
    }
    
    return normalized;
  }

  /**
   * Fetch product data from external sources (Open Food Facts, Open Products Facts).
   * Uses smart brand matching to link to existing companies.
   * 
   * @param gtin - Normalized GTIN
   * @returns Product with brand and company, or null if not found
   * @private
   */
  private async fetchAndStoreFromExternalSource(gtin: string) {
    const startTime = Date.now();
    this.logger.debug(`Fetching from external source: ${gtin}`);

    // Fetch from Open Food Facts / Open Products Facts (parallel calls)
    const externalProduct = await this.openFactsService.fetchProduct(gtin);
    
    if (!externalProduct) {
      this.logger.debug(`Product not found in external databases: ${gtin}`);
      return null;
    }

    // Extract brand name
    const brandName = this.openFactsService.extractBrandName(externalProduct);
    const category = this.openFactsService.extractCategory(externalProduct);

    // Use smart brand matching (with company aliases and fuzzy matching)
    let brand = null;
    if (brandName) {
      brand = await this.brandMatcherService.findOrCreateBrandWithCompany(brandName);
      if (brand.companyId) {
        this.logger.log(`Matched brand "${brandName}" to company via smart matching`);
      }
    }

    // Create the product in our local database
    const product = await this.prisma.product.create({
      data: {
        gtin,
        name: externalProduct.product_name || `Unknown product (${gtin})`,
        brandId: brand?.id,
        category,
        sourceSystem: 'openfoodfacts',
        sourceProductId: externalProduct.code,
        imageUrl: externalProduct.image_front_url || externalProduct.image_url,
        lastSyncedAt: new Date(),
      },
      include: {
        brand: {
          include: {
            company: true,
          },
        },
        companyOverride: {
          include: {
            company: true,
          },
        },
      },
    });

    const elapsed = Date.now() - startTime;
    this.logger.log(`Stored new product in ${elapsed}ms: ${product.name}`);

    return product;
  }

  /**
   * Record a scan event for analytics.
   * @param gtin - The scanned GTIN
   * @param companyId - Optional company ID
   * @param context - Scan context
   * @private
   */
  private async recordScan(gtin: string, companyId?: string, context?: ScanContext) {
    try {
      await this.prisma.scan.create({
        data: {
          gtin,
          companyId,
          userId: context?.userId,
          appPlatform: context?.platform,
          countryCode: context?.countryCode,
        },
      });
    } catch {
      // Silently fail - scan recording is non-critical
    }
  }
}
