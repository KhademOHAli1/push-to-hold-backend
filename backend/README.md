# Push to Hold Backend

NestJS + Prisma + PostgreSQL backend for the Push to Hold democracy index app.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 15+ (or Docker)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your database credentials

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Start development server
npm run start:dev
```

The API will be available at `http://localhost:4000/api/v1`

## 📚 API Documentation

Interactive Swagger documentation is available at:

- **Swagger UI**: `http://localhost:4000/api/docs`
- **OpenAPI JSON**: `http://localhost:4000/api/docs-json`

The Swagger UI provides:
- Interactive API exploration
- Request/response schemas
- Authentication testing
- Try-it-out functionality

## 📁 Project Structure

```
backend/
├── src/
│   ├── main.ts                    # App bootstrap
│   ├── app.module.ts              # Root module
│   ├── health/
│   │   ├── health.module.ts       # Health check module
│   │   └── health.controller.ts   # Health endpoints
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts      # Database connection
│   ├── common/
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts  # JWT authentication
│   │   │   └── roles.guard.ts     # Role-based access
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   └── roles.decorator.ts
│   │   └── dto/
│   │       └── pagination.dto.ts
│   └── modules/
│       ├── auth/                  # Authentication
│       ├── catalog/               # Product scanning
│       ├── companies/             # Company search & details
│       ├── democracy/             # Timeline, evidence, open data
│       └── portal/                # Company representative portal
├── prisma/
│   └── schema.prisma              # Database schema
├── Dockerfile                     # Production container
├── Dockerfile.dev                 # Development container
├── docker-compose.yml             # Full stack orchestration
└── package.json
```

## 🐳 Docker

### Quick Start with Docker

```bash
# Start all services (PostgreSQL + API)
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

### Development with Docker

```bash
# Start with hot-reload
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Open Prisma Studio (optional)
docker-compose --profile dev up prisma-studio
```

### Environment Variables for Docker

Create a `.env` file or set environment variables:

```bash
POSTGRES_USER=pushtohold
POSTGRES_PASSWORD=your-secure-password
POSTGRES_DB=pushtohold
JWT_SECRET=your-jwt-secret
FRONTEND_URL=http://localhost:3000
```

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login |
| GET | `/auth/me` | Get current user profile |

### Scan & Catalog
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/scan/:gtin` | Scan barcode → get product & company democracy status |

### Companies
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/companies` | List/search companies |
| GET | `/companies/:id` | Get company details |
| GET | `/companies/:id/timeline` | Get company democracy timeline |
| GET | `/companies/:id/evidence` | Get company evidence |

### Open Data
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/open-data/companies` | Export all company data |

### Company Portal (Auth Required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/portal/claims` | Claim a company profile |
| GET | `/portal/claims` | List my claims |
| GET | `/portal/companies` | List my companies |
| GET | `/portal/companies/:id` | Get company portal dashboard |
| POST | `/portal/companies/:id/pledges` | Sign democracy pledge |
| GET | `/portal/companies/:id/questions` | Get questions to answer |
| POST | `/portal/companies/:id/questions/:qid/answer` | Answer a question |
| POST | `/portal/companies/:id/corrections` | Submit correction request |

## 🗃️ Database Schema

Key models:
- **User** - Consumers, company reps, admins
- **Company** - Legal entities with democracy status (green/yellow/red)
- **Brand** - Product brands owned by companies
- **Product** - Products identified by GTIN (barcode)
- **Pledge** - Democracy pledge versions
- **CompanyPledge** - Company pledge signatures
- **CompanyEvidence** - Evidence items (news, statements, etc.)
- **CompanyStatusHistory** - Status change audit trail

## 🛠️ Scripts

```bash
npm run start:dev      # Development with hot reload
npm run start:prod     # Production
npm run build          # Build for production
npm run prisma:generate # Generate Prisma client
npm run prisma:migrate  # Run migrations
npm run prisma:studio   # Open Prisma Studio (DB GUI)
```

## 🔐 Authentication

The API uses JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your-token>
```

## 🌐 CORS

Configured for:
- `http://localhost:3000` (Next.js)
- `http://localhost:8080` (Flutter web)
- Custom URL via `FRONTEND_URL` env var

## 📝 Next Steps

1. **Set up PostgreSQL** - Run a local instance or use Docker
2. **Run migrations** - `npm run prisma:migrate`
3. **Seed initial data** - Create pledges, question templates, etc.
4. **Integrate external APIs** - Open Food Facts, OpenCorporates
5. **Add Admin module** - For internal moderation
