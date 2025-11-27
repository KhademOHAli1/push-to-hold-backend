1. Backend concept (NestJS + Prisma + Postgres)
Stack choice
NestJS (TypeScript) – modular, good for bigger domains.


PostgreSQL – main DB.


Prisma – ORM.


JWT auth – for app + web portal.


Global API prefix: /api/v1.


Logical modules
AuthModule – login/register/me.


CatalogModule – barcode scan → product → company.


CompaniesModule – company search & detail.


DemocracyModule – pledge/timeline/open data.


PortalModule – company reps (claim, pledges, answers).


AdminModule – internal moderation (later).



1.1 Suggested project structure
backend/
  src/
    main.ts
    app.module.ts

    prisma/
      prisma.service.ts

    common/
      guards/jwt-auth.guard.ts
      decorators/current-user.decorator.ts
      dto/pagination.dto.ts

    modules/
      auth/
        auth.module.ts
        auth.controller.ts
        auth.service.ts
        dto/login.dto.ts
        dto/register.dto.ts

      catalog/
        catalog.module.ts
        scan.controller.ts
        scan.service.ts

      companies/
        companies.module.ts
        companies.controller.ts
        companies.service.ts
        dto/company-query.dto.ts

      democracy/
        democracy.module.ts
        democracy.controller.ts
        democracy.service.ts

      portal/
        portal.module.ts
        portal.controller.ts
        portal.service.ts

      admin/
        admin.module.ts
        admin.controller.ts
        admin.service.ts

2. NestJS core bootstrap
2.1 main.ts
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1'); // /api/v1/...
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors({
    origin: ['http://localhost:3000'], // Next.js dev
    credentials: true,
  });

  await app.listen(process.env.PORT || 4000);
}
bootstrap();
2.2 app.module.ts
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma/prisma.service';

import { AuthModule } from './modules/auth/auth.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { DemocracyModule } from './modules/democracy/democracy.module';
import { PortalModule } from './modules/portal/portal.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    CatalogModule,
    CompaniesModule,
    DemocracyModule,
    PortalModule,
    // AdminModule can be added later
  ],
  providers: [PrismaService],
})
export class AppModule {}
2.3 Prisma service (very minimal)
// src/prisma/prisma.service.ts
import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    this.$on('beforeExit', async () => {
      await app.close();
    });
  }
}

3. Auth module (stubs)
3.1 DTOs
// src/modules/auth/dto/register.dto.ts
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  displayName?: string;
}

// src/modules/auth/dto/login.dto.ts
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
3.2 AuthService
// src/modules/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash: hashed,
        role: 'consumer',
        profile: {
          create: {
            displayName: dto.displayName ?? null,
          },
        },
      },
      include: { profile: true },
    });

    const token = await this.signToken(user.id, user.email, user.role);
    return { token, user: this.toSafeUser(user) };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const token = await this.signToken(user.id, user.email, user.role);
    return { token, user: this.toSafeUser(user) };
  }

  private async signToken(id: string, email: string, role: string) {
    return this.jwtService.signAsync({ sub: id, email, role });
  }

  private toSafeUser(user: any) {
    const { passwordHash, ...rest } = user;
    return rest;
  }
}
3.3 AuthController
// src/modules/auth/auth.controller.ts
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: any) {
    return user;
  }
}
3.4 AuthModule
// src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev_secret',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}

4. Catalog / Scan module (core flow)
4.1 ScanService
This is where you will later call OFF/OPF + resolve brand → company.
// src/modules/catalog/scan.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ScanService {
  constructor(private prisma: PrismaService) {}

  async scanGtin(gtin: string) {
    // 1. Normalise GTIN
    const normalized = gtin.trim();

    // 2. Look up local DB
    const product = await this.prisma.product.findUnique({
      where: { gtin: normalized },
      include: {
        brand: {
          include: {
            company: true,
          },
        },
      },
    });

    if (!product) {
      // TODO: Call Open Food Facts / Open Products Facts here and upsert.
      throw new NotFoundException('Product not found (yet)');
    }

    const company = product.brand?.company;

    return {
      gtin: product.gtin,
      product: {
        name: product.name,
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
  }
}
4.2 ScanController
// src/modules/catalog/scan.controller.ts
import { Controller, Get, Param } from '@nestjs/common';
import { ScanService } from './scan.service';

@Controller('scan')
export class ScanController {
  constructor(private scanService: ScanService) {}

  @Get(':gtin')
  async scan(@Param('gtin') gtin: string) {
    return this.scanService.scanGtin(gtin);
  }
}
4.3 CatalogModule
// src/modules/catalog/catalog.module.ts
import { Module } from '@nestjs/common';
import { ScanController } from './scan.controller';
import { ScanService } from './scan.service';

@Module({
  controllers: [ScanController],
  providers: [ScanService],
})
export class CatalogModule {}

5. Companies module
5.1 DTO for search
// src/modules/companies/dto/company-query.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class CompanyQueryDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsString()
  status?: 'green' | 'yellow' | 'red';

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  pageSize?: number;
}
5.2 CompaniesService
// src/modules/companies/companies.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CompanyQueryDto } from './dto/company-query.dto';

