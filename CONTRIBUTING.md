# Contributing to Push to Hold

Thank you for your interest in contributing to Push to Hold! This project aims to promote transparency about companies' democratic values.

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Redis 7+ (optional)
- Docker (optional)

### Local Development Setup

```bash
# Clone the repository
git clone https://github.com/KhademOHAli1/push-to-hold-backend.git
cd push-to-hold-backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start PostgreSQL (via Docker)
docker-compose up -d postgres

# Run migrations
npm run prisma:migrate

# Seed sample data
npm run prisma:seed

# Start development server
npm run start:dev
```

The API will be available at `http://localhost:4000/api/v1`

## 📝 How to Contribute

### Reporting Issues

- Check if the issue already exists
- Use the issue template
- Include steps to reproduce
- Add relevant logs or screenshots

### Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `npm test`
5. Run linter: `npm run lint`
6. Commit with a clear message: `git commit -m "feat: add new feature"`
7. Push to your fork: `git push origin feature/my-feature`
8. Open a Pull Request

### Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

### Code Style

- Use TypeScript
- Follow NestJS best practices
- Add JSDoc comments for public APIs
- Write meaningful variable and function names

## 🏗️ Project Structure

```
src/
├── main.ts              # App bootstrap
├── app.module.ts        # Root module
├── common/              # Shared utilities
├── modules/
│   ├── auth/            # Authentication
│   ├── catalog/         # Product scanning
│   ├── companies/       # Company data
│   ├── democracy/       # Democracy index
│   └── portal/          # Company portal
└── prisma/              # Database service
```

## 🧪 Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 📚 Documentation

- API docs: `http://localhost:4000/api/docs` (Swagger)
- Architecture: `docs/Architecture.md`
- Database design: `docs/db design.md`

## 🤝 Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 💬 Questions?

Open an issue or reach out to the maintainers.

Thank you for helping make Push to Hold better! 🎉
