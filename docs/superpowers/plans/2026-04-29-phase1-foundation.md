# LifecycleIQ Phase 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete Phase 1 foundation — Turborepo monorepo, NestJS API with JWT auth/RBAC/CRUD, Supabase PostgreSQL schema, and Next.js frontend with login and settings pages.

**Architecture:** Turborepo monorepo with `apps/web` (Next.js 14 App Router), `apps/api` (NestJS), and `packages/shared`. NestJS owns all business logic and enforces RBAC via global JWT + Roles guards. Next.js uses NextAuth v5 to authenticate and passes JWTs as Bearer tokens to the API via server-side fetch in Server Components and Server Actions.

**Tech Stack:** Next.js 14, NestJS 10, TypeScript, Prisma 5, Supabase (PostgreSQL), NextAuth v5 (Auth.js), shadcn/ui, Tailwind CSS 3, Jest, pnpm workspaces, Turborepo

---

## File Map

### Root
- Create: `package.json` — pnpm workspace root
- Create: `turbo.json` — pipeline config
- Create: `.gitignore`
- Create: `pnpm-workspace.yaml`

### packages/shared
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/enums/role.enum.ts`
- Create: `packages/shared/src/types/user.ts`
- Create: `packages/shared/src/types/department.ts`
- Create: `packages/shared/src/types/location.ts`
- Create: `packages/shared/src/types/vendor.ts`
- Create: `packages/shared/src/types/audit-log.ts`

### apps/api
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/nest-cli.json`
- Create: `apps/api/.env` (from .env.example)
- Create: `apps/api/src/main.ts`
- Create: `apps/api/src/app.module.ts`
- Create: `apps/api/src/prisma/prisma.module.ts`
- Create: `apps/api/src/prisma/prisma.service.ts`
- Create: `apps/api/src/common/guards/jwt-auth.guard.ts`
- Create: `apps/api/src/common/guards/roles.guard.ts`
- Create: `apps/api/src/common/decorators/roles.decorator.ts`
- Create: `apps/api/src/common/decorators/public.decorator.ts`
- Create: `apps/api/src/common/decorators/current-user.decorator.ts`
- Create: `apps/api/src/common/filters/http-exception.filter.ts`
- Create: `apps/api/src/modules/auth/auth.module.ts`
- Create: `apps/api/src/modules/auth/auth.controller.ts`
- Create: `apps/api/src/modules/auth/auth.service.ts`
- Create: `apps/api/src/modules/auth/auth.service.spec.ts`
- Create: `apps/api/src/modules/auth/strategies/jwt.strategy.ts`
- Create: `apps/api/src/modules/auth/dto/login.dto.ts`
- Create: `apps/api/src/modules/audit-log/audit-log.module.ts`
- Create: `apps/api/src/modules/audit-log/audit-log.service.ts`
- Create: `apps/api/src/modules/audit-log/audit-log.controller.ts`
- Create: `apps/api/src/modules/users/users.module.ts`
- Create: `apps/api/src/modules/users/users.controller.ts`
- Create: `apps/api/src/modules/users/users.service.ts`
- Create: `apps/api/src/modules/users/users.service.spec.ts`
- Create: `apps/api/src/modules/users/dto/create-user.dto.ts`
- Create: `apps/api/src/modules/users/dto/update-user.dto.ts`
- Create: `apps/api/src/modules/departments/departments.module.ts`
- Create: `apps/api/src/modules/departments/departments.controller.ts`
- Create: `apps/api/src/modules/departments/departments.service.ts`
- Create: `apps/api/src/modules/departments/departments.service.spec.ts`
- Create: `apps/api/src/modules/departments/dto/create-department.dto.ts`
- Create: `apps/api/src/modules/departments/dto/update-department.dto.ts`
- Create: `apps/api/src/modules/locations/locations.module.ts`
- Create: `apps/api/src/modules/locations/locations.controller.ts`
- Create: `apps/api/src/modules/locations/locations.service.ts`
- Create: `apps/api/src/modules/locations/locations.service.spec.ts`
- Create: `apps/api/src/modules/locations/dto/create-location.dto.ts`
- Create: `apps/api/src/modules/locations/dto/update-location.dto.ts`
- Create: `apps/api/src/modules/vendors/vendors.module.ts`
- Create: `apps/api/src/modules/vendors/vendors.controller.ts`
- Create: `apps/api/src/modules/vendors/vendors.service.ts`
- Create: `apps/api/src/modules/vendors/vendors.service.spec.ts`
- Create: `apps/api/src/modules/vendors/dto/create-vendor.dto.ts`
- Create: `apps/api/src/modules/vendors/dto/update-vendor.dto.ts`
- Create: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/seed.ts`

### apps/web
- Create: `apps/web/package.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/postcss.config.mjs`
- Create: `apps/web/components.json`
- Create: `apps/web/.env.local`
- Create: `apps/web/middleware.ts`
- Create: `apps/web/auth.ts` — NextAuth config (root of web app)
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/app/api/auth/[...nextauth]/route.ts`
- Create: `apps/web/app/(auth)/login/page.tsx`
- Create: `apps/web/app/(protected)/layout.tsx`
- Create: `apps/web/app/(protected)/dashboard/page.tsx`
- Create: `apps/web/app/(protected)/decisions/page.tsx`
- Create: `apps/web/app/(protected)/assets/page.tsx`
- Create: `apps/web/app/(protected)/software/page.tsx`
- Create: `apps/web/app/(protected)/contracts/page.tsx`
- Create: `apps/web/app/(protected)/budget/page.tsx`
- Create: `apps/web/app/(protected)/scenarios/page.tsx`
- Create: `apps/web/app/(protected)/reports/page.tsx`
- Create: `apps/web/app/(protected)/imports/page.tsx`
- Create: `apps/web/app/(protected)/settings/users/page.tsx`
- Create: `apps/web/app/(protected)/settings/departments/page.tsx`
- Create: `apps/web/app/(protected)/settings/locations/page.tsx`
- Create: `apps/web/app/(protected)/settings/vendors/page.tsx`
- Create: `apps/web/components/layout/sidebar.tsx`
- Create: `apps/web/components/layout/header.tsx`
- Create: `apps/web/components/settings/data-table.tsx`
- Create: `apps/web/lib/api.ts`
- Create: `apps/web/lib/actions/departments.ts`
- Create: `apps/web/lib/actions/locations.ts`
- Create: `apps/web/lib/actions/vendors.ts`
- Create: `apps/web/lib/actions/users.ts`

---

## Task 1: Monorepo Scaffold

**Files:**
- Create: `package.json`, `turbo.json`, `pnpm-workspace.yaml`, `.gitignore`

- [ ] **Step 1: Initialize git and create root workspace files**

```bash
cd /Users/david/LifeCycleIQ_Claude
git init
```

Create `pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

Create `package.json`:
```json
{
  "name": "lifecycleiq",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.4.0",
    "@types/node": "^20.0.0"
  },
  "packageManager": "pnpm@9.0.0"
}
```

Create `turbo.json`:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "lint": {}
  }
}
```

Create `.gitignore`:
```
node_modules/
.next/
dist/
.env
.env.local
*.env
.turbo/
.superpowers/
coverage/
```

- [ ] **Step 2: Install root dependencies**

```bash
pnpm install
```

Expected: `node_modules/` created, `pnpm-lock.yaml` generated.

- [ ] **Step 3: Commit scaffold**

```bash
git add .
git commit -m "chore: initialize Turborepo monorepo"
```

---

## Task 2: Shared Package

**Files:**
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/src/index.ts`, enums, types

- [ ] **Step 1: Create shared package structure**

```bash
mkdir -p packages/shared/src/enums packages/shared/src/types
```

Create `packages/shared/package.json`:
```json
{
  "name": "@lifecycleiq/shared",
  "version": "0.0.1",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  }
}
```

Create `packages/shared/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "declaration": true,
    "outDir": "./dist"
  },
  "include": ["src"]
}
```

- [ ] **Step 2: Write Role enum**

Create `packages/shared/src/enums/role.enum.ts`:
```typescript
export enum Role {
  Admin = 'admin',
  Editor = 'editor',
  FinanceViewer = 'finance_viewer',
  DepartmentViewer = 'department_viewer',
  Viewer = 'viewer',
}
```

- [ ] **Step 3: Write shared types**

Create `packages/shared/src/types/user.ts`:
```typescript
import { Role } from '../enums/role.enum';

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  departmentId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}
```

Create `packages/shared/src/types/department.ts`:
```typescript
export interface Department {
  id: string;
  name: string;
  budgetCode: string | null;
  ownerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDepartmentInput {
  name: string;
  budgetCode?: string;
  ownerId?: string;
}

export interface UpdateDepartmentInput {
  name?: string;
  budgetCode?: string;
  ownerId?: string;
}
```

Create `packages/shared/src/types/location.ts`:
```typescript
export interface Location {
  id: string;
  name: string;
  building: string | null;
  room: string | null;
  locationType: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLocationInput {
  name: string;
  building?: string;
  room?: string;
  locationType?: string;
}

export interface UpdateLocationInput {
  name?: string;
  building?: string;
  room?: string;
  locationType?: string;
}
```

Create `packages/shared/src/types/vendor.ts`:
```typescript
export interface Vendor {
  id: string;
  name: string;
  website: string | null;
  accountRepName: string | null;
  accountRepEmail: string | null;
  supportEmail: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVendorInput {
  name: string;
  website?: string;
  accountRepName?: string;
  accountRepEmail?: string;
  supportEmail?: string;
  notes?: string;
}

export interface UpdateVendorInput {
  name?: string;
  website?: string;
  accountRepName?: string;
  accountRepEmail?: string;
  supportEmail?: string;
  notes?: string;
}
```

Create `packages/shared/src/types/audit-log.ts`:
```typescript
export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  createdAt: Date;
}
```

- [ ] **Step 4: Write barrel export**

Create `packages/shared/src/index.ts`:
```typescript
export * from './enums/role.enum';
export * from './types/user';
export * from './types/department';
export * from './types/location';
export * from './types/vendor';
export * from './types/audit-log';
```

- [ ] **Step 5: Commit**

```bash
git add packages/
git commit -m "feat: add shared types and Role enum"
```

---

## Task 3: NestJS App Scaffold

**Files:**
- Create: `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/nest-cli.json`, `apps/api/src/main.ts`, `apps/api/src/app.module.ts`

- [ ] **Step 1: Create NestJS package**

```bash
mkdir -p apps/api/src apps/api/prisma
```

Create `apps/api/package.json`:
```json
{
  "name": "@lifecycleiq/api",
  "version": "0.0.1",
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "start": "node dist/main",
    "test": "jest",
    "test:watch": "jest --watch",
    "db:migrate": "prisma migrate dev",
    "db:seed": "ts-node prisma/seed.ts",
    "db:generate": "prisma generate"
  },
  "dependencies": {
    "@lifecycleiq/shared": "workspace:*",
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "@nestjs/config": "^3.0.0",
    "@nestjs/jwt": "^10.0.0",
    "@nestjs/passport": "^10.0.0",
    "@prisma/client": "^5.0.0",
    "bcrypt": "^5.1.0",
    "class-transformer": "^0.5.0",
    "class-validator": "^0.14.0",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.0",
    "reflect-metadata": "^0.1.13",
    "rxjs": "^7.8.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.0.0",
    "@nestjs/schematics": "^10.0.0",
    "@nestjs/testing": "^10.0.0",
    "@types/bcrypt": "^5.0.0",
    "@types/express": "^4.17.0",
    "@types/jest": "^29.0.0",
    "@types/passport-jwt": "^3.0.0",
    "jest": "^29.0.0",
    "prisma": "^5.0.0",
    "ts-jest": "^29.0.0",
    "ts-node": "^10.9.0"
  },
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": { "^.+\\.(t|j)s$": "ts-jest" },
    "moduleNameMapper": {
      "^@lifecycleiq/shared$": "<rootDir>/../../packages/shared/src/index.ts"
    },
    "collectCoverageFrom": ["**/*.(t|j)s"],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node"
  }
}
```

Create `apps/api/tsconfig.json`:
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "noImplicitAny": false,
    "paths": {
      "@lifecycleiq/shared": ["../../packages/shared/src/index.ts"]
    }
  }
}
```

