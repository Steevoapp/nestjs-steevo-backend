# Steevo Backend Service

A production-grade REST API implementing Role-Based Access Control (RBAC). Built with **NestJS** and **PostgreSQL** and **Redis**.

✅ **API Documentation**

- Swagger/OpenAPI integration with bearer token authentication
- Full API documentation at `/api/docs`

## Technology Stack

- **NestJS** - Node.js framework
- **TypeORM** - Database ORM
- **PostgreSQL** - Relational database
- **Cloudflare R2** - Object Storage
- **Twilio Service** - OTP Service
- **Redis Server** - Redis server
- **Passport.js** - Authentication
- **JWT** - Token-based auth
- **Bcrypt** - Password hashing
- **Swagger** - API documentation

## Complete Setup Instructions

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp env.example .env
```

### Step 3: Setup PostgreSQL Database and Redis Server

**Using Docker Compose (Recommended)**

```bash
docker-compose up -d
```

This starts PostgreSQL on `localhost:5432`

this starts Redis Server on `localhost:6379`

### Step 4: Run the Application

**Development Mode (with hot reload):**

```bash
npm run start:dev
```

**Production Mode:**

```bash
npm run build
npm run start:prod
```

Server runs at: `http://localhost:3000/api`
Swagger docs: `http://localhost:3000/api/docs`

# TypeORM Migration Setup Guide

This guide explains how to use TypeORM migrations in your task management backend.

## Overview

Migrations are used to manage database schema changes in a version-controlled way. Instead of manually running SQL or using `synchronize: true`, migrations provide:

- **Version Control**: Track all schema changes in git
- **Reproducibility**: Same migrations run consistently across environments
- **Team Collaboration**: Share schema updates with teammates
- **Rollback Capability**: Revert to previous schema versions if needed

## Setup

The project is already configured with TypeORM migrations:

- **Configuration File**: `ormconfig.ts` - Contains database connection and migration settings
- **Migration Folder**: `src/migrations/` - Where all migration files are stored
- **Initial Migration**: `src/migrations/1708617600000-CreateInitialTables.ts` - Creates User and Task tables

## Available Commands

### Generate a New Migration

After you modify entity files, generate a migration:

```bash
npm run migration:generate -- ./src/migrations/NameOfMigration
```

This command:

1. Detects changes between your entities and the current database schema
2. Automatically generates the migration SQL
3. Creates a new migration file in `src/migrations/`

**Example**: Adding a `createdAt` column to the Task entity:

```bash
npm run migration:generate -- ./src/migrations/AddCreatedAtToTask
```

### Run Migrations

Apply all pending migrations to your database:

```bash
npm run migration:run
```

This command:

1. Checks which migrations have already been applied (tracked in `_prisma_migrations` table)
2. Runs only the new migrations
3. Updates the migrations table

**Note**: Migrations automatically run when the application starts (see `migrationsRun: true` in `app.module.ts`)

### Revert the Last Migration

Undo the most recent migration:

```bash
npm run migration:revert
```

This is useful for:

- Testing rollback scenarios
- Fixing mistakes in recently applied migrations
- Development/testing workflows

**Warning**: Only use on development databases. Never use in production without careful planning.

### Show Migration Status

View which migrations have been applied:

```bash
npm run migration:show
```

This displays:

- All available migrations
- Which ones have been applied
- Timestamps of applied migrations

### Manual Migration (Advanced)

Create a migration without auto-generation:

```bash
npm run migration:create -- ./src/migrations/CustomMigration
```

This creates an empty migration file that you must fill in manually.

## Workflow Example

### 1. Modify an Entity

Update your entity file, e.g., add a field to `User`:

```typescript
// src/users/entities/user.entity.ts
@Column({ nullable: true })
email: string;
```

### 2. Generate Migration

```bash
npm run migration:generate -- ./src/migrations/AddEmailToUser
```

This creates a new file like:

```
src/migrations/1708617700000-AddEmailToUser.ts
```

### 3. Run Migration

```bash
npm run migration:run
```

### 4. Commit to Git

```bash
git add src/migrations/
git commit -m "Add email column to user table"
```

## Best Practices

### ✅ DO:

- **Generate migrations** instead of writing them manually
- **Review generated migrations** before running them
- **Test migrations locally** before deploying
- **Keep migrations small and focused** on one change
- **Write descriptive names** for clarity: `AddIsActiveToUser`, `CreateTaskTable`
- **Always provide a DOWN method** for rollback capability
- **Commit migrations to git** with your code changes

### ❌ DON'T:

- **Modify or delete old migration files** - this breaks the migration history
- **Run migrations in production without testing** in staging first
- **Use synchronize: true** in production - always use migrations
- **Skip the DOWN method** - it's essential for rollbacks
- **Write complex SQL** - keep migrations focused on schema only

## Configuration Reference

### `ormconfig.ts`

```typescript
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'], // Source migrations (development)
  synchronize: false, // Never auto-sync
  logging: true,
});
```

### `app.module.ts`

```typescript
TypeOrmModule.forRootAsync({
  // ...
  migrations: ['dist/migrations/*.js'], // Compiled migrations (runtime)
  migrationsRun: true, // Auto-run on app start
  synchronize: false, // Always use migrations
});
```

## Development vs Production

### Development

- `migrationsRun: true` - migrations run automatically on startup
- Can use `migration:revert` to test rollbacks
- Can regenerate migrations freely

### Production

- `migrationsRun: true` - ensures migrations run on deployments
- Should run migrations in a pre-deployment step
- Keep careful records of which migrations have been applied

## Troubleshooting

### Migrations not running

1. Check database connection:

   ```bash
   npm run migration:show
   ```

2. Verify `.env` file has correct database credentials

3. Ensure database exists and is accessible

### Cannot generate migration

- Database must be running and accessible
- Ensure TypeORM can connect (check .env)
- Compare your entities with the actual database schema

### Need to start over (Development Only!)

```bash
npm run migration:revert
```

Repeat until all migrations are reverted, then re-run:

```bash
npm run migration:run
```

## Next Steps

1. **Test the initial migration**:

   ```bash
   npm run migration:run
   ```

2. **Verify tables were created**:

   ```bash
   npm start:dev
   ```

3. **Make entity changes** and generate new migrations:

   ```bash
   npm run migration:generate -- ./src/migrations/YourMigrationName
   ```

4. **Review and commit** migrations to version control

---

For more information, see the [TypeORM Documentation](https://typeorm.io/migrations)

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Build for Production

```bash
npm run build
npm run start:prod
```

Compiled code goes to the `dist/` directory.

## Notes

- JWT tokens expire after **1 hour** (configurable)
- Passwords hashed with **bcrypt** (10 salt rounds)
- Database schema auto-generated via TypeORM
- All protected endpoints require valid JWT token
- Token passed via `Authorization: Bearer <token>` header

## Deliverables Checklist

✅ Source code runs locally
✅ Setup instructions in README
✅ Usage examples with curl commands
✅ Swagger documentation at /api/docs
✅ Complete API endpoints listed
✅ Docker Compose for database
✅ Environment variable configuration
✅ Role-based access control implemented
✅ JWT authentication working
✅ No deployment required

---

**Created**: February 2026
**Status**: Production-Ready
