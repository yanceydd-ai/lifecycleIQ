# LifecycleIQ Phase 1 — Foundation Design

**Date:** 2026-04-29  
**Status:** Approved  
**PRD reference:** `LifecycleIQ_PRD.md`

---

## 1. Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Backend | NestJS (TypeScript) | Full TypeScript stack, shared types with frontend |
| Structure | Monorepo (Turborepo) | Shared types package, one git history, tight frontend/backend coupling |
| Auth | NextAuth.js (CredentialsProvider) | Clean upgrade path to Entra ID SSO post-MVP |
| Database | Supabase (hosted PostgreSQL) | MCP-accessible, no local setup required |
| ORM | Prisma | Type-safe queries, migration management |
| API style | REST (`/api/v1/`) | Matches PRD spec, future-proof for integrations |

---

## 2. Repository Structure

```
lifecycleiq/
├── apps/
│   ├── web/                        ← Next.js 14 (App Router)
│   │   ├── app/                    ← Pages and layouts
│   │   ├── components/             ← UI components (shadcn/ui)
│   │   └── lib/
│   │       ├── auth.ts             ← NextAuth config
│   │       └── api.ts              ← API client (attaches JWT)
│   └── api/                        ← NestJS
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── users/
│       │   │   ├── departments/
│       │   │   ├── locations/
│       │   │   ├── vendors/
│       │   │   └── audit-log/
│       │   ├── common/
│       │   │   ├── guards/         ← JwtAuthGuard, RolesGuard
│       │   │   ├── decorators/     ← @Roles(), @CurrentUser()
│       │   │   ├── filters/        ← Global exception filter (RFC 7807)
│       │   │   └── pipes/          ← ValidationPipe config
│       │   └── prisma/
│       │       └── prisma.service.ts
│       └── prisma/
│           ├── schema.prisma       ← Single source of truth for DB
│           └── seed.ts             ← Sample data
├── packages/
│   └── shared/
│       ├── types/                  ← Shared TypeScript interfaces
│       └── enums/                  ← Role, status, and type enums
└── turbo.json
```

---

## 3. Auth Flow

```
1. User submits email + password → POST /api/v1/auth/login
2. NestJS validates credentials (bcrypt compare), returns { user, accessToken }
3. NextAuth CredentialsProvider stores JWT in httpOnly session cookie
4. Frontend api.ts attaches JWT as Authorization: Bearer <token> on every request
5. NestJS JwtAuthGuard validates token signature and expiry on every protected route
6. NestJS RolesGuard checks user.role against @Roles() decorator on the handler
7. Unauthorized → 401; Forbidden role → 403
```

**JWT payload:** `{ sub: userId, email: string, role: Role }`  
No database lookup per request — role is embedded in token.

**Post-MVP Entra ID upgrade:** Swap NextAuth CredentialsProvider for Azure AD provider. NestJS guard logic unchanged.

---

## 4. Roles

Defined in `packages/shared/enums/role.enum.ts`:

| Role | Description |
|---|---|
| `admin` | Full access — manage users, all records, settings, delete/archive |
| `editor` | Create/edit assigned records, manage scenarios, export reports |
| `finance_viewer` | Read forecasts, contracts, reports; export budget data |
| `department_viewer` | Read own department's items, add notes |
| `viewer` | Dashboards and reports only |

Enforced exclusively at the NestJS API layer. UI hides unavailable actions, but the API is the enforcement point.

---

## 5. Database Design

**ORM:** Prisma, schema at `apps/api/prisma/schema.prisma`  
**Host:** Supabase (PostgreSQL)

**Global conventions:**
- All IDs: `String @id @default(uuid())`
- All currency: `Decimal` (never `Float`)
- All timestamps: `DateTime @default(now())`
- Soft deletes: `archivedAt DateTime?` on assets, software, contracts (Phase 2+)
- Phase 1 entities (User, Department, Location, Vendor) use hard deletes — no FK dependencies yet
- `AuditLog` is append-only — no updates or deletes

**Phase 1 tables (migrated now):**

```prisma
model User {
  id          String    @id @default(uuid())
  email       String    @unique
  displayName String
  passwordHash String
  role        Role      @default(viewer)
  departmentId String?
  department  Department? @relation(fields: [departmentId], references: [id])
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Department {
  id         String   @id @default(uuid())
  name       String
  budgetCode String?
  ownerId    String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

model Location {
  id           String   @id @default(uuid())
  name         String
  building     String?
  room         String?
  locationType String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model Vendor {
  id               String   @id @default(uuid())
  name             String
  website          String?
  accountRepName   String?
  accountRepEmail  String?
  supportEmail     String?
  notes            String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}

model AuditLog {
  id         String   @id @default(uuid())
  userId     String?
  action     String
  entityType String
  entityId   String
  oldValue   Json?
  newValue   Json?
  createdAt  DateTime @default(now())
}
```