Create `apps/api/nest-cli.json`:
```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src"
}
```

- [ ] **Step 2: Write main.ts**

Create `apps/api/src/main.ts`:
```typescript
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  app.enableCors({
    origin: process.env.WEB_URL || 'http://localhost:3000',
    credentials: true,
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}/api/v1`);
}

bootstrap();
```

- [ ] **Step 3: Write app.module.ts (stub — filled in as modules are added)**

Create `apps/api/src/app.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { UsersModule } from './modules/users/users.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { LocationsModule } from './modules/locations/locations.module';
import { VendorsModule } from './modules/vendors/vendors.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    AuditLogModule,
    UsersModule,
    DepartmentsModule,
    LocationsModule,
    VendorsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
```

- [ ] **Step 4: Install API dependencies**

```bash
cd apps/api && pnpm install
```

Expected: dependencies installed.

- [ ] **Step 5: Commit**

```bash
cd /Users/david/LifeCycleIQ_Claude
git add apps/api/
git commit -m "feat: scaffold NestJS API app"
```

---

## Task 4: Prisma Schema + Supabase Migration

**Files:**
- Create: `apps/api/prisma/schema.prisma`, `apps/api/.env`

- [ ] **Step 1: Get Supabase connection strings via MCP**

Use the Supabase MCP tool `list_projects` to find an existing project, or `create_project` to create a new one named `lifecycleiq`. Then use `get_project_url` and `get_publishable_keys` to get the connection strings.

The DATABASE_URL format for Prisma + Supabase:
- `DATABASE_URL` = Transaction pooler URL (port 6543, append `?pgbouncer=true`)
- `DIRECT_URL` = Session pooler URL (port 5432, used by Prisma migrate)

Create `apps/api/.env`:
```
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
JWT_SECRET="replace-with-a-long-random-secret-min-32-chars"
WEB_URL="http://localhost:3000"
PORT=3001
```

Create `apps/api/.env.example` (safe to commit):
```
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
JWT_SECRET="replace-with-a-long-random-secret-min-32-chars"
WEB_URL="http://localhost:3000"
PORT=3001
```

- [ ] **Step 2: Write Prisma schema**

Create `apps/api/prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum Role {
  admin
  editor
  finance_viewer
  department_viewer
  viewer
}

model User {
  id           String      @id @default(uuid())
  email        String      @unique
  displayName  String      @map("display_name")
  passwordHash String      @map("password_hash")
  role         Role        @default(viewer)
  departmentId String?     @map("department_id")
  department   Department? @relation(fields: [departmentId], references: [id])
  isActive     Boolean     @default(true) @map("is_active")
  createdAt    DateTime    @default(now()) @map("created_at")
  updatedAt    DateTime    @updatedAt @map("updated_at")

  @@map("users")
}

model Department {
  id         String   @id @default(uuid())
  name       String
  budgetCode String?  @map("budget_code")
  ownerId    String?  @map("owner_id")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")
  users      User[]

  @@map("departments")
}

model Location {
  id           String   @id @default(uuid())
  name         String
  building     String?
  room         String?
  locationType String?  @map("location_type")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  @@map("locations")
}

model Vendor {
  id              String   @id @default(uuid())
  name            String
  website         String?
  accountRepName  String?  @map("account_rep_name")
  accountRepEmail String?  @map("account_rep_email")
  supportEmail    String?  @map("support_email")
  notes           String?
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  @@map("vendors")
}

model AuditLog {
  id         String   @id @default(uuid())
  userId     String?  @map("user_id")
  action     String
  entityType String   @map("entity_type")
  entityId   String   @map("entity_id")
  oldValue   Json?    @map("old_value")
  newValue   Json?    @map("new_value")
  createdAt  DateTime @default(now()) @map("created_at")

  @@map("audit_log")
}
```

- [ ] **Step 3: Generate Prisma client**

```bash
cd apps/api && pnpm db:generate
```

Expected: `@prisma/client` generated in `node_modules/.prisma/client`.

- [ ] **Step 4: Run migration**

```bash
cd apps/api && pnpm db:migrate --name init_phase1
```

Expected: Migration applied to Supabase. Output includes `Your database is now in sync with your schema.`

- [ ] **Step 5: Commit**

```bash
cd /Users/david/LifeCycleIQ_Claude
git add apps/api/prisma/ apps/api/.env.example
git commit -m "feat: add Prisma schema and Phase 1 migration"
```

---

## Task 5: NestJS Prisma Service + Common Infrastructure

**Files:**
- Create: `prisma.module.ts`, `prisma.service.ts`, all guards, decorators, filter

- [ ] **Step 1: Write PrismaService and PrismaModule**

```bash
mkdir -p apps/api/src/prisma apps/api/src/common/guards apps/api/src/common/decorators apps/api/src/common/filters
```

Create `apps/api/src/prisma/prisma.service.ts`:
```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

Create `apps/api/src/prisma/prisma.module.ts`:
```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 2: Write decorators**

Create `apps/api/src/common/decorators/public.decorator.ts`:
```typescript
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

Create `apps/api/src/common/decorators/roles.decorator.ts`:
```typescript
import { SetMetadata } from '@nestjs/common';
import { Role } from '@lifecycleiq/shared';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

Create `apps/api/src/common/decorators/current-user.decorator.ts`:
```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '@lifecycleiq/shared';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

- [ ] **Step 3: Write guards**

Create `apps/api/src/common/guards/jwt-auth.guard.ts`:
```typescript
import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}
```

Create `apps/api/src/common/guards/roles.guard.ts`:
```typescript
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@lifecycleiq/shared';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;
    const { user } = context.switchToHttp().getRequest();
    return required.includes(user?.role);
  }
}
```

- [ ] **Step 4: Write RFC 7807 exception filter**

Create `apps/api/src/common/filters/http-exception.filter.ts`:
```typescript
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    const detail =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? (exceptionResponse as any).message ?? exception instanceof Error
          ? (exception as Error).message
          : 'An error occurred'
        : String(exceptionResponse);

    res.status(status).json({
      status,
      title: statusTitle(status),
      detail: Array.isArray(detail) ? detail.join('; ') : detail,
      instance: req.url,
    });
  }
}

function statusTitle(status: number): string {
  const titles: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    500: 'Internal Server Error',
  };
  return titles[status] ?? 'Error';
}
```

- [ ] **Step 5: Commit**

```bash
cd /Users/david/LifeCycleIQ_Claude
git add apps/api/src/
git commit -m "feat: add Prisma service and common guards/decorators/filters"
```

---

## Task 6: Auth Module (TDD)

**Files:**
- Create: `auth.module.ts`, `auth.service.ts`, `auth.service.spec.ts`, `auth.controller.ts`, `jwt.strategy.ts`, `dto/login.dto.ts`

- [ ] **Step 1: Create directories and write failing tests**

```bash
mkdir -p apps/api/src/modules/auth/strategies apps/api/src/modules/auth/dto
```

Create `apps/api/src/modules/auth/auth.service.spec.ts`:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

