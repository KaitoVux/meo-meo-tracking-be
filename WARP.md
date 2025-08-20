# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development Commands

### Building and Running
```bash
# Install dependencies
npm install

# Development mode with hot reload
npm run start:dev

# Build the application
npm run build

# Production mode
npm run start:prod

# Debug mode
npm run start:debug
```

### Database Operations
```bash
# Run migrations
npx mikro-orm migration:up

# Create new migration
npx mikro-orm migration:create

# Run database seeders
npx mikro-orm seeder:run

# Database schema update (development)
npx mikro-orm schema:update --run
```

### Testing
```bash
# Run unit tests
npm run test

# Run tests with coverage
npm run test:cov

# Run specific test files
npm run test:files

# Run e2e tests
npm run test:e2e

# Watch mode for tests
npm run test:watch

# Debug tests
npm run test:debug
```

### Code Quality
```bash
# Lint and fix code
npm run lint

# Format code with Prettier
npm run format
```

## Architecture Overview

This is a **NestJS-based expense tracking system** with the following core architectural components:

### Database & ORM
- **MikroORM** with PostgreSQL for data persistence
- Entities use soft deletion with `deletedAt` timestamps
- Database migrations and seeders for schema management
- UUID primary keys across all entities

### Core Domain Entities

**Expense Entity** - The central business object with:
- Payment ID generation logic (auto-increment with sub-IDs for same vendor/date)
- Status workflow: DRAFT → SUBMITTED → APPROVED → PAID → CLOSED
- Multi-currency support (VND/USD) with exchange rates
- File attachments via Google Drive integration

**User Entity** - Authentication and authorization:
- Role-based access (USER, ACCOUNTANT)
- JWT-based authentication with Passport strategies

**File Entity** - Google Drive integration:
- Stores Google Drive file metadata
- Links invoice files to expenses

### Key Service Architecture

**ExpenseWorkflowService** - Manages status transitions:
- Validates allowed state changes
- Creates audit trail via ExpenseStatusHistory
- Triggers notifications and reminders

**PaymentIdService** - Handles unique ID generation:
- Auto-increment payment IDs starting from 1
- Sub-IDs for multiple expenses to same vendor on same date
- Format: "15" for single, "15-1", "15-2" for multiples

**ExpenseValidationService** - Business rule validation:
- Required field validation before submission
- Data integrity checks

### Module Structure
```
src/
├── auth/           # Authentication & authorization (JWT, guards, strategies)
├── expenses/       # Core expense management with workflow services  
├── files/          # Google Drive integration for invoice storage
├── notifications/  # Status change notifications and reminders
├── categories/     # Expense categorization
├── entities/       # Database entity definitions
├── migrations/     # Database schema migrations
└── seeders/        # Database seed data
```

### Google Drive Integration
- Files uploaded to configured Google Drive folder
- Stores Drive file ID and shareable URLs
- Environment variables required: `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`, etc.

### Status Workflow System
The expense workflow enforces specific business rules:
- Users submit expenses (DRAFT → SUBMITTED)
- Accountants approve/reject (SUBMITTED → APPROVED/DRAFT)  
- Payment processing (APPROVED → PAID)
- Final closure (PAID → CLOSED)
- Full audit trail maintained in ExpenseStatusHistory

### Environment Configuration
Key environment variables (see `.env.example`):
- `DATABASE_URL` - PostgreSQL connection
- `JWT_SECRET` - Authentication secret
- `GOOGLE_DRIVE_*` - Google Drive API credentials
- `CORS_ORIGIN` - Frontend URL for CORS

### Testing Strategy
- Unit tests for all services and entities (`.spec.ts` files)
- E2E tests for API endpoints
- Jest configuration supports TypeScript and coverage reporting
- Mock implementations for external services (Google Drive)

## Development Notes

### Running Single Tests
Use `npm run test:files` for file-specific tests or Jest's `--testPathPatterns` option for targeted testing.

### Database Schema Changes
Always create migrations for schema changes rather than direct database modifications. The system uses MikroORM's migration system with TypeScript support.

### Payment ID Logic
The PaymentIdService implements complex auto-increment logic - when modifying, ensure sub-ID generation for same vendor/date combinations is preserved.

### Soft Delete Pattern  
All entities implement soft deletion. Use MikroORM filters to exclude deleted records by default.