@Injectable()
export class CompaniesService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: CompanyQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: any = {};

    if (query.status) where.democracyStatus = query.status;
    if (query.country) where.countryCode = query.country;
    if (query.query) {
      where.OR = [
        { displayName: { contains: query.query, mode: 'insensitive' } },
        { officialName: { contains: query.query, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.company.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { displayName: 'asc' },
      }),
      this.prisma.company.count({ where }),
    ]);

    return { items, page, pageSize, total };
  }

  async findOne(id: string) {
    return this.prisma.company.findUnique({
      where: { id },
    });
  }
}
5.3 CompaniesController
// src/modules/companies/companies.controller.ts
import { Controller, Get, Param, Query } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CompanyQueryDto } from './dto/company-query.dto';

@Controller('companies')
export class CompaniesController {
  constructor(private companiesService: CompaniesService) {}

  @Get()
  async list(@Query() query: CompanyQueryDto) {
    return this.companiesService.findAll(query);
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    const company = await this.companiesService.findOne(id);
    return company;
  }
}
5.4 CompaniesModule
// src/modules/companies/companies.module.ts
import { Module } from '@nestjs/common';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';

@Module({
  controllers: [CompaniesController],
  providers: [CompaniesService],
  exports: [CompaniesService],
})
export class CompaniesModule {}

6. Democracy module (timeline, open data)
6.1 DemocracyService
// src/modules/democracy/democracy.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DemocracyService {
  constructor(private prisma: PrismaService) {}

  async getCompanyTimeline(companyId: string) {
    const statuses = await this.prisma.companyStatusHistory.findMany({
      where: { companyId },
      orderBy: { changedAt: 'desc' },
    });

    const evidence = await this.prisma.companyEvidence.findMany({
      where: { companyId, isPublic: true },
      orderBy: { sourceDate: 'desc' },
    });

    // For simplicity, just return raw lists
    return { statuses, evidence };
  }

  async getOpenDataCompanies() {
    return this.prisma.company.findMany({
      select: {
        id: true,
        officialName: true,
        displayName: true,
        democracyStatus: true,
        democracyScore: true,
        countryCode: true,
      },
    });
  }
}
6.2 DemocracyController
// src/modules/democracy/democracy.controller.ts
import { Controller, Get, Param } from '@nestjs/common';
import { DemocracyService } from './democracy.service';

@Controller()
export class DemocracyController {
  constructor(private democracyService: DemocracyService) {}

  @Get('companies/:id/timeline')
  async timeline(@Param('id') id: string) {
    return this.democracyService.getCompanyTimeline(id);
  }

  @Get('open-data/companies')
  async openDataCompanies() {
    return this.democracyService.getOpenDataCompanies();
  }
}
6.3 DemocracyModule
// src/modules/democracy/democracy.module.ts
import { Module } from '@nestjs/common';
import { DemocracyController } from './democracy.controller';
import { DemocracyService } from './democracy.service';

@Module({
  controllers: [DemocracyController],
  providers: [DemocracyService],
})
export class DemocracyModule {}

7. Flutter API client & models
Assuming:
Base URL: https://api.pushtohold.de/api/v1


Using dio for HTTP.


7.1 Models
// lib/models/auth_models.dart
class User {
  final String id;
  final String email;
  final String role;

  User({required this.id, required this.email, required this.role});

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String,
      email: json['email'] as String,
      role: json['role'] as String,
    );
  }
}

class AuthResponse {
  final String token;
  final User user;

  AuthResponse({required this.token, required this.user});

  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    return AuthResponse(
      token: json['token'] as String,
      user: User.fromJson(json['user'] as Map<String, dynamic>),
    );
  }
}

// lib/models/scan_models.dart
class BrandSummary {
  final String id;
  final String name;

  BrandSummary({required this.id, required this.name});