const mockUser = {
  id: 'user-uuid-1',
  email: 'admin@test.com',
  displayName: 'Admin',
  passwordHash: '$2b$12$hashed',
  role: 'admin',
  isActive: true,
};

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<Pick<UsersService, 'findByEmail'>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: { findByEmail: jest.fn() },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('mock-token') },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
  });

  describe('login', () => {
    it('returns accessToken and user without passwordHash when credentials valid', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({ email: 'admin@test.com', password: 'pass' });

      expect(result.accessToken).toBe('mock-token');
      expect(result.user.email).toBe('admin@test.com');
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('throws UnauthorizedException when user not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'x@x.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user is inactive', async () => {
      usersService.findByEmail.mockResolvedValue({ ...mockUser, isActive: false } as any);

      await expect(
        service.login({ email: 'admin@test.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when password does not match', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'admin@test.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd apps/api && pnpm test --testPathPattern=auth.service.spec
```

Expected: FAIL — `Cannot find module './auth.service'`

- [ ] **Step 3: Write LoginDto**

Create `apps/api/src/modules/auth/dto/login.dto.ts`:
```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
```

- [ ] **Step 4: Write JwtStrategy**

Create `apps/api/src/modules/auth/strategies/jwt.strategy.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Role } from '@lifecycleiq/shared';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  validate(payload: JwtPayload) {
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
```

- [ ] **Step 5: Write AuthService**

Create `apps/api/src/modules/auth/auth.service.ts`:
```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '@lifecycleiq/shared';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const match = await bcrypt.compare(dto.password, user.passwordHash);
    if (!match) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role as Role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
    };
  }
}
```

- [ ] **Step 6: Write AuthController**

Create `apps/api/src/modules/auth/auth.controller.ts`:
```typescript
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout() {
    return { message: 'Logged out' };
  }
}
```

- [ ] **Step 7: Write AuthModule**

Create `apps/api/src/modules/auth/auth.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '8h' },
      }),
    }),
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
```

- [ ] **Step 8: Run tests and confirm pass**

```bash
cd apps/api && pnpm test --testPathPattern=auth.service.spec
```

Expected: PASS — 4 tests passing.

- [ ] **Step 9: Commit**

```bash
cd /Users/david/LifeCycleIQ_Claude
git add apps/api/src/modules/auth/
git commit -m "feat: add auth module with JWT login and strategy"
```

---

## Task 7: Audit Log Module

**Files:**
- Create: `audit-log.module.ts`, `audit-log.service.ts`, `audit-log.controller.ts`

- [ ] **Step 1: Create audit-log module files**

```bash
mkdir -p apps/api/src/modules/audit-log
```

Create `apps/api/src/modules/audit-log/audit-log.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditLogEntry {
  userId?: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
}

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  async log(entry: AuditLogEntry) {
    return this.prisma.auditLog.create({ data: entry });
  }

  async findByEntity(entityType: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll(limit = 100) {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
```

Create `apps/api/src/modules/audit-log/audit-log.controller.ts`:
```typescript
import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@lifecycleiq/shared';
import { AuditLogService } from './audit-log.service';

@Controller('audit-log')
export class AuditLogController {
  constructor(private auditLogService: AuditLogService) {}

  @Get()
  @Roles(Role.Admin)
  findAll(@Query('limit') limit?: string) {
    return this.auditLogService.findAll(limit ? parseInt(limit) : 100);
  }

  @Get(':entityType/:entityId')
  @Roles(Role.Admin, Role.Editor)
  findByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
  ) {
    return this.auditLogService.findByEntity(entityType, entityId);
  }
}
```

Create `apps/api/src/modules/audit-log/audit-log.module.ts`:
```typescript
import { Global, Module } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { AuditLogController } from './audit-log.controller';

@Global()
@Module({
  providers: [AuditLogService],
  exports: [AuditLogService],
  controllers: [AuditLogController],
})
export class AuditLogModule {}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/david/LifeCycleIQ_Claude
git add apps/api/src/modules/audit-log/
git commit -m "feat: add global audit log module"
```

---

## Task 8: Users Module (TDD)

**Files:**
- Create: `users.module.ts`, `users.service.ts`, `users.service.spec.ts`, `users.controller.ts`, DTOs

- [ ] **Step 1: Create directories and write failing tests**

```bash
mkdir -p apps/api/src/modules/users/dto
```

Create `apps/api/src/modules/users/users.service.spec.ts`:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

const mockPrisma = {
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const mockAuditLog = { log: jest.fn() };

const safeUser = {
  id: 'uuid-1',
  email: 'a@test.com',
  displayName: 'A',
  role: 'admin',
  departmentId: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogService, useValue: mockAuditLog },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
  });

  describe('findAll', () => {
    it('returns array of users without passwordHash', async () => {
      mockPrisma.user.findMany.mockResolvedValue([safeUser]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty('passwordHash');
    });
  });

  describe('findOne', () => {
    it('returns user when found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(safeUser);
      const result = await service.findOne('uuid-1');
      expect(result.id).toBe('uuid-1');
    });

    it('throws NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('hashes password and creates user with audit log', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      mockPrisma.user.create.mockResolvedValue(safeUser);

      await service.create(
        { email: 'a@test.com', password: 'password1', displayName: 'A', role: 'admin' as any },
        'actor-id',
      );

      expect(bcrypt.hash).toHaveBeenCalledWith('password1', 12);
      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATE', entityType: 'User' }),
      );
    });

    it('throws ConflictException when email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(safeUser);
      await expect(
        service.create(
          { email: 'a@test.com', password: 'password1', displayName: 'A', role: 'admin' as any },
          'actor-id',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('deletes user and logs audit entry', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(safeUser);
      mockPrisma.user.delete.mockResolvedValue(safeUser);

      await service.remove('uuid-1', 'actor-id');

      expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { id: 'uuid-1' } });
      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DELETE', entityType: 'User', entityId: 'uuid-1' }),
      );
    });

    it('throws NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.remove('missing', 'actor-id')).rejects.toThrow(NotFoundException);
    });
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd apps/api && pnpm test --testPathPattern=users.service.spec
```

Expected: FAIL — `Cannot find module './users.service'`

- [ ] **Step 3: Write DTOs**

Create `apps/api/src/modules/users/dto/create-user.dto.ts`:
```typescript
import { IsEmail, IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { Role } from '@lifecycleiq/shared';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  displayName: string;

  @IsEnum(Role)
  role: Role;

  @IsOptional()
  @IsUUID()
  departmentId?: string;
}
```

Create `apps/api/src/modules/users/dto/update-user.dto.ts`:
```typescript
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { Role } from '@lifecycleiq/shared';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
```

- [ ] **Step 4: Write UsersService**

Create `apps/api/src/modules/users/users.service.ts`:
```typescript
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const safeSelect = {
  id: true,
  email: true,
  displayName: true,
  role: true,
  departmentId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  findAll() {
    return this.prisma.user.findMany({ select: safeSelect });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: safeSelect });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async create(dto: CreateUserDto, actorId: string) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        displayName: dto.displayName,
        passwordHash,
        role: dto.role as any,
        departmentId: dto.departmentId,
      },
      select: safeSelect,
    });

    await this.auditLog.log({
      userId: actorId,
      action: 'CREATE',
      entityType: 'User',
      entityId: user.id,
      newValue: { email: user.email, role: user.role },
    });

    return user;
  }

  async update(id: string, dto: UpdateUserDto, actorId: string) {
    const existing = await this.findOne(id);
    const { password, ...rest } = dto;
    const data: any = { ...rest };
    if (password) data.passwordHash = await bcrypt.hash(password, 12);

    const user = await this.prisma.user.update({ where: { id }, data, select: safeSelect });

    await this.auditLog.log({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'User',
      entityId: id,
      oldValue: { role: existing.role, isActive: existing.isActive },
      newValue: { role: user.role, isActive: user.isActive },
    });

    return user;
  }

  async remove(id: string, actorId: string) {
    await this.findOne(id);
    await this.prisma.user.delete({ where: { id } });
    await this.auditLog.log({
      userId: actorId,
      action: 'DELETE',
      entityType: 'User',
      entityId: id,
    });
    return { deleted: true };
  }
}
```

- [ ] **Step 5: Write UsersController**

Create `apps/api/src/modules/users/users.controller.ts`:
```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { Role } from '@lifecycleiq/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser } from '@lifecycleiq/shared';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Roles(Role.Admin)
  create(@Body() dto: CreateUserDto, @CurrentUser() user: AuthUser) {
    return this.usersService.create(dto, user.id);
  }

  @Put(':id')
  @Roles(Role.Admin)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.usersService.update(id, dto, user.id);
  }

  @Delete(':id')
  @Roles(Role.Admin)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.usersService.remove(id, user.id);
  }
}
```

- [ ] **Step 6: Write UsersModule**

Create `apps/api/src/modules/users/users.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

- [ ] **Step 7: Run tests and confirm pass**

```bash
cd apps/api && pnpm test --testPathPattern=users.service.spec
```

Expected: PASS — 5 tests passing.

- [ ] **Step 8: Commit**

```bash
cd /Users/david/LifeCycleIQ_Claude
git add apps/api/src/modules/users/
git commit -m "feat: add users module with CRUD and audit logging"
```

---

## Task 9: Departments Module (TDD)

**Files:**
- Create: `departments.module.ts`, `departments.service.ts`, `departments.service.spec.ts`, `departments.controller.ts`, DTOs

- [ ] **Step 1: Create directories and write failing test**

```bash
mkdir -p apps/api/src/modules/departments/dto
```

Create `apps/api/src/modules/departments/departments.service.spec.ts`:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';

const mockPrisma = {
  department: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};
const mockAuditLog = { log: jest.fn() };

const dept = {
  id: 'dept-1',
  name: 'IT',
  budgetCode: 'IT-001',
  ownerId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('DepartmentsService', () => {
  let service: DepartmentsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepartmentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogService, useValue: mockAuditLog },
      ],
    }).compile();
    service = module.get<DepartmentsService>(DepartmentsService);
  });

  describe('findAll', () => {
    it('returns all departments', async () => {
      mockPrisma.department.findMany.mockResolvedValue([dept]);
      expect(await service.findAll()).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when not found', async () => {
      mockPrisma.department.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });

    it('returns department when found', async () => {
      mockPrisma.department.findUnique.mockResolvedValue(dept);
      const result = await service.findOne('dept-1');
      expect(result.name).toBe('IT');
    });
  });

  describe('create', () => {
    it('creates department and writes audit log', async () => {
      mockPrisma.department.create.mockResolvedValue(dept);
      await service.create({ name: 'IT' }, 'actor-id');
      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATE', entityType: 'Department' }),
      );
    });
  });

  describe('update', () => {
    it('throws NotFoundException when not found', async () => {
      mockPrisma.department.findUnique.mockResolvedValue(null);
      await expect(service.update('missing', { name: 'X' }, 'actor')).rejects.toThrow(NotFoundException);
    });

    it('updates and writes audit log', async () => {
      mockPrisma.department.findUnique.mockResolvedValue(dept);
      mockPrisma.department.update.mockResolvedValue({ ...dept, name: 'IT Updated' });
      await service.update('dept-1', { name: 'IT Updated' }, 'actor-id');
      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'UPDATE', entityType: 'Department' }),
      );
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when not found', async () => {
      mockPrisma.department.findUnique.mockResolvedValue(null);
      await expect(service.remove('missing', 'actor')).rejects.toThrow(NotFoundException);
    });

    it('deletes and writes audit log', async () => {
      mockPrisma.department.findUnique.mockResolvedValue(dept);
      mockPrisma.department.delete.mockResolvedValue(dept);
      await service.remove('dept-1', 'actor-id');
      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DELETE', entityType: 'Department', entityId: 'dept-1' }),
      );
    });
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd apps/api && pnpm test --testPathPattern=departments.service.spec
```

Expected: FAIL — `Cannot find module './departments.service'`

- [ ] **Step 3: Write DTOs**

Create `apps/api/src/modules/departments/dto/create-department.dto.ts`:
```typescript
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  budgetCode?: string;

  @IsOptional()
  @IsUUID()
  ownerId?: string;
}
```

Create `apps/api/src/modules/departments/dto/update-department.dto.ts`:
```typescript
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateDepartmentDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  budgetCode?: string;

  @IsOptional()
  @IsUUID()
  ownerId?: string;
}
```

- [ ] **Step 4: Write DepartmentsService**

Create `apps/api/src/modules/departments/departments.service.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  findAll() {
    return this.prisma.department.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const dept = await this.prisma.department.findUnique({ where: { id } });
    if (!dept) throw new NotFoundException(`Department ${id} not found`);
    return dept;
  }

  async create(dto: CreateDepartmentDto, actorId: string) {
    const dept = await this.prisma.department.create({ data: dto });
    await this.auditLog.log({
      userId: actorId,
      action: 'CREATE',
      entityType: 'Department',
      entityId: dept.id,
      newValue: { name: dept.name },
    });
    return dept;
  }

  async update(id: string, dto: UpdateDepartmentDto, actorId: string) {
    const existing = await this.findOne(id);
    const dept = await this.prisma.department.update({ where: { id }, data: dto });
    await this.auditLog.log({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Department',
      entityId: id,
      oldValue: { name: existing.name },
      newValue: { name: dept.name },
    });
    return dept;
  }

  async remove(id: string, actorId: string) {
    await this.findOne(id);
    await this.prisma.department.delete({ where: { id } });
    await this.auditLog.log({
      userId: actorId,
      action: 'DELETE',
      entityType: 'Department',
      entityId: id,
    });
    return { deleted: true };
  }
}
```

- [ ] **Step 5: Write DepartmentsController**

Create `apps/api/src/modules/departments/departments.controller.ts`:
```typescript
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { AuthUser, Role } from '@lifecycleiq/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { DepartmentsService } from './departments.service';

@Controller('departments')
export class DepartmentsController {
  constructor(private deptService: DepartmentsService) {}

  @Get()
  findAll() { return this.deptService.findAll(); }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) { return this.deptService.findOne(id); }

  @Post()
  @Roles(Role.Admin, Role.Editor)
  create(@Body() dto: CreateDepartmentDto, @CurrentUser() user: AuthUser) {
    return this.deptService.create(dto, user.id);
  }

  @Put(':id')
  @Roles(Role.Admin, Role.Editor)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDepartmentDto,
    @CurrentUser() user: AuthUser,
  ) { return this.deptService.update(id, dto, user.id); }

  @Delete(':id')
  @Roles(Role.Admin)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.deptService.remove(id, user.id);
  }
}
```

- [ ] **Step 6: Write DepartmentsModule**

Create `apps/api/src/modules/departments/departments.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { DepartmentsController } from './departments.controller';
import { DepartmentsService } from './departments.service';

@Module({
  controllers: [DepartmentsController],
  providers: [DepartmentsService],
})
export class DepartmentsModule {}
```

- [ ] **Step 7: Run tests and confirm pass**

```bash
cd apps/api && pnpm test --testPathPattern=departments.service.spec
```

Expected: PASS — 7 tests passing.

- [ ] **Step 8: Commit**

```bash
cd /Users/david/LifeCycleIQ_Claude
git add apps/api/src/modules/departments/
git commit -m "feat: add departments module with CRUD and audit logging"
```

---

## Task 10: Locations Module (TDD)

**Files:**
- Create: `locations.module.ts`, `locations.service.ts`, `locations.service.spec.ts`, `locations.controller.ts`, DTOs

- [ ] **Step 1: Create directories and write failing test**

```bash
mkdir -p apps/api/src/modules/locations/dto
```

Create `apps/api/src/modules/locations/locations.service.spec.ts`:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';

const mockPrisma = {
  location: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};
const mockAuditLog = { log: jest.fn() };

const loc = {
  id: 'loc-1',
  name: 'Main Building',
  building: 'A',
  room: '101',
  locationType: 'office',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('LocationsService', () => {
  let service: LocationsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogService, useValue: mockAuditLog },
      ],
    }).compile();
    service = module.get<LocationsService>(LocationsService);
  });

  it('findAll returns all locations', async () => {
    mockPrisma.location.findMany.mockResolvedValue([loc]);
    expect(await service.findAll()).toHaveLength(1);
  });

  it('findOne throws NotFoundException when not found', async () => {
    mockPrisma.location.findUnique.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });

  it('create writes audit log', async () => {
    mockPrisma.location.create.mockResolvedValue(loc);
    await service.create({ name: 'Main Building' }, 'actor-id');
    expect(mockAuditLog.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE', entityType: 'Location' }),
    );
  });

  it('update throws NotFoundException when not found', async () => {
    mockPrisma.location.findUnique.mockResolvedValue(null);
    await expect(service.update('missing', { name: 'X' }, 'actor')).rejects.toThrow(NotFoundException);
  });

  it('remove throws NotFoundException when not found', async () => {
    mockPrisma.location.findUnique.mockResolvedValue(null);
    await expect(service.remove('missing', 'actor')).rejects.toThrow(NotFoundException);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd apps/api && pnpm test --testPathPattern=locations.service.spec
```

Expected: FAIL — `Cannot find module './locations.service'`

- [ ] **Step 3: Write DTOs**

Create `apps/api/src/modules/locations/dto/create-location.dto.ts`:
```typescript
import { IsOptional, IsString } from 'class-validator';

export class CreateLocationDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  building?: string;

  @IsOptional()
  @IsString()
  room?: string;

  @IsOptional()
  @IsString()
  locationType?: string;
}
```

Create `apps/api/src/modules/locations/dto/update-location.dto.ts`:
```typescript
import { IsOptional, IsString } from 'class-validator';

export class UpdateLocationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  building?: string;

  @IsOptional()
  @IsString()
  room?: string;

  @IsOptional()
  @IsString()
  locationType?: string;
}
```

- [ ] **Step 4: Write LocationsService**

Create `apps/api/src/modules/locations/locations.service.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@Injectable()
export class LocationsService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  findAll() {
    return this.prisma.location.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const loc = await this.prisma.location.findUnique({ where: { id } });
    if (!loc) throw new NotFoundException(`Location ${id} not found`);
    return loc;
  }

  async create(dto: CreateLocationDto, actorId: string) {
    const loc = await this.prisma.location.create({ data: dto });
    await this.auditLog.log({
      userId: actorId,
      action: 'CREATE',
      entityType: 'Location',
      entityId: loc.id,
      newValue: { name: loc.name },
    });
    return loc;
  }

  async update(id: string, dto: UpdateLocationDto, actorId: string) {
    const existing = await this.findOne(id);
    const loc = await this.prisma.location.update({ where: { id }, data: dto });
    await this.auditLog.log({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Location',
      entityId: id,
      oldValue: { name: existing.name },
      newValue: { name: loc.name },
    });
    return loc;
  }

  async remove(id: string, actorId: string) {
    await this.findOne(id);
    await this.prisma.location.delete({ where: { id } });
    await this.auditLog.log({
      userId: actorId,
      action: 'DELETE',
      entityType: 'Location',
      entityId: id,
    });
    return { deleted: true };
  }
}
```

- [ ] **Step 5: Write LocationsController**

Create `apps/api/src/modules/locations/locations.controller.ts`:
```typescript
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { AuthUser, Role } from '@lifecycleiq/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { LocationsService } from './locations.service';