**Phase 2–4 tables** (hardware, software, contracts, budget, scenarios, recommendations, alerts, decision history) are defined in the PRD and will be added in subsequent phases.

---

## 6. API Design

**Base URL:** `/api/v1/`  
**Error format:** RFC 7807 Problem Details

```json
{ "status": 404, "title": "Not Found", "detail": "Vendor abc123 not found" }
```

**Global NestJS config:**
- `ValidationPipe` — strips unknown fields, validates all DTOs
- `ParseUUIDPipe` — on all `:id` route params
- `JwtAuthGuard` — applied globally, `@Public()` decorator for unprotected routes

**Phase 1 endpoints:**

```
POST   /api/v1/auth/login
POST   /api/v1/auth/logout

GET    /api/v1/users
GET    /api/v1/users/:id
POST   /api/v1/users           [admin]
PUT    /api/v1/users/:id       [admin]
DELETE /api/v1/users/:id       [admin]

GET    /api/v1/departments
GET    /api/v1/departments/:id
POST   /api/v1/departments     [admin, editor]
PUT    /api/v1/departments/:id [admin, editor]
DELETE /api/v1/departments/:id [admin]

GET    /api/v1/locations
GET    /api/v1/locations/:id
POST   /api/v1/locations       [admin, editor]
PUT    /api/v1/locations/:id   [admin, editor]
DELETE /api/v1/locations/:id   [admin]

GET    /api/v1/vendors
GET    /api/v1/vendors/:id
POST   /api/v1/vendors         [admin, editor]
PUT    /api/v1/vendors/:id     [admin, editor]
DELETE /api/v1/vendors/:id     [admin]

GET    /api/v1/audit-log       [admin]
GET    /api/v1/audit-log/:entityType/:entityId [admin, editor]
```

Every write endpoint appends to `AuditLog` before returning.

---

## 7. Frontend — Phase 1 Pages

| Route | Description |
|---|---|
| `/login` | Email/password login form, public |
| `/` | Redirect to `/dashboard` |
| `/dashboard` | Placeholder — Phase 4 |
| `/decisions` | Placeholder — Phase 4 |
| `/assets` | Placeholder — Phase 2 |
| `/software` | Placeholder — Phase 2 |
| `/contracts` | Placeholder — Phase 2 |
| `/budget` | Placeholder — Phase 3 |
| `/scenarios` | Placeholder — Phase 5 |
| `/reports` | Placeholder — Phase 5 |
| `/imports` | Placeholder — Phase 2 |
| `/settings/users` | User list + create/edit |
| `/settings/departments` | Department list + create/edit |
| `/settings/locations` | Location list + create/edit |
| `/settings/vendors` | Vendor list + create/edit |

**Sidebar navigation** renders all 10 top-level items. Placeholder pages show a "Coming in Phase X" message. Authenticated routes redirect to `/login` if no session.

---

## 8. Shared Package

`packages/shared` exports:

```typescript
// enums/role.enum.ts — string enum so values survive DB round-trips
export enum Role {
  Admin = 'admin',
  Editor = 'editor',
  FinanceViewer = 'finance_viewer',
  DepartmentViewer = 'department_viewer',
  Viewer = 'viewer',
}

// types/user.ts
export interface User { id: string; email: string; displayName: string; role: Role; ... }

// types/department.ts, location.ts, vendor.ts, audit-log.ts
```

Both `apps/web` and `apps/api` import from `@lifecycleiq/shared`.

---

## 9. Seed Data (Phase 1)

```
5 departments (IT, Finance, Operations, HR, Administration)
5 locations (Main Building, Annex, Data Center, Remote, Warehouse)
10 vendors (Microsoft, Apple, Dell, Cisco, Google, etc.)
1 admin user (seeded for initial access)
```

---

## 10. What Phase 1 Does NOT Include

- Hardware, software, contract records (Phase 2)
- Budget forecasting (Phase 3)
- Recommendation engine, alerts, dashboard widgets (Phase 4)
- Scenarios, reports, exports (Phase 5)
- Email notifications, SSO, Teams integration (post-MVP)

---

## 11. Testing Requirements (Phase 1)

- Unit tests for auth service (login validation, JWT issue)
- Unit tests for role guard logic
- Integration tests for all Phase 1 CRUD endpoints
- E2E: login flow, protected route redirect

---

## 12. Definition of Done (Phase 1)

1. Turborepo monorepo scaffolded and running locally
2. Supabase connected, Phase 1 schema migrated
3. NestJS API starts, all Phase 1 endpoints respond correctly
4. NextAuth login/logout works, JWT passed to NestJS
5. Role enforcement verified (admin-only routes reject editor/viewer)
6. All write actions create audit log entries
7. Next.js app renders sidebar nav, login page, and Phase 1 settings pages
8. Seed data loads successfully