  factory BrandSummary.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return BrandSummary(id: '', name: '');
    }
    return BrandSummary(
      id: json['id'] as String,
      name: json['name'] as String,
    );
  }
}

class ProductSummary {
  final String? name;
  final BrandSummary? brand;

  ProductSummary({this.name, this.brand});

  factory ProductSummary.fromJson(Map<String, dynamic> json) {
    return ProductSummary(
      name: json['name'] as String?,
      brand: json['brand'] != null
          ? BrandSummary.fromJson(json['brand'] as Map<String, dynamic>)
          : null,
    );
  }
}

class CompanySummary {
  final String id;
  final String displayName;
  final String officialName;
  final String democracyStatus;
  final int? democracyScore;
  final String? statusReasonShort;
  final DateTime? lastReviewAt;

  CompanySummary({
    required this.id,
    required this.displayName,
    required this.officialName,
    required this.democracyStatus,
    this.democracyScore,
    this.statusReasonShort,
    this.lastReviewAt,
  });

  factory CompanySummary.fromJson(Map<String, dynamic> json) {
    return CompanySummary(
      id: json['id'] as String,
      displayName: json['displayName'] as String? ??
          json['officialName'] as String,
      officialName: json['officialName'] as String,
      democracyStatus: json['democracyStatus'] as String,
      democracyScore: json['democracyScore'] as int?,
      statusReasonShort: json['statusReasonShort'] as String?,
      lastReviewAt: json['lastReviewAt'] != null
          ? DateTime.parse(json['lastReviewAt'] as String)
          : null,
    );
  }
}

class ScanResult {
  final String gtin;
  final ProductSummary? product;
  final CompanySummary? company;

  ScanResult({
    required this.gtin,
    this.product,
    this.company,
  });

  factory ScanResult.fromJson(Map<String, dynamic> json) {
    return ScanResult(
      gtin: json['gtin'] as String,
      product: json['product'] != null
          ? ProductSummary.fromJson(json['product'] as Map<String, dynamic>)
          : null,
      company: json['company'] != null
          ? CompanySummary.fromJson(json['company'] as Map<String, dynamic>)
          : null,
    );
  }
}

// lib/models/company_models.dart
class CompanyListItem {
  final String id;
  final String? displayName;
  final String? officialName;
  final String democracyStatus;
  final int? democracyScore;
  final String countryCode;

  CompanyListItem({
    required this.id,
    this.displayName,
    this.officialName,
    required this.democracyStatus,
    this.democracyScore,
    required this.countryCode,
  });

  factory CompanyListItem.fromJson(Map<String, dynamic> json) {
    return CompanyListItem(
      id: json['id'] as String,
      displayName: json['displayName'] as String?,
      officialName: json['officialName'] as String?,
      democracyStatus: json['democracyStatus'] as String,
      democracyScore: json['democracyScore'] as int?,
      countryCode: json['countryCode'] as String,
    );
  }
}

class PaginatedCompanies {
  final List<CompanyListItem> items;
  final int page;
  final int pageSize;
  final int total;

  PaginatedCompanies({
    required this.items,
    required this.page,
    required this.pageSize,
    required this.total,
  });

  factory PaginatedCompanies.fromJson(Map<String, dynamic> json) {
    final itemsJson = json['items'] as List<dynamic>;
    return PaginatedCompanies(
      items: itemsJson
          .map((e) => CompanyListItem.fromJson(e as Map<String, dynamic>))
          .toList(),
      page: json['page'] as int,
      pageSize: json['pageSize'] as int,
      total: json['total'] as int,
    );
  }
}

// lib/models/timeline_models.dart
class StatusHistory {
  final String id;
  final String previousStatus;
  final String newStatus;
  final DateTime changedAt;
  final String? reasonMarkdown;

  StatusHistory({
    required this.id,
    required this.previousStatus,
    required this.newStatus,
    required this.changedAt,
    this.reasonMarkdown,
  });

  factory StatusHistory.fromJson(Map<String, dynamic> json) {
    return StatusHistory(
      id: json['id'] as String,
      previousStatus: json['previousStatus'] as String,
      newStatus: json['newStatus'] as String,
      changedAt: DateTime.parse(json['changedAt'] as String),
      reasonMarkdown: json['reasonMarkdown'] as String?,
    );
  }
}

class EvidenceItem {
  final String id;
  final String type;
  final String title;
  final String? sourceUrl;
  final String? sourceName;
  final DateTime? sourceDate;