@Controller('locations')
export class LocationsController {
  constructor(private locationsService: LocationsService) {}

  @Get()
  findAll() { return this.locationsService.findAll(); }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) { return this.locationsService.findOne(id); }

  @Post()
  @Roles(Role.Admin, Role.Editor)
  create(@Body() dto: CreateLocationDto, @CurrentUser() user: AuthUser) {
    return this.locationsService.create(dto, user.id);
  }

  @Put(':id')
  @Roles(Role.Admin, Role.Editor)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLocationDto,
    @CurrentUser() user: AuthUser,
  ) { return this.locationsService.update(id, dto, user.id); }

  @Delete(':id')
  @Roles(Role.Admin)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.locationsService.remove(id, user.id);
  }
}
```

- [ ] **Step 6: Write LocationsModule**

Create `apps/api/src/modules/locations/locations.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';

@Module({
  controllers: [LocationsController],
  providers: [LocationsService],
})
export class LocationsModule {}
```

- [ ] **Step 7: Run tests and confirm pass**

```bash
cd apps/api && pnpm test --testPathPattern=locations.service.spec
```

Expected: PASS — 5 tests passing.

- [ ] **Step 8: Commit**

```bash
cd /Users/david/LifeCycleIQ_Claude
git add apps/api/src/modules/locations/
git commit -m "feat: add locations module with CRUD and audit logging"
```

---

## Task 11: Vendors Module (TDD)

**Files:**
- Create: `vendors.module.ts`, `vendors.service.ts`, `vendors.service.spec.ts`, `vendors.controller.ts`, DTOs

- [ ] **Step 1: Create directories and write failing test**

```bash
mkdir -p apps/api/src/modules/vendors/dto
```

Create `apps/api/src/modules/vendors/vendors.service.spec.ts`:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';

const mockPrisma = {
  vendor: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};
const mockAuditLog = { log: jest.fn() };

const vendor = {
  id: 'vendor-1',
  name: 'Microsoft',
  website: 'https://microsoft.com',
  accountRepName: null,
  accountRepEmail: null,
  supportEmail: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('VendorsService', () => {
  let service: VendorsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogService, useValue: mockAuditLog },
      ],
    }).compile();
    service = module.get<VendorsService>(VendorsService);
  });

  it('findAll returns all vendors', async () => {
    mockPrisma.vendor.findMany.mockResolvedValue([vendor]);
    expect(await service.findAll()).toHaveLength(1);
  });

  it('findOne throws NotFoundException when not found', async () => {
    mockPrisma.vendor.findUnique.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });

  it('create writes audit log', async () => {
    mockPrisma.vendor.create.mockResolvedValue(vendor);
    await service.create({ name: 'Microsoft' }, 'actor-id');
    expect(mockAuditLog.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE', entityType: 'Vendor' }),
    );
  });

  it('update throws NotFoundException when not found', async () => {
    mockPrisma.vendor.findUnique.mockResolvedValue(null);
    await expect(service.update('missing', { name: 'X' }, 'actor')).rejects.toThrow(NotFoundException);
  });

  it('remove throws NotFoundException when not found', async () => {
    mockPrisma.vendor.findUnique.mockResolvedValue(null);
    await expect(service.remove('missing', 'actor')).rejects.toThrow(NotFoundException);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd apps/api && pnpm test --testPathPattern=vendors.service.spec
```

