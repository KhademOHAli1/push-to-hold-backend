# Push to Hold Backend

![CI](https://github.com/KhademOHAli1/push-to-hold-backend/actions/workflows/ci.yml/badge.svg)
![License](https://img.shields.io/github/license/KhademOHAli1/push-to-hold-backend)

NestJS + Prisma + PostgreSQL + Redis backend for the Push to Hold democracy index app.

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 16+ (or Docker)
- Redis 7+ (optional - falls back to memory cache)

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Seed sample data
npm run prisma:seed

# Start development server
npm run start:dev
```

The API will be available at `http://localhost:4000/api/v1`

## 📚 API Documentation

Swagger UI: **http://localhost:4000/api/docs**

## 📁 Project Structure

```
.
├── src/
│   ├── main.ts                    # App bootstrap
│   ├── app.module.ts              # Root module
│   ├── cache/                     # Redis cache module
│   ├── health/                    # Health check endpoint
│   ├── prisma/                    # Database service
│   ├── common/                    # Guards, decorators, DTOs
│   └── modules/
│       ├── auth/                  # JWT authentication
│       ├── catalog/               # Product scanning + Open Food Facts
│       ├── companies/             # Company search & details
│       ├── democracy/             # Timeline, evidence, open data
│       └── portal/                # Company representative portal
├── prisma/
│   ├── schema.prisma              # Database schema (18+ models)
│   └── seed.ts                    # Sample data
├── docs/                          # Documentation
├── docker-compose.yml             # PostgreSQL + Redis + API
└── Dockerfile                     # Production container
```

## 🐳 Docker

```bash
# Start all services (PostgreSQL + Redis + API)
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop
docker-compose down
```

## ⚡ Performance

Scan endpoint response times:
- **Cached products: < 2ms** ✅
- **Database lookup: ~5ms** ✅
- **External API (new products): ~200-500ms**

## 🔌 Key Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /scan/:gtin` | Scan barcode → democracy status |
| `GET /companies` | Search companies |
| `GET /companies/:id/timeline` | Company democracy timeline |
| `POST /auth/register` | Register user |
| `POST /auth/login` | Get JWT token |

## 🛠️ Scripts

```bash
npm run start:dev       # Development with hot reload
npm run build           # Build for production
npm run prisma:migrate  # Run migrations
npm run prisma:seed     # Seed sample data
npm run prisma:studio   # Database GUI
```

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