  EvidenceItem({
    required this.id,
    required this.type,
    required this.title,
    this.sourceUrl,
    this.sourceName,
    this.sourceDate,
  });

  factory EvidenceItem.fromJson(Map<String, dynamic> json) {
    return EvidenceItem(
      id: json['id'] as String,
      type: json['type'] as String,
      title: json['title'] as String,
      sourceUrl: json['sourceUrl'] as String?,
      sourceName: json['sourceName'] as String?,
      sourceDate: json['sourceDate'] != null
          ? DateTime.parse(json['sourceDate'] as String)
          : null,
    );
  }
}

class CompanyTimeline {
  final List<StatusHistory> statuses;
  final List<EvidenceItem> evidence;

  CompanyTimeline({
    required this.statuses,
    required this.evidence,
  });

  factory CompanyTimeline.fromJson(Map<String, dynamic> json) {
    final statusesJson = json['statuses'] as List<dynamic>;
    final evidenceJson = json['evidence'] as List<dynamic>;
    return CompanyTimeline(
      statuses: statusesJson
          .map((e) => StatusHistory.fromJson(e as Map<String, dynamic>))
          .toList(),
      evidence: evidenceJson
          .map((e) => EvidenceItem.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

7.2 API client
// lib/api/api_client.dart
import 'package:dio/dio.dart';
import '../models/auth_models.dart';
import '../models/scan_models.dart';
import '../models/company_models.dart';
import '../models/timeline_models.dart';

class ApiClient {
  final Dio _dio;

  ApiClient({
    required String baseUrl,
    String? authToken,
  }) : _dio = Dio(
          BaseOptions(
            baseUrl: baseUrl,
            headers: authToken != null
                ? {'Authorization': 'Bearer $authToken'}
                : {},
          ),
        );

  set authToken(String? token) {
    if (token == null) {
      _dio.options.headers.remove('Authorization');
    } else {
      _dio.options.headers['Authorization'] = 'Bearer $token';
    }
  }

  // AUTH

  Future<AuthResponse> register({
    required String email,
    required String password,
    String? displayName,
  }) async {
    final res = await _dio.post('/auth/register', data: {
      'email': email,
      'password': password,
      'displayName': displayName,
    });

    return AuthResponse.fromJson(res.data as Map<String, dynamic>);
  }

  Future<AuthResponse> login({
    required String email,
    required String password,
  }) async {
    final res = await _dio.post('/auth/login', data: {
      'email': email,
      'password': password,
    });

    final auth = AuthResponse.fromJson(res.data as Map<String, dynamic>);
    authToken = auth.token;
    return auth;
  }

  // SCAN

  Future<ScanResult> scanProduct(String gtin) async {
    final res = await _dio.get('/scan/$gtin');
    return ScanResult.fromJson(res.data as Map<String, dynamic>);
  }

  // COMPANIES

  Future<PaginatedCompanies> listCompanies({
    String? query,
    String? status,
    String? country,
    int page = 1,
    int pageSize = 20,
  }) async {
    final res = await _dio.get('/companies', queryParameters: {
      if (query != null && query.isNotEmpty) 'query': query,
      if (status != null) 'status': status,
      if (country != null) 'country': country,
      'page': page,
      'pageSize': pageSize,
    });

    return PaginatedCompanies.fromJson(res.data as Map<String, dynamic>);
  }

  Future<CompanySummary> getCompany(String companyId) async {
    final res = await _dio.get('/companies/$companyId');
    return CompanySummary.fromJson(res.data as Map<String, dynamic>);
  }

  // DEMOCRACY / TIMELINE

  Future<CompanyTimeline> getCompanyTimeline(String companyId) async {
    final res = await _dio.get('/companies/$companyId/timeline');
    return CompanyTimeline.fromJson(res.data as Map<String, dynamic>);
  }

  // TODO: add follow/unfollow, portal endpoints, etc.
}

8. What you can do next
You now have:
A NestJS structure with:


App bootstrap


Modules: auth, catalog/scan, companies, democracy


Concrete controllers & services ready to extend


A Flutter API client with:


Auth, scan, company list/detail, timeline models and methods


Next natural steps:
Define the Prisma schema to match the services (User, Product, Brand, Company, Evidence, StatusHistory).


Add portal endpoints for company claims & pledges.


Wire the OFF/OPF + OpenCorporates calls into ScanService and a background worker.


If you tell me “Prisma schema next” or “add portal endpoints next”, I’ll draft those schemas/endpoints in the same concrete style.