Expected: FAIL — `Cannot find module './vendors.service'`

- [ ] **Step 3: Write DTOs**

Create `apps/api/src/modules/vendors/dto/create-vendor.dto.ts`:
```typescript
import { IsEmail, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateVendorDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsString()
  accountRepName?: string;

  @IsOptional()
  @IsEmail()
  accountRepEmail?: string;

  @IsOptional()
  @IsEmail()
  supportEmail?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
```

Create `apps/api/src/modules/vendors/dto/update-vendor.dto.ts`:
```typescript
import { IsEmail, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateVendorDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsString()
  accountRepName?: string;

  @IsOptional()
  @IsEmail()
  accountRepEmail?: string;

  @IsOptional()
  @IsEmail()
  supportEmail?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
```

- [ ] **Step 4: Write VendorsService**

Create `apps/api/src/modules/vendors/vendors.service.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';

@Injectable()
export class VendorsService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  findAll() {
    return this.prisma.vendor.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const vendor = await this.prisma.vendor.findUnique({ where: { id } });
    if (!vendor) throw new NotFoundException(`Vendor ${id} not found`);
    return vendor;
  }

  async create(dto: CreateVendorDto, actorId: string) {
    const vendor = await this.prisma.vendor.create({ data: dto });
    await this.auditLog.log({
      userId: actorId,
      action: 'CREATE',
      entityType: 'Vendor',
      entityId: vendor.id,
      newValue: { name: vendor.name },
    });
    return vendor;
  }

  async update(id: string, dto: UpdateVendorDto, actorId: string) {
    const existing = await this.findOne(id);
    const vendor = await this.prisma.vendor.update({ where: { id }, data: dto });
    await this.auditLog.log({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Vendor',
      entityId: id,
      oldValue: { name: existing.name },
      newValue: { name: vendor.name },
    });
    return vendor;
  }

  async remove(id: string, actorId: string) {
    await this.findOne(id);
    await this.prisma.vendor.delete({ where: { id } });
    await this.auditLog.log({
      userId: actorId,
      action: 'DELETE',
      entityType: 'Vendor',
      entityId: id,
    });
    return { deleted: true };
  }
}
```

- [ ] **Step 5: Write VendorsController**

Create `apps/api/src/modules/vendors/vendors.controller.ts`:
```typescript
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { AuthUser, Role } from '@lifecycleiq/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { VendorsService } from './vendors.service';

@Controller('vendors')
export class VendorsController {
  constructor(private vendorsService: VendorsService) {}

  @Get()
  findAll() { return this.vendorsService.findAll(); }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) { return this.vendorsService.findOne(id); }

  @Post()
  @Roles(Role.Admin, Role.Editor)
  create(@Body() dto: CreateVendorDto, @CurrentUser() user: AuthUser) {
    return this.vendorsService.create(dto, user.id);
  }

  @Put(':id')
  @Roles(Role.Admin, Role.Editor)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVendorDto,
    @CurrentUser() user: AuthUser,
  ) { return this.vendorsService.update(id, dto, user.id); }

  @Delete(':id')
  @Roles(Role.Admin)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.vendorsService.remove(id, user.id);
  }
}
```

- [ ] **Step 6: Write VendorsModule**

Create `apps/api/src/modules/vendors/vendors.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { VendorsController } from './vendors.controller';
import { VendorsService } from './vendors.service';

@Module({
  controllers: [VendorsController],
  providers: [VendorsService],
})
export class VendorsModule {}
```

- [ ] **Step 7: Run tests and confirm pass**

```bash
cd apps/api && pnpm test --testPathPattern=vendors.service.spec
```

Expected: PASS — 5 tests passing.

- [ ] **Step 8: Run all API tests**

```bash
cd apps/api && pnpm test
```

Expected: All test suites pass.

- [ ] **Step 9: Commit**

```bash
cd /Users/david/LifeCycleIQ_Claude
git add apps/api/src/modules/vendors/
git commit -m "feat: add vendors module with CRUD and audit logging"
```

---

## Task 12: Seed Data

**Files:**
- Create: `apps/api/prisma/seed.ts`

- [ ] **Step 1: Write seed script**

Create `apps/api/prisma/seed.ts`:
```typescript
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Phase 1 data...');

  const departments = await Promise.all([
    prisma.department.upsert({
      where: { id: 'dept-it-000000000000' },
      update: {},
      create: { id: 'dept-it-000000000000', name: 'Information Technology', budgetCode: 'IT-001' },
    }),
    prisma.department.upsert({
      where: { id: 'dept-fi-000000000000' },
      update: {},
      create: { id: 'dept-fi-000000000000', name: 'Finance', budgetCode: 'FIN-001' },
    }),
    prisma.department.upsert({
      where: { id: 'dept-op-000000000000' },
      update: {},
      create: { id: 'dept-op-000000000000', name: 'Operations', budgetCode: 'OPS-001' },
    }),
    prisma.department.upsert({
      where: { id: 'dept-hr-000000000000' },
      update: {},
      create: { id: 'dept-hr-000000000000', name: 'Human Resources', budgetCode: 'HR-001' },
    }),
    prisma.department.upsert({
      where: { id: 'dept-ad-000000000000' },
      update: {},
      create: { id: 'dept-ad-000000000000', name: 'Administration', budgetCode: 'ADM-001' },
    }),
  ]);
  console.log(`Created ${departments.length} departments`);

  const locations = await Promise.all([
    prisma.location.upsert({
      where: { id: 'loc-main-00000000000' },
      update: {},
      create: { id: 'loc-main-00000000000', name: 'Main Building', building: 'Main', locationType: 'office' },
    }),
    prisma.location.upsert({
      where: { id: 'loc-annx-00000000000' },
      update: {},
      create: { id: 'loc-annx-00000000000', name: 'Annex', building: 'Annex', locationType: 'office' },
    }),
    prisma.location.upsert({
      where: { id: 'loc-dc-0000000000000' },
      update: {},
      create: { id: 'loc-dc-0000000000000', name: 'Data Center', building: 'Main', room: 'B001', locationType: 'datacenter' },
    }),
    prisma.location.upsert({
      where: { id: 'loc-rem-0000000000000' },
      update: {},
      create: { id: 'loc-rem-0000000000000', name: 'Remote', locationType: 'remote' },
    }),
    prisma.location.upsert({
      where: { id: 'loc-wh-00000000000000' },
      update: {},
      create: { id: 'loc-wh-00000000000000', name: 'Warehouse', building: 'Warehouse', locationType: 'warehouse' },
    }),
  ]);
  console.log(`Created ${locations.length} locations`);

  const vendors = await Promise.all([
    prisma.vendor.upsert({ where: { id: 'vnd-ms-000000000000' }, update: {}, create: { id: 'vnd-ms-000000000000', name: 'Microsoft', website: 'https://microsoft.com', supportEmail: 'support@microsoft.com' } }),
    prisma.vendor.upsert({ where: { id: 'vnd-ap-000000000000' }, update: {}, create: { id: 'vnd-ap-000000000000', name: 'Apple', website: 'https://apple.com' } }),
    prisma.vendor.upsert({ where: { id: 'vnd-dl-000000000000' }, update: {}, create: { id: 'vnd-dl-000000000000', name: 'Dell Technologies', website: 'https://dell.com' } }),
    prisma.vendor.upsert({ where: { id: 'vnd-cs-000000000000' }, update: {}, create: { id: 'vnd-cs-000000000000', name: 'Cisco', website: 'https://cisco.com' } }),
    prisma.vendor.upsert({ where: { id: 'vnd-goo-0000000000' }, update: {}, create: { id: 'vnd-goo-0000000000', name: 'Google', website: 'https://google.com' } }),
    prisma.vendor.upsert({ where: { id: 'vnd-aws-0000000000' }, update: {}, create: { id: 'vnd-aws-0000000000', name: 'Amazon Web Services', website: 'https://aws.amazon.com' } }),
    prisma.vendor.upsert({ where: { id: 'vnd-len-0000000000' }, update: {}, create: { id: 'vnd-len-0000000000', name: 'Lenovo', website: 'https://lenovo.com' } }),
    prisma.vendor.upsert({ where: { id: 'vnd-hpe-0000000000' }, update: {}, create: { id: 'vnd-hpe-0000000000', name: 'HPE', website: 'https://hpe.com' } }),
    prisma.vendor.upsert({ where: { id: 'vnd-zmr-0000000000' }, update: {}, create: { id: 'vnd-zmr-0000000000', name: 'Zoom', website: 'https://zoom.us' } }),
    prisma.vendor.upsert({ where: { id: 'vnd-sal-0000000000' }, update: {}, create: { id: 'vnd-sal-0000000000', name: 'Salesforce', website: 'https://salesforce.com' } }),
  ]);
  console.log(`Created ${vendors.length} vendors`);

  const adminHash = await bcrypt.hash('Admin1234!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@lifecycleiq.local' },
    update: {},
    create: {
      email: 'admin@lifecycleiq.local',
      displayName: 'System Admin',
      passwordHash: adminHash,
      role: 'admin',
      departmentId: 'dept-it-000000000000',
      isActive: true,
    },
  });
  console.log(`Admin user: ${admin.email} (password: Admin1234!)`);

  console.log('Seed complete.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Add seed script to package.json (already present) and run it**

```bash
cd apps/api && pnpm db:seed
```

Expected output:
```
Seeding Phase 1 data...
Created 5 departments
Created 5 locations
Created 10 vendors
Admin user: admin@lifecycleiq.local (password: Admin1234!)
Seed complete.
```

- [ ] **Step 3: Commit**

```bash
cd /Users/david/LifeCycleIQ_Claude
git add apps/api/prisma/seed.ts
git commit -m "feat: add Phase 1 seed data"
```

---

## Task 13: Next.js Scaffold + NextAuth

**Files:**
- Create: `apps/web/package.json`, `apps/web/next.config.ts`, `apps/web/tsconfig.json`, `apps/web/tailwind.config.ts`, `apps/web/auth.ts`, `apps/web/.env.local`

- [ ] **Step 1: Create Next.js app structure**

```bash
mkdir -p apps/web/app/api/auth/\[...nextauth\] \
  apps/web/app/\(auth\)/login \
  apps/web/app/\(protected\)/dashboard \
  apps/web/app/\(protected\)/decisions \
  apps/web/app/\(protected\)/assets \
  apps/web/app/\(protected\)/software \
  apps/web/app/\(protected\)/contracts \
  apps/web/app/\(protected\)/budget \
  apps/web/app/\(protected\)/scenarios \
  apps/web/app/\(protected\)/reports \
  apps/web/app/\(protected\)/imports \
  apps/web/app/\(protected\)/settings/users \
  apps/web/app/\(protected\)/settings/departments \
  apps/web/app/\(protected\)/settings/locations \
  apps/web/app/\(protected\)/settings/vendors \
  apps/web/components/layout \
  apps/web/components/settings \
  apps/web/lib/actions
