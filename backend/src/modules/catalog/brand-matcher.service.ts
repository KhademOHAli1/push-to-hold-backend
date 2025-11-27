import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Brand alias mapping for common supermarket brands.
 * Maps various brand name variations to the canonical company ID.
 */
export interface BrandMapping {
  brandNames: string[];  // All known variations of the brand name
  companyId: string;
  companyName: string;
}

/**
 * Service for fast brand-to-company matching.
 * Uses in-memory index + Redis cache for <10ms lookups.
 */
@Injectable()
export class BrandMatcherService {
  private readonly logger = new Logger(BrandMatcherService.name);
  
  // In-memory index for O(1) brand lookups
  private brandIndex: Map<string, string> = new Map(); // normalized brand -> companyId
  private companyCache: Map<string, any> = new Map();  // companyId -> company data
  private initialized = false;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {
    // Initialize the index on startup
    this.initializeIndex();
  }

  /**
   * Build in-memory index of all brands for fast matching.
   * Called on startup and can be refreshed periodically.
   */
  async initializeIndex(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Load all brands with their companies
      const brands = await this.prisma.brand.findMany({
        where: { companyId: { not: null } },
        include: { company: true },
      });

      // Build the index
      this.brandIndex.clear();
      this.companyCache.clear();

      for (const brand of brands) {
        if (brand.company) {
          // Index the brand name (normalized)
          const normalized = this.normalizeBrandName(brand.name);
          this.brandIndex.set(normalized, brand.companyId!);
          
          // Cache company data
          if (!this.companyCache.has(brand.companyId!)) {
            this.companyCache.set(brand.companyId!, {
              id: brand.company.id,
              displayName: brand.company.displayName ?? brand.company.officialName,
              officialName: brand.company.officialName,
              democracyStatus: brand.company.democracyStatus,
              democracyScore: brand.company.democracyScore,
              statusReasonShort: brand.company.statusReasonShort,
              lastReviewAt: brand.company.lastReviewAt,
            });
          }
        }
      }

      // Also load brand aliases from the mapping table
      await this.loadBrandAliases();

      this.initialized = true;
      const elapsed = Date.now() - startTime;
      this.logger.log(`Brand index initialized: ${this.brandIndex.size} brands in ${elapsed}ms`);
    } catch (error) {
      this.logger.error('Failed to initialize brand index', error);
    }
  }

  /**
   * Load additional brand aliases for fuzzy matching.
   */
  private async loadBrandAliases(): Promise<void> {
    // Major German supermarket brand mappings
    // This handles cases where Open Food Facts has different brand names
    const aliases: Record<string, string[]> = {
      // Ferrero brands
      'ferrero': ['nutella', 'kinder', 'ferrero rocher', 'duplo', 'hanuta', 'yogurette', 'tic tac', 'raffaello'],
      // Nestlé brands  
      'nestle': ['nescafe', 'nespresso', 'maggi', 'kitkat', 'lion', 'smarties', 'after eight', 'nesquik', 'vittel', 'perrier', 'san pellegrino'],
      // Unilever brands
      'unilever': ['dove', 'axe', 'rexona', 'knorr', 'hellmanns', 'lipton', 'ben & jerrys', 'magnum', 'langnese'],
      // Procter & Gamble
      'procter & gamble': ['pampers', 'ariel', 'tide', 'gillette', 'oral-b', 'always', 'pantene', 'head & shoulders', 'fairy', 'braun'],
      // Henkel
      'henkel': ['persil', 'pril', 'pritt', 'schwarzkopf', 'fa', 'schauma', 'syoss', 'got2b', 'theramed'],
      // Coca-Cola
      'the coca-cola company': ['coca-cola', 'coca cola', 'coke', 'fanta', 'sprite', 'mezzo mix', 'powerade', 'fuze tea', 'honest'],
      // PepsiCo
      'pepsico': ['pepsi', 'lays', 'doritos', 'cheetos', 'tropicana', 'quaker', '7up', 'mirinda', 'lipton ice tea'],
      // Mars
      'mars': ['snickers', 'twix', 'milky way', 'bounty', 'm&ms', 'maltesers', 'whiskas', 'pedigree', 'sheba', 'uncle bens'],
      // Mondelez
      'mondelez': ['milka', 'oreo', 'toblerone', 'philadelphia', 'tuc', 'lu', 'cadbury', 'ritz'],
      // Dr. Oetker
      'dr. oetker': ['dr oetker', 'ristorante', 'pudding', 'backin'],
      // Essity (Zewa, Tempo)
      'essity': ['zewa', 'tempo', 'tork', 'tena', 'libresse', 'libero', 'leukoplast'],
      // Reckitt
      'reckitt': ['finish', 'vanish', 'calgon', 'durex', 'scholl', 'dettol', 'sagrotan', 'cillit bang', 'woolite'],
      // Beiersdorf
      'beiersdorf': ['nivea', 'eucerin', 'labello', 'hansaplast', 'la prairie', 'tesa'],
      // Edeka private labels
      'edeka': ['edeka', 'gut & günstig', 'elkos', 'rio doro'],
      // REWE private labels
      'rewe': ['rewe', 'ja!', 'rewe beste wahl', 'rewe bio', 'rewe feine welt'],
      // Aldi private labels
      'aldi': ['aldi', 'milsani', 'moser roth', 'choceur', 'lacura', 'cien', 'fair', 'tandil'],
      // Lidl private labels
      'lidl': ['lidl', 'milbona', 'cien', 'w5', 'freeway', 'solevita', 'vitafit'],
      // dm private labels
      'dm': ['dm', 'balea', 'alverde', 'denkmit', 'dontodent', 'mivolis', 'babylove', 'ebelin', 'sundance'],
    };

    // Find company IDs for these known companies and add aliases
    for (const [companyNameLower, brandNames] of Object.entries(aliases)) {
      const company = await this.prisma.company.findFirst({
        where: {
          OR: [
            { displayName: { contains: companyNameLower, mode: 'insensitive' } },
            { officialName: { contains: companyNameLower, mode: 'insensitive' } },
          ],
        },
      });

      if (company) {
        for (const brandName of brandNames) {
          const normalized = this.normalizeBrandName(brandName);
          if (!this.brandIndex.has(normalized)) {
            this.brandIndex.set(normalized, company.id);
          }
        }
        
        // Cache company if not already cached
        if (!this.companyCache.has(company.id)) {
          this.companyCache.set(company.id, {
            id: company.id,
            displayName: company.displayName ?? company.officialName,
            officialName: company.officialName,
            democracyStatus: company.democracyStatus,
            democracyScore: company.democracyScore,
            statusReasonShort: company.statusReasonShort,
            lastReviewAt: company.lastReviewAt,
          });
        }
      }
    }
  }

  /**
   * Fast brand-to-company lookup.
   * Uses in-memory index for O(1) performance.
   * 
   * @param brandName - The brand name from the product
   * @returns Company data or null if not matched
   */
  async matchBrand(brandName: string): Promise<any | null> {
    if (!this.initialized) {
      await this.initializeIndex();
    }

    const normalized = this.normalizeBrandName(brandName);
    
    // Try exact match first
    let companyId = this.brandIndex.get(normalized);
    
    // Try fuzzy match if exact fails
    if (!companyId) {
      companyId = this.fuzzyMatch(normalized);
    }

    if (companyId) {
      return this.companyCache.get(companyId) ?? null;
    }

    return null;
  }

  /**
   * Fuzzy matching for brand names.
   * Handles partial matches and common variations.
   */
  private fuzzyMatch(normalized: string): string | undefined {
    // Try prefix matching (e.g., "coca" matches "coca-cola")
    for (const [key, companyId] of this.brandIndex.entries()) {
      if (key.startsWith(normalized) || normalized.startsWith(key)) {
        return companyId;
      }
    }

    // Try word-based matching (e.g., "dr oetker ristorante" matches "dr. oetker")
    const words = normalized.split(/\s+/);
    for (const word of words) {
      if (word.length >= 4) { // Skip short words
        const match = this.brandIndex.get(word);
        if (match) return match;
      }
    }

    return undefined;
  }

  /**
   * Normalize brand name for matching.
   * Removes special characters, lowercases, etc.
   */
  private normalizeBrandName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9äöüß\s]/g, '') // Keep German umlauts
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Get company by ID from cache.
   */
  getCompanyFromCache(companyId: string): any | null {
    return this.companyCache.get(companyId) ?? null;
  }

  /**
   * Refresh the brand index (can be called periodically).
   */
  async refreshIndex(): Promise<void> {
    await this.initializeIndex();
  }

  /**
   * Find company for a brand name.
   * Uses the fast in-memory index.
   */
  async findCompanyForBrand(brandName: string): Promise<any | null> {
    return this.matchBrand(brandName);
  }

  /**
   * Find or create a brand and try to link it to a company.
   * Used when a new product is found from external sources.
   * 
   * @param brandName - The brand name from the product
   * @returns The brand record (may or may not have a company linked)
   */
  async findOrCreateBrandWithCompany(brandName: string): Promise<any> {
    if (!this.initialized) {
      await this.initializeIndex();
    }

    // First, try to find existing brand
    const existingBrand = await this.prisma.brand.findFirst({
      where: {
        name: { equals: brandName, mode: 'insensitive' },
      },
      include: { company: true },
    });

    if (existingBrand) {
      return existingBrand;
    }

    // Try to match brand to a company using our index
    const normalized = this.normalizeBrandName(brandName);
    let companyId = this.brandIndex.get(normalized);
    
    // Try fuzzy match if exact fails
    if (!companyId) {
      companyId = this.fuzzyMatch(normalized);
    }

    // Create the brand (with or without company link)
    const brand = await this.prisma.brand.create({
      data: {
        name: brandName,
        companyId: companyId ?? undefined,
      },
      include: { company: true },
    });

    // Add to index if we linked a company
    if (brand.companyId) {
      this.brandIndex.set(normalized, brand.companyId);
      this.logger.log(`Created brand "${brandName}" linked to company ${brand.company?.displayName}`);
    } else {
      this.logger.log(`Created brand "${brandName}" without company link`);
    }

    return brand;
  }
}
