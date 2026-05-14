# Microsoft Entra ID SSO — Design Spec

**Goal:** Add Microsoft Entra ID (Azure AD) single sign-on alongside the existing local email/password login. Both methods work side by side. No auto-provisioning — admins pre-create users in LifecycleIQ; SSO lookup matches by email.

---

## Overview

The current auth flow: NextAuth `Credentials` provider → `POST /api/v1/auth/login` → bcrypt check → LifecycleIQ JWT → NextAuth session.

The new SSO flow: NextAuth `MicrosoftEntraID` provider → Microsoft OAuth → `POST /api/v1/auth/sso` (internal secret check + email lookup) → LifecycleIQ JWT → same NextAuth session shape.

The API's JWT guard, all server actions, and all protected routes are **unchanged**.

---

## Part 1: Azure App Registration (Portal Setup)

These steps are performed once in the Azure portal before any code is deployed.

1. **Create the app registration:**
   - Azure portal → **App registrations → New registration**
   - Name: `LifecycleIQ`
   - Supported account types: **Accounts in this organizational directory only (Single tenant)**
   - Redirect URI type: **Web**
   - Redirect URI value: `http://<server-ip>:3000/api/auth/callback/microsoft-entra-id`
     (Use `https://` if TLS is added later)

2. **Note the IDs:**
   - **Application (client) ID** → `AUTH_ENTRA_CLIENT_ID`
   - **Directory (tenant) ID** → `AUTH_ENTRA_TENANT_ID`

3. **Create a client secret:**
   - Certificates & secrets → New client secret
   - Description: `lifecycleiq-prod`, expiry: 24 months
   - Copy the **Value** immediately → `AUTH_ENTRA_CLIENT_SECRET`

4. **API permissions:**
   - Default `User.Read` (delegated, Microsoft Graph) is sufficient
   - No additional permissions required
   - Grant admin consent if required by your tenant policy

---

## Part 2: New API Endpoint — `POST /api/v1/auth/sso`

**Location:** `apps/api/src/modules/auth/`

**Files modified/created:**
- Create: `apps/api/src/modules/auth/dto/sso.dto.ts`
- Modify: `apps/api/src/modules/auth/auth.service.ts` — add `ssoLogin()` method
- Modify: `apps/api/src/modules/auth/auth.controller.ts` — add `POST /sso` route
- Modify: `apps/api/src/modules/auth/auth.service.spec.ts` — add SSO tests

**Endpoint:** `POST /api/v1/auth/sso`
- **Not** guarded by JWT (unprotected route, just like `POST /auth/login`)
- Protected instead by a shared `SSO_INTERNAL_SECRET`

**Request body:**
```json
{
  "email": "user@org.com",
  "internalSecret": "<SSO_INTERNAL_SECRET>"
}
```

**Logic (`AuthService.ssoLogin()`):**
1. Compare `dto.internalSecret` against `process.env.SSO_INTERNAL_SECRET` using `crypto.timingSafeEqual()` (prevents timing attacks)
2. If mismatch → throw `UnauthorizedException('Invalid SSO secret')`
3. Look up user: `usersService.findByEmail(dto.email)`
4. If not found or `user.isActive === false` → throw `UnauthorizedException('User not provisioned for SSO')`
5. Sign JWT with same payload as `login()`: `{ sub, email, role }`
6. Return `{ accessToken, user: { id, email, displayName, role } }`

**New env var (API):** `SSO_INTERNAL_SECRET` — long random string, never exposed to the browser.

**Tests to add:**
- Rejects request when `internalSecret` is wrong
- Rejects when user email not found
- Rejects when user is inactive (`isActive = false`)
- Returns JWT and user when valid

---

## Part 3: Frontend — NextAuth Provider + Login Page

### `apps/web/auth.ts`

Add `MicrosoftEntraID` as a second provider:

```typescript
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';
```

Provider config:
```typescript
MicrosoftEntraID({
  clientId: process.env.AUTH_ENTRA_CLIENT_ID!,
  clientSecret: process.env.AUTH_ENTRA_CLIENT_SECRET!,
  tenantId: process.env.AUTH_ENTRA_TENANT_ID!,
})
```

Add a `signIn` callback that fires after the Entra provider validates the Microsoft identity. The callback calls `POST /api/v1/auth/sso` server-side with `{email, internalSecret}`. On success, the returned `accessToken` and `role` are attached to the NextAuth JWT token — same fields the Credentials provider sets. On failure (user not provisioned or wrong secret), return `false` to redirect to `/login?error=NotProvisioned`.

The `jwt` and `session` callbacks are already correct and require no changes.

### `apps/web/app/(public)/login/page.tsx` (or equivalent login page)

Add a "Sign in with Microsoft" button below the existing form:

```tsx
<button onClick={() => signIn('microsoft-entra-id')}>
  Sign in with Microsoft
</button>
```

A small helper text: `"Contact your administrator if you don't have a LifecycleIQ account."`

The existing email/password form is unchanged.

### New env vars (web container)

| Variable | Description |
|----------|-------------|
| `AUTH_ENTRA_CLIENT_ID` | Azure app registration client ID |
| `AUTH_ENTRA_CLIENT_SECRET` | Azure app registration client secret |
| `AUTH_ENTRA_TENANT_ID` | Azure directory (tenant) ID |
| `SSO_INTERNAL_SECRET` | Shared secret between Next.js and the API |

---

## Part 4: Environment Variable Updates

**`.env.example`** additions:
```
# Microsoft Entra ID SSO
AUTH_ENTRA_CLIENT_ID=
AUTH_ENTRA_CLIENT_SECRET=
AUTH_ENTRA_TENANT_ID=

# SSO internal secret (shared between web and API)
SSO_INTERNAL_SECRET=changeme_use_a_long_random_string
```

**`docker-compose.yml`** additions:

`api` service environment:
```yaml
SSO_INTERNAL_SECRET: ${SSO_INTERNAL_SECRET}
```

`web` service environment:
```yaml
AUTH_ENTRA_CLIENT_ID: ${AUTH_ENTRA_CLIENT_ID}
AUTH_ENTRA_CLIENT_SECRET: ${AUTH_ENTRA_CLIENT_SECRET}
AUTH_ENTRA_TENANT_ID: ${AUTH_ENTRA_TENANT_ID}
SSO_INTERNAL_SECRET: ${SSO_INTERNAL_SECRET}
```

---

## File Map

| File | Action |
|------|--------|
| `apps/api/src/modules/auth/dto/sso.dto.ts` | Create |
| `apps/api/src/modules/auth/auth.service.ts` | Modify — add `ssoLogin()` |
| `apps/api/src/modules/auth/auth.controller.ts` | Modify — add `POST /sso` route |
| `apps/api/src/modules/auth/auth.service.spec.ts` | Modify — add 4 SSO tests |
| `apps/web/auth.ts` | Modify — add MicrosoftEntraID provider + signIn callback |
| `apps/web/app/(public)/login/page.tsx` | Modify — add "Sign in with Microsoft" button |
| `docker-compose.yml` | Modify — add new env vars to api and web services |
| `.env.example` | Modify — add Entra and SSO vars |

---

## What Does NOT Change

- `POST /api/v1/auth/login` (local login) — unchanged
- `JwtAuthGuard` — unchanged
- `RolesGuard` — unchanged
- All server actions (`apiServer()`) — unchanged
- All protected API routes — unchanged
- User table schema — unchanged (no new columns needed)