```

- [ ] **Step 2: Create package.json**

Create `apps/web/package.json`:
```json
{
  "name": "@lifecycleiq/web",
  "version": "0.0.1",
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "@lifecycleiq/shared": "workspace:*",
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "next-auth": "^5.0.0-beta.25",
    "tailwindcss": "^3.4.0",
    "@tailwindcss/forms": "^0.5.7",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "clsx": "^2.1.0",
    "lucide-react": "^0.400.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 3: Create Next.js and TypeScript config**

Create `apps/web/next.config.ts`:
```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@lifecycleiq/shared'],
};

export default nextConfig;
```

Create `apps/web/tsconfig.json`:
```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"],
      "@lifecycleiq/shared": ["../../packages/shared/src/index.ts"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create Tailwind config**

Create `apps/web/tailwind.config.ts`:
```typescript
import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: { extend: {} },
  plugins: [forms],
};

export default config;
```

Create `apps/web/postcss.config.mjs`:
```javascript
const config = {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
export default config;
```

- [ ] **Step 5: Create environment file**

Create `apps/web/.env.local`:
```
NEXTAUTH_URL=http://localhost:3000
AUTH_SECRET=replace-with-long-random-string-min-32-chars
API_URL=http://localhost:3001
```

- [ ] **Step 6: Write NextAuth v5 config**

Create `apps/web/auth.ts`:
```typescript
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const res = await fetch(`${process.env.API_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          if (!res.ok) return null;

          const data = await res.json();
          return {
            id: data.user.id,
            email: data.user.email,
            name: data.user.displayName,
            role: data.user.role,
            accessToken: data.accessToken,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.accessToken = (user as any).accessToken;
      }
      return token;
    },
    session({ session, token }) {
      (session.user as any).role = token.role;
      (session.user as any).accessToken = token.accessToken;
      return session;
    },
  },
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
});
```

- [ ] **Step 7: Create NextAuth route handler**

Create `apps/web/app/api/auth/[...nextauth]/route.ts`:
```typescript
import { handlers } from '@/auth';
export const { GET, POST } = handlers;
```

- [ ] **Step 8: Write API client**

Create `apps/web/lib/api.ts`:
```typescript
import { auth } from '@/auth';

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(detail);
  }
}

export async function apiServer<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const session = await auth();
  const token = (session?.user as any)?.accessToken;

  const res = await fetch(`${process.env.API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.detail ?? `API error ${res.status}`);
  }

  return res.json();
}
```

- [ ] **Step 9: Install dependencies**

```bash
cd apps/web && pnpm install
```

- [ ] **Step 10: Commit**

```bash
cd /Users/david/LifeCycleIQ_Claude
git add apps/web/
git commit -m "feat: scaffold Next.js app with NextAuth v5 and API client"
```

---

## Task 14: App Layout, Sidebar, and Placeholder Pages

**Files:**
- Create: `app/layout.tsx`, `app/(protected)/layout.tsx`, sidebar, header, middleware, placeholder pages

- [ ] **Step 1: Write root layout**

Create `apps/web/app/layout.tsx`:
```typescript
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LifecycleIQ',
  description: 'Technology budget and lifecycle management',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
```

Create `apps/web/app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 2: Write middleware for route protection**

Create `apps/web/middleware.ts`:
```typescript
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith('/login');
  const isApiAuth = req.nextUrl.pathname.startsWith('/api/auth');

  if (isApiAuth) return NextResponse.next();
  if (!isLoggedIn && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', req.nextUrl));
  }
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

- [ ] **Step 3: Write sidebar component**

Create `apps/web/components/layout/sidebar.tsx`:
```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  CheckSquare,
  Monitor,
  Package,
  FileText,
  TrendingUp,
  GitBranch,
  BarChart2,
  Upload,
  Settings,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Decisions', href: '/decisions', icon: CheckSquare },
  { label: 'Assets', href: '/assets', icon: Monitor },
  { label: 'Software', href: '/software', icon: Package },
  { label: 'Contracts', href: '/contracts', icon: FileText },
  { label: 'Budget Roadmap', href: '/budget', icon: TrendingUp },
  { label: 'Scenarios', href: '/scenarios', icon: GitBranch },
  { label: 'Reports', href: '/reports', icon: BarChart2 },
  { label: 'Imports', href: '/imports', icon: Upload },
  { label: 'Settings', href: '/settings/users', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 bg-slate-900 text-slate-100 flex flex-col h-screen fixed left-0 top-0">
      <div className="px-4 py-5 border-b border-slate-700">
        <span className="text-lg font-semibold tracking-tight text-white">LifecycleIQ</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {navItems.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium mb-1 transition-colors',
              pathname.startsWith(href)
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white',
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 4: Write header component**

Create `apps/web/components/layout/header.tsx`:
```typescript
import { auth, signOut } from '@/auth';

export async function Header() {
  const session = await auth();

  return (
    <header className="h-14 border-b bg-white flex items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">
          {session?.user?.name ?? session?.user?.email}
        </span>
        <form
          action={async () => {
            'use server';
            await signOut({ redirectTo: '/login' });
          }}
        >
          <button
            type="submit"
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
```

- [ ] **Step 5: Write protected layout**

Create `apps/web/app/(protected)/layout.tsx`:
```typescript
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 ml-56 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Write placeholder pages**

Create `apps/web/app/page.tsx` (root redirect):
```typescript
import { redirect } from 'next/navigation';
export default function Home() { redirect('/dashboard'); }
```

For each placeholder route, create a `page.tsx`. Create `apps/web/app/(protected)/dashboard/page.tsx`:
```typescript
export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      <p className="mt-2 text-gray-500">Coming in Phase 4 — executive summary, upcoming decisions, and budget roadmap charts.</p>
    </div>
  );
}
```

Create `apps/web/app/(protected)/decisions/page.tsx`:
```typescript
export default function DecisionsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Decisions</h1>
      <p className="mt-2 text-gray-500">Coming in Phase 4 — central workflow for reviewing and acting on technology decisions.</p>
    </div>
  );
}
```

Create `apps/web/app/(protected)/assets/page.tsx`:
```typescript
export default function AssetsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Hardware Assets</h1>
      <p className="mt-2 text-gray-500">Coming in Phase 2 — hardware inventory, lifecycle status, and replacement planning.</p>
    </div>
  );
}
```

Create `apps/web/app/(protected)/software/page.tsx`:
```typescript
export default function SoftwarePage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Software & SaaS</h1>
      <p className="mt-2 text-gray-500">Coming in Phase 2 — software inventory, license utilization, and renewal tracking.</p>
    </div>
  );
}
```

Create `apps/web/app/(protected)/contracts/page.tsx`:
```typescript
export default function ContractsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Contracts</h1>
      <p className="mt-2 text-gray-500">Coming in Phase 2 — contract tracking, renewal alerts, and cancellation deadlines.</p>
    </div>
  );
}
```

Create `apps/web/app/(protected)/budget/page.tsx`:
```typescript
export default function BudgetPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Budget Roadmap</h1>
      <p className="mt-2 text-gray-500">Coming in Phase 3 — 1–7 year OpEx and CapEx forecast.</p>
    </div>
  );
}
```

Create `apps/web/app/(protected)/scenarios/page.tsx`:
```typescript
export default function ScenariosPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Scenarios</h1>
      <p className="mt-2 text-gray-500">Coming in Phase 5 — scenario creation and side-by-side comparison.</p>
    </div>
  );
}
```

Create `apps/web/app/(protected)/reports/page.tsx`:
```typescript
export default function ReportsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>
      <p className="mt-2 text-gray-500">Coming in Phase 5 — executive budget summary, renewal review, and capital replacement reports.</p>
    </div>
  );
}
```

Create `apps/web/app/(protected)/imports/page.tsx`:
```typescript
export default function ImportsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Imports</h1>
      <p className="mt-2 text-gray-500">Coming in Phase 2 — CSV/XLSX import for assets, software, and contracts.</p>
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
cd /Users/david/LifeCycleIQ_Claude
git add apps/web/
git commit -m "feat: add Next.js layout, sidebar, and placeholder pages"
```

---

## Task 15: Login Page

**Files:**
- Create: `app/(auth)/login/page.tsx`

- [ ] **Step 1: Write login page**

Create `apps/web/app/(auth)/login/page.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError('Invalid email or password.');
    } else {
      router.push('/dashboard');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h1 className="text-xl font-semibold text-gray-900 mb-1">LifecycleIQ</h1>
          <p className="text-sm text-gray-500 mb-6">Sign in to your account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-slate-500 focus:ring-slate-500"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-slate-500 focus:ring-slate-500"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/david/LifeCycleIQ_Claude
git add apps/web/app/\(auth\)/
git commit -m "feat: add login page with NextAuth credentials sign-in"
```

---

## Task 16: Settings CRUD Pages

**Files:**
- Create: Server Actions for all four resources, settings pages, DataTable component

- [ ] **Step 1: Write reusable DataTable component**

Create `apps/web/components/settings/data-table.tsx`:
```typescript
'use client';

import { useState } from 'react';

interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => string);
}

