import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

/**
 * Response from Open Food Facts / Open Products Facts API
 */
export interface OpenFactsProduct {
  code: string;
  product_name?: string;
  brands?: string;
  categories?: string;
  image_url?: string;
  image_front_url?: string;
  countries?: string;
  generic_name?: string;
  quantity?: string;
  packaging?: string;
  labels?: string;
  manufacturing_places?: string;
  origins?: string;
}

export interface OpenFactsResponse {
  status: number;
  status_verbose: string;
  code: string;
  product?: OpenFactsProduct;
}

/**
 * Service for fetching product data from Open Food Facts and Open Products Facts.
 * Optimized for speed with parallel requests and minimal payload.
 * 
 * @see https://wiki.openfoodfacts.org/API
 */
@Injectable()
export class OpenFactsService {
  private readonly logger = new Logger(OpenFactsService.name);

  // API endpoints - using v2 API for better performance
  private readonly APIs = [
    'https://world.openfoodfacts.org/api/v2/product',
    'https://world.openproductsfacts.org/api/v2/product',
    'https://world.openbeautyfacts.org/api/v2/product',
  ];

  // Only fetch fields we need (reduces response size significantly)
  private readonly FIELDS = 'code,product_name,brands,categories,image_front_url,image_url';

  // User agent required by Open Food Facts API policy
  private readonly userAgent = 'PushToHold/1.0 (https://pushtohold.de; contact@pushtohold.de)';

  // Axios instance with optimized settings
  private readonly httpClient = axios.create({
    timeout: 2000, // 2 second timeout (fast fail)
    headers: {
      'User-Agent': this.userAgent,
      'Accept-Encoding': 'gzip', // Compressed responses
    },
  });

  /**
   * Fetch product info from Open Facts APIs in PARALLEL.
   * Returns as soon as any API finds the product.
   * 
   * @param gtin - The barcode (EAN-13, UPC-A, etc.)
   * @returns Product data or null if not found
   */
  async fetchProduct(gtin: string): Promise<OpenFactsProduct | null> {
    const normalizedGtin = this.normalizeGtin(gtin);
    const startTime = Date.now();
    
    this.logger.debug(`Fetching product: ${normalizedGtin}`);

    // Make parallel requests to all APIs - return first success
    const results = await Promise.allSettled(
      this.APIs.map(api => this.fetchFromApi(api, normalizedGtin))
    );

    // Find first successful result
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        const elapsed = Date.now() - startTime;
        this.logger.log(`Found product in ${elapsed}ms: ${result.value.product_name || normalizedGtin}`);
        return result.value;
      }
    }

    const elapsed = Date.now() - startTime;
    this.logger.debug(`Product not found in ${elapsed}ms: ${normalizedGtin}`);
    return null;
  }

  /**
   * Fetch from a single API endpoint.
   */
  private async fetchFromApi(baseUrl: string, gtin: string): Promise<OpenFactsProduct | null> {
    try {
      const url = `${baseUrl}/${gtin}?fields=${this.FIELDS}`;
      const response = await this.httpClient.get<OpenFactsResponse>(url);

      if (response.data.status === 1 && response.data.product) {
        return response.data.product;
      }
      return null;
    } catch {
      return null; // Silently fail - other APIs might succeed
    }
  }

  /**
   * Normalize GTIN to standard format.
   */
  private normalizeGtin(gtin: string): string {
    return gtin.replace(/\D/g, '');
  }

  /**
   * Extract brand name from Open Facts product data.
   */
  extractBrandName(product: OpenFactsProduct): string | null {
    if (!product.brands) return null;
    const brands = product.brands.split(',').map(b => b.trim());
    return brands[0] || null;
  }

  /**
   * Extract category from Open Facts product data.
   */
  extractCategory(product: OpenFactsProduct): string | null {
    if (!product.categories) return null;
    const categories = product.categories.split(',').map(c => c.trim());
    return categories[categories.length - 1] || null;
  }
}