interface DataTableProps<T extends { id: string }> {
  data: T[];
  columns: Column<T>[];
  onDelete?: (id: string) => void;
  onEdit?: (row: T) => void;
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  onDelete,
  onEdit,
}: DataTableProps<T>) {
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!onDelete) return;
    setDeleting(id);
    await onDelete(id);
    setDeleting(null);
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.header)}
                className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wide text-xs"
              >
                {col.header}
              </th>
            ))}
            {(onEdit || onDelete) && (
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {data.length === 0 && (
            <tr>
              <td
                colSpan={columns.length + 1}
                className="px-4 py-8 text-center text-gray-400"
              >
                No records found.
              </td>
            </tr>
          )}
          {data.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50 transition-colors">
              {columns.map((col) => (
                <td key={String(col.header)} className="px-4 py-3 text-gray-700">
                  {typeof col.accessor === 'function'
                    ? col.accessor(row)
                    : String(row[col.accessor] ?? '—')}
                </td>
              ))}
              {(onEdit || onDelete) && (
                <td className="px-4 py-3 text-right space-x-3">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(row)}
                      className="text-slate-600 hover:text-slate-900 text-sm font-medium"
                    >
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => handleDelete(row.id)}
                      disabled={deleting === row.id}
                      className="text-red-500 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                    >
                      {deleting === row.id ? 'Deleting…' : 'Delete'}
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Write Server Actions for Departments**

Create `apps/web/lib/actions/departments.ts`:
```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { apiServer } from '@/lib/api';
import type { Department, CreateDepartmentInput, UpdateDepartmentInput } from '@lifecycleiq/shared';

export async function getDepartments(): Promise<Department[]> {
  return apiServer('/api/v1/departments');
}

export async function createDepartment(data: CreateDepartmentInput): Promise<Department> {
  const dept = await apiServer<Department>('/api/v1/departments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  revalidatePath('/settings/departments');
  return dept;
}

export async function updateDepartment(id: string, data: UpdateDepartmentInput): Promise<Department> {
  const dept = await apiServer<Department>(`/api/v1/departments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  revalidatePath('/settings/departments');
  return dept;
}

export async function deleteDepartment(id: string): Promise<void> {
  await apiServer(`/api/v1/departments/${id}`, { method: 'DELETE' });
  revalidatePath('/settings/departments');
}
```

- [ ] **Step 3: Write Departments settings page**

Create `apps/web/app/(protected)/settings/departments/page.tsx`:
```typescript
import { getDepartments } from '@/lib/actions/departments';
import { DepartmentsClient } from './client';

export default async function DepartmentsPage() {
  const departments = await getDepartments();
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Departments</h1>
      </div>
      <DepartmentsClient initialData={departments} />
    </div>
  );
}
```

Create `apps/web/app/(protected)/settings/departments/client.tsx`:
```typescript
'use client';

import { useState, useTransition } from 'react';
import { DataTable } from '@/components/settings/data-table';
import { createDepartment, updateDepartment, deleteDepartment } from '@/lib/actions/departments';
import type { Department } from '@lifecycleiq/shared';

interface Props { initialData: Department[] }

export function DepartmentsClient({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [editing, setEditing] = useState<Department | null>(null);
  const [name, setName] = useState('');
  const [budgetCode, setBudgetCode] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [pending, startTransition] = useTransition();

  function openCreate() {
    setEditing(null);
    setName('');
    setBudgetCode('');
    setShowForm(true);
  }

  function openEdit(row: Department) {
    setEditing(row);
    setName(row.name);
    setBudgetCode(row.budgetCode ?? '');
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      if (editing) {
        const updated = await updateDepartment(editing.id, { name, budgetCode: budgetCode || undefined });
        setData((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      } else {
        const created = await createDepartment({ name, budgetCode: budgetCode || undefined });
        setData((prev) => [...prev, created]);
      }
      setShowForm(false);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteDepartment(id);
      setData((prev) => prev.filter((d) => d.id !== id));
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-700"
        >
          Add Department
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 max-w-md">
          <h2 className="font-medium text-gray-900 mb-4">
            {editing ? 'Edit Department' : 'New Department'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border-gray-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Budget Code</label>
              <input
                value={budgetCode}
                onChange={(e) => setBudgetCode(e.target.value)}
                className="w-full rounded-md border-gray-300 text-sm"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={pending}
                className="px-4 py-2 bg-slate-900 text-white text-sm rounded-md disabled:opacity-50"
              >
                {pending ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <DataTable
        data={data}
        columns={[
          { header: 'Name', accessor: 'name' },
          { header: 'Budget Code', accessor: (r) => r.budgetCode ?? '—' },
        ]}
        onEdit={openEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}
```

- [ ] **Step 4: Write Server Actions and pages for Locations**

Create `apps/web/lib/actions/locations.ts`:
```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { apiServer } from '@/lib/api';
import type { Location, CreateLocationInput, UpdateLocationInput } from '@lifecycleiq/shared';

export async function getLocations(): Promise<Location[]> {
  return apiServer('/api/v1/locations');
}

export async function createLocation(data: CreateLocationInput): Promise<Location> {
  const loc = await apiServer<Location>('/api/v1/locations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  revalidatePath('/settings/locations');
  return loc;
}

export async function updateLocation(id: string, data: UpdateLocationInput): Promise<Location> {
  const loc = await apiServer<Location>(`/api/v1/locations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  revalidatePath('/settings/locations');
  return loc;
}

export async function deleteLocation(id: string): Promise<void> {
  await apiServer(`/api/v1/locations/${id}`, { method: 'DELETE' });
  revalidatePath('/settings/locations');
}
```

Create `apps/web/app/(protected)/settings/locations/page.tsx`:
```typescript
import { getLocations } from '@/lib/actions/locations';
import { LocationsClient } from './client';

export default async function LocationsPage() {
  const locations = await getLocations();
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Locations</h1>
      </div>
      <LocationsClient initialData={locations} />
    </div>
  );
}
```

Create `apps/web/app/(protected)/settings/locations/client.tsx`:
```typescript
'use client';

import { useState, useTransition } from 'react';
import { DataTable } from '@/components/settings/data-table';
import { createLocation, updateLocation, deleteLocation } from '@/lib/actions/locations';
import type { Location } from '@lifecycleiq/shared';

interface Props { initialData: Location[] }

export function LocationsClient({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [editing, setEditing] = useState<Location | null>(null);
  const [name, setName] = useState('');
  const [building, setBuilding] = useState('');
  const [room, setRoom] = useState('');
  const [locationType, setLocationType] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [pending, startTransition] = useTransition();

  function openCreate() {
    setEditing(null); setName(''); setBuilding(''); setRoom(''); setLocationType('');
    setShowForm(true);
  }

  function openEdit(row: Location) {
    setEditing(row); setName(row.name); setBuilding(row.building ?? '');
    setRoom(row.room ?? ''); setLocationType(row.locationType ?? '');
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name,
      building: building || undefined,
      room: room || undefined,
      locationType: locationType || undefined,
    };
    startTransition(async () => {
      if (editing) {
        const updated = await updateLocation(editing.id, payload);
        setData((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      } else {
        const created = await createLocation(payload);
        setData((prev) => [...prev, created]);
      }
      setShowForm(false);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteLocation(id);
      setData((prev) => prev.filter((l) => l.id !== id));
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={openCreate} className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-700">
          Add Location
        </button>
      </div>
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 max-w-md">
          <h2 className="font-medium text-gray-900 mb-4">{editing ? 'Edit Location' : 'New Location'}</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border-gray-300 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Building</label>
              <input value={building} onChange={(e) => setBuilding(e.target.value)} className="w-full rounded-md border-gray-300 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
              <input value={room} onChange={(e) => setRoom(e.target.value)} className="w-full rounded-md border-gray-300 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={locationType} onChange={(e) => setLocationType(e.target.value)} className="w-full rounded-md border-gray-300 text-sm">
                <option value="">—</option>
                <option value="office">Office</option>
                <option value="datacenter">Data Center</option>
                <option value="warehouse">Warehouse</option>
                <option value="remote">Remote</option>
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={pending} className="px-4 py-2 bg-slate-900 text-white text-sm rounded-md disabled:opacity-50">{pending ? 'Saving…' : 'Save'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
            </div>
          </form>
        </div>
      )}
      <DataTable
        data={data}
        columns={[
          { header: 'Name', accessor: 'name' },
          { header: 'Building', accessor: (r) => r.building ?? '—' },
          { header: 'Room', accessor: (r) => r.room ?? '—' },
          { header: 'Type', accessor: (r) => r.locationType ?? '—' },
        ]}
        onEdit={openEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}
```

- [ ] **Step 5: Write Server Actions and pages for Vendors**

Create `apps/web/lib/actions/vendors.ts`:
```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { apiServer } from '@/lib/api';
import type { Vendor, CreateVendorInput, UpdateVendorInput } from '@lifecycleiq/shared';

export async function getVendors(): Promise<Vendor[]> {
  return apiServer('/api/v1/vendors');
}

export async function createVendor(data: CreateVendorInput): Promise<Vendor> {
  const vendor = await apiServer<Vendor>('/api/v1/vendors', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  revalidatePath('/settings/vendors');
  return vendor;
}

export async function updateVendor(id: string, data: UpdateVendorInput): Promise<Vendor> {
  const vendor = await apiServer<Vendor>(`/api/v1/vendors/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  revalidatePath('/settings/vendors');
  return vendor;
}

export async function deleteVendor(id: string): Promise<void> {
  await apiServer(`/api/v1/vendors/${id}`, { method: 'DELETE' });
  revalidatePath('/settings/vendors');
}
```

Create `apps/web/app/(protected)/settings/vendors/page.tsx`:
```typescript
import { getVendors } from '@/lib/actions/vendors';
import { VendorsClient } from './client';

export default async function VendorsPage() {
  const vendors = await getVendors();
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Vendors</h1>
      </div>
      <VendorsClient initialData={vendors} />
    </div>
  );
}
```

Create `apps/web/app/(protected)/settings/vendors/client.tsx`:
```typescript
'use client';

import { useState, useTransition } from 'react';
import { DataTable } from '@/components/settings/data-table';
import { createVendor, updateVendor, deleteVendor } from '@/lib/actions/vendors';
import type { Vendor } from '@lifecycleiq/shared';

interface Props { initialData: Vendor[] }

export function VendorsClient({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [form, setForm] = useState({ name: '', website: '', accountRepName: '', accountRepEmail: '', supportEmail: '', notes: '' });
  const [showForm, setShowForm] = useState(false);
  const [pending, startTransition] = useTransition();

  function openCreate() {
    setEditing(null);
    setForm({ name: '', website: '', accountRepName: '', accountRepEmail: '', supportEmail: '', notes: '' });
    setShowForm(true);
  }

  function openEdit(row: Vendor) {
    setEditing(row);
    setForm({
      name: row.name,
      website: row.website ?? '',
      accountRepName: row.accountRepName ?? '',
      accountRepEmail: row.accountRepEmail ?? '',
      supportEmail: row.supportEmail ?? '',
      notes: row.notes ?? '',
    });
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v || undefined])
    ) as any;
    startTransition(async () => {
      if (editing) {
        const updated = await updateVendor(editing.id, payload);
        setData((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
      } else {
        const created = await createVendor(payload);
        setData((prev) => [...prev, created]);
      }
      setShowForm(false);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteVendor(id);
      setData((prev) => prev.filter((v) => v.id !== id));
    });
  }

  const field = (key: keyof typeof form, label: string, type = 'text') => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="w-full rounded-md border-gray-300 text-sm"
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={openCreate} className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-700">
          Add Vendor
        </button>
      </div>
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 max-w-md">
          <h2 className="font-medium text-gray-900 mb-4">{editing ? 'Edit Vendor' : 'New Vendor'}</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full rounded-md border-gray-300 text-sm" />
            </div>
            {field('website', 'Website', 'url')}
            {field('accountRepName', 'Account Rep Name')}
            {field('accountRepEmail', 'Account Rep Email', 'email')}
            {field('supportEmail', 'Support Email', 'email')}
            {field('notes', 'Notes')}
            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={pending} className="px-4 py-2 bg-slate-900 text-white text-sm rounded-md disabled:opacity-50">{pending ? 'Saving…' : 'Save'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
            </div>
          </form>
        </div>
      )}
      <DataTable
        data={data}
        columns={[
          { header: 'Name', accessor: 'name' },
          { header: 'Website', accessor: (r) => r.website ?? '—' },
          { header: 'Account Rep', accessor: (r) => r.accountRepName ?? '—' },
          { header: 'Support Email', accessor: (r) => r.supportEmail ?? '—' },
        ]}
        onEdit={openEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}
```

- [ ] **Step 6: Write Server Actions and pages for Users**

Create `apps/web/lib/actions/users.ts`:
```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { apiServer } from '@/lib/api';
import type { User } from '@lifecycleiq/shared';

export async function getUsers(): Promise<User[]> {
  return apiServer('/api/v1/users');
}

export async function createUser(data: {
  email: string;
  password: string;
  displayName: string;
  role: string;
  departmentId?: string;
}): Promise<User> {
  const user = await apiServer<User>('/api/v1/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  revalidatePath('/settings/users');
  return user;
}

export async function updateUser(
  id: string,
  data: { displayName?: string; role?: string; isActive?: boolean },
): Promise<User> {
  const user = await apiServer<User>(`/api/v1/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  revalidatePath('/settings/users');
  return user;
}

export async function deleteUser(id: string): Promise<void> {
  await apiServer(`/api/v1/users/${id}`, { method: 'DELETE' });
  revalidatePath('/settings/users');
}
```

Create `apps/web/app/(protected)/settings/users/page.tsx`:
```typescript
import { getUsers } from '@/lib/actions/users';
import { UsersClient } from './client';

export default async function UsersPage() {
  const users = await getUsers();
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
      </div>
      <UsersClient initialData={users} />
    </div>
  );
}
```

Create `apps/web/app/(protected)/settings/users/client.tsx`:
```typescript
'use client';

import { useState, useTransition } from 'react';
import { DataTable } from '@/components/settings/data-table';
import { createUser, updateUser, deleteUser } from '@/lib/actions/users';
import { Role } from '@lifecycleiq/shared';
import type { User } from '@lifecycleiq/shared';

const ROLES = [
  { value: Role.Admin, label: 'Admin' },
  { value: Role.Editor, label: 'Editor' },
  { value: Role.FinanceViewer, label: 'Finance Viewer' },
  { value: Role.DepartmentViewer, label: 'Department Viewer' },
  { value: Role.Viewer, label: 'Viewer' },
];

interface Props { initialData: User[] }

export function UsersClient({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ email: '', password: '', displayName: '', role: Role.Viewer });
  const [showForm, setShowForm] = useState(false);
  const [pending, startTransition] = useTransition();

  function openCreate() {
    setEditing(null);
    setForm({ email: '', password: '', displayName: '', role: Role.Viewer });
    setShowForm(true);
  }

  function openEdit(row: User) {
    setEditing(row);
    setForm({ email: row.email, password: '', displayName: row.displayName, role: row.role });
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      if (editing) {
        const updated = await updateUser(editing.id, {
          displayName: form.displayName,
          role: form.role,
        });
        setData((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      } else {
        const created = await createUser({
          email: form.email,
          password: form.password,
          displayName: form.displayName,
          role: form.role,
        });
        setData((prev) => [...prev, created]);
      }
      setShowForm(false);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteUser(id);
      setData((prev) => prev.filter((u) => u.id !== id));
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={openCreate} className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-700">
          Add User
        </button>
      </div>
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 max-w-md">
          <h2 className="font-medium text-gray-900 mb-4">{editing ? 'Edit User' : 'New User'}</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            {!editing && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input required type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="w-full rounded-md border-gray-300 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                  <input required type="password" minLength={8} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className="w-full rounded-md border-gray-300 text-sm" />
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Name *</label>
              <input required value={form.displayName} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} className="w-full rounded-md border-gray-300 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
              <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))} className="w-full rounded-md border-gray-300 text-sm">
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={pending} className="px-4 py-2 bg-slate-900 text-white text-sm rounded-md disabled:opacity-50">{pending ? 'Saving…' : 'Save'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
            </div>
          </form>
        </div>
      )}
      <DataTable
        data={data}
        columns={[
          { header: 'Name', accessor: 'displayName' },
          { header: 'Email', accessor: 'email' },
          { header: 'Role', accessor: 'role' },
          { header: 'Active', accessor: (r) => r.isActive ? 'Yes' : 'No' },
        ]}
        onEdit={openEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}
```

- [ ] **Step 7: Commit all settings pages**

```bash
cd /Users/david/LifeCycleIQ_Claude
git add apps/web/
git commit -m "feat: add settings CRUD pages for users, departments, locations, vendors"
```

---

## Task 17: Final Verification

- [ ] **Step 1: Start NestJS API and confirm it boots**

```bash
cd apps/api && pnpm dev
```

Expected: `API running on http://localhost:3001/api/v1`

- [ ] **Step 2: Test login endpoint**

```bash
curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lifecycleiq.local","password":"Admin1234!"}' | jq .
```

Expected: `{ "accessToken": "...", "user": { "id": "...", "email": "admin@lifecycleiq.local", "role": "admin" } }`

- [ ] **Step 3: Test protected endpoint without token**

```bash
curl -s http://localhost:3001/api/v1/departments | jq .
```

Expected: `{ "status": 401, "title": "Unauthorized", ... }`

- [ ] **Step 4: Test protected endpoint with token**

```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lifecycleiq.local","password":"Admin1234!"}' | jq -r '.accessToken')

curl -s http://localhost:3001/api/v1/departments \
  -H "Authorization: Bearer $TOKEN" | jq .
```

Expected: Array of 5 departments from seed data.

- [ ] **Step 5: Run all API tests**

```bash
cd apps/api && pnpm test
```

Expected: All test suites pass with no failures.

- [ ] **Step 6: Start Next.js app**

In a second terminal:
```bash
cd apps/web && pnpm dev
```

Expected: `Ready - started server on http://localhost:3000`

- [ ] **Step 7: Verify login flow in browser**

1. Open http://localhost:3000 — should redirect to /login
2. Enter `admin@lifecycleiq.local` / `Admin1234!` — should redirect to /dashboard
3. Sidebar should show all 10 nav items
4. Navigate to /settings/departments — should show 5 seeded departments
5. Create a new department — should appear in the table
6. Sign out — should redirect to /login

- [ ] **Step 8: Final commit**

```bash
cd /Users/david/LifeCycleIQ_Claude
git add .
git commit -m "feat: complete Phase 1 foundation — auth, CRUD, settings UI"
```

---

## Definition of Done Checklist

- [ ] Turborepo monorepo runs with `pnpm dev`
- [ ] Supabase schema migrated, seed data loaded
- [ ] NestJS API starts on port 3001, all endpoints respond
- [ ] `POST /auth/login` returns JWT for valid credentials
- [ ] Unauthenticated requests return 401
- [ ] Admin-only endpoints reject non-admin users with 403
- [ ] All write operations create audit log entries
- [ ] All unit tests pass
- [ ] Next.js app starts on port 3000
- [ ] Login → redirect to dashboard
- [ ] Sidebar renders all 10 navigation items
- [ ] Settings pages: list, create, edit, delete for users/departments/locations/vendors
- [ ] Sign out returns to /login
