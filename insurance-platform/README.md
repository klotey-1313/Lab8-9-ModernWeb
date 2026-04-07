# NorthStar Insurance Platform

A secure, full-stack insurance platform built with **Node.js / Express.js** on the backend and **React / Next.js** on the frontend. The system demonstrates HTTPS-secured APIs, JWT authentication, role-based access control (RBAC), ownership validation, and comprehensive user profile management in a realistic insurance business context.

---

## Table of Contents

1. [Project Description](#1-project-description)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Prerequisites](#4-prerequisites)
5. [Certificate Setup](#5-certificate-setup)
6. [Environment Configuration](#6-environment-configuration)
7. [Installation and Seeding](#7-installation-and-seeding)
8. [Running the Platform](#8-running-the-platform)
9. [Sample Users and Roles](#9-sample-users-and-roles)
10. [JWT Authentication](#10-jwt-authentication)
11. [User Profile Module](#11-user-profile-module)
12. [RBAC Management](#12-rbac-management)
13. [Protected Routes](#13-protected-routes)
14. [API Reference](#14-api-reference)
15. [Security Best Practices](#15-security-best-practices)
16. [Frontend Screens](#16-frontend-screens)

---

## 1. Project Description

NorthStar Insurance Platform is a two-sided digital insurance system that serves both external customers and internal staff. The platform allows customers to view and manage their insurance policies, submit amendment and coverage reduction requests, and file claims. Internal staff can create policies, review underwriting requests, adjudicate claims, and manage platform users and their roles.

The platform supports three insurance product categories:

- **Life Insurance** — includes beneficiary tracking
- **Car Insurance** — includes vehicle make and model
- **Home Insurance** — includes property address

Security is the primary design goal. All communication is encrypted using HTTPS, all protected endpoints require a valid JWT, all actions are checked against the authenticated user's role, and customers may only access their own records.

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Backend Framework | Express.js 4 |
| Transport Security | Node.js HTTPS with PFX certificate |
| Authentication | JSON Web Tokens (jsonwebtoken) |
| Password Security | bcryptjs |
| Database | MongoDB with Mongoose 8 |
| Input Validation | express-validator |
| Security Headers | helmet, cors |
| Frontend Framework | Next.js 15 (App Router) |
| Frontend Language | TypeScript / React 19 |
| UI Icons | lucide-react |

---

## 3. Project Structure

```
insurance-platform/
├── backend-api/
│   ├── cert/                        # HTTPS PFX certificate (not committed)
│   ├── src/
│   │   ├── config/                  # env, https, db, cors configuration
│   │   ├── constants/               # roles, statuses, claim types, etc.
│   │   ├── controllers/             # request handlers per module
│   │   ├── middleware/              # auth, role, ownership, error, validation
│   │   ├── models/                  # Mongoose schemas: User, Policy, Claim, etc.
│   │   ├── repositories/            # data access layer (one per model)
│   │   ├── routes/                  # Express routers mounted in index.js
│   │   ├── seed/                    # roles.seed.js and users.seed.js
│   │   ├── services/                # business logic per module
│   │   ├── utils/                   # apiResponse, appError, safeObject, etc.
│   │   ├── validators/              # express-validator rule sets per module
│   │   ├── app.js                   # Express application setup
│   │   └── server.js                # HTTPS server entry point
│   ├── .env                         # Active environment (not committed)
│   ├── .env.example                 # Template for environment variables
│   └── package.json
│
├── frontend-web/
│   ├── src/
│   │   ├── app/                     # Next.js App Router pages
│   │   │   ├── login/               # Login screen
│   │   │   ├── dashboard/           # Role-aware dashboard
│   │   │   ├── profile/             # Profile view and edit
│   │   │   ├── policies/            # Policy list, detail, create
│   │   │   ├── amendments/          # Submit and review amendments
│   │   │   ├── reductions/          # Submit and review reductions
│   │   │   ├── claims/              # Submit and review claims
│   │   │   ├── support/             # Customer service view
│   │   │   ├── compliance/          # Compliance officer view
│   │   │   └── admin/               # User management, RBAC, account status
│   │   ├── components/
│   │   │   ├── forms/               # LoginForm, UserForm, ClaimForm, etc.
│   │   │   ├── guards/              # ProtectedRoute, RoleGuard
│   │   │   ├── layout/              # Sidebar, PageShell, SectionHeader
│   │   │   ├── feedback/            # Alert component
│   │   │   └── tables/              # StatusBadge
│   │   ├── context/                 # AuthContext
│   │   ├── hooks/                   # useAuth
│   │   ├── lib/                     # api.ts, auth.ts, constants.ts, formatters.ts
│   │   └── types/                   # TypeScript interfaces
│   ├── .env.local                   # Active environment (not committed)
│   ├── .env.local.example           # Template for frontend environment variables
│   └── package.json
│
├── seed.bat                         # Windows: seed roles then users
├── start-platform.bat               # Windows: start backend and frontend
├── start-platform.sh                # macOS/Linux: start backend and frontend
├── README.md                        # This file
└── report.md                        # Lab report
```

---

## 4. Prerequisites

- **Node.js** 18 or later — [nodejs.org](https://nodejs.org)
- **npm** 9 or later (bundled with Node.js)
- **MongoDB** 6 or later running locally, or a MongoDB Atlas connection string
- **OpenSSL** for generating the development certificate (see Section 5)

Verify installations:

```bash
node --version    # v18+
npm --version     # 9+
mongod --version  # 6+
openssl version   # any recent version
```

---

## 5. Certificate Setup

The backend requires a PFX (PKCS#12) certificate for HTTPS. A self-signed certificate is sufficient for development.

### Step 1 — Generate a self-signed certificate

Open a terminal inside `backend-api/`:

```bash
mkdir -p cert && cd cert

# Generate a 4096-bit RSA key and self-signed certificate (valid 365 days)
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem \
  -sha256 -days 365 -nodes \
  -subj "/C=CA/ST=Ontario/L=Toronto/O=NorthStar/CN=localhost"

# Bundle into a PFX — choose any passphrase and record it
openssl pkcs12 -export \
  -out server.pfx \
  -inkey key.pem \
  -in cert.pem \
  -passout pass:your_pfx_passphrase
```

### Step 2 — Record the passphrase

Set `HTTPS_PFX_PASSPHRASE=your_pfx_passphrase` in `backend-api/.env`.

### Step 3 — Trust the certificate (recommended for development)

**Browsers:** Import `cert/cert.pem` into your system trusted certificate store, or click **Advanced → Proceed** when the browser warns about the certificate.

**Next.js fetch client:** Set `NODE_TLS_REJECT_UNAUTHORIZED=0` in `frontend-web/.env.local`. This flag disables TLS verification for the Node.js process and must **never** be used in production.

---

## 6. Environment Configuration

### Backend — `backend-api/.env`

```bash
cp backend-api/.env.example backend-api/.env
```

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | No | `development` (default) or `production` |
| `PORT` | No | HTTPS port, default `5001` |
| `MONGODB_URI` | **Yes** | MongoDB connection string |
| `JWT_SECRET` | **Yes** | Long random string — minimum 32 characters |
| `JWT_EXPIRES_IN` | No | Token lifetime, default `2h` |
| `FRONTEND_URL` | **Yes** | Frontend origin for CORS, e.g. `http://localhost:3000` |
| `HTTPS_PFX_PATH` | **Yes** | Relative path to PFX file, e.g. `./cert/server.pfx` |
| `HTTPS_PFX_PASSPHRASE` | **Yes** | Passphrase set when the PFX was exported |

**Example `.env`:**

```env
NODE_ENV=development
PORT=5001
MONGODB_URI=mongodb://127.0.0.1:27017/insurance_platform
JWT_SECRET=a_long_random_string_at_least_32_chars
JWT_EXPIRES_IN=2h
FRONTEND_URL=http://localhost:3000
HTTPS_PFX_PATH=./cert/server.pfx
HTTPS_PFX_PASSPHRASE=your_pfx_passphrase
```

### Frontend — `frontend-web/.env.local`

```bash
cp frontend-web/.env.local.example frontend-web/.env.local
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Full URL of the backend API, e.g. `https://localhost:5001/api` |
| `NODE_TLS_REJECT_UNAUTHORIZED` | Set to `0` in development to allow the self-signed certificate |

---

## 7. Installation and Seeding

### Install dependencies

```bash
# Terminal 1 — Backend
cd backend-api && npm install

# Terminal 2 — Frontend
cd frontend-web && npm install
```

### Seed the database

Roles must be seeded before users.

**Windows (run from project root):**
```
seed.bat
```

**macOS / Linux:**
```bash
cd backend-api
node src/seed/roles.seed.js
node src/seed/users.seed.js
```

The seed deletes and recreates all users. Always run roles first.

---

## 8. Running the Platform

**Windows (double-click or run from project root):**
```
start-platform.bat
```

**Manual:**
```bash
# Terminal 1 — Backend
cd backend-api && npm run dev

# Terminal 2 — Frontend
cd frontend-web && npm run dev
```

| Service | URL |
|---|---|
| Backend API | `https://localhost:5001/api` |
| Frontend | `http://localhost:3000` |

---

## 9. Sample Users and Roles

All seeded users share the password: **`Password123!`**

| Username | Role | Portal | Description |
|---|---|---|---|
| `admin1` | ADMIN | Admin | Full platform access; manages users, roles, and all records |
| `agent1` | AGENT | Internal | Creates policies and assists customers |
| `underwriter1` | UNDERWRITER | Internal | Approves or rejects amendment and reduction requests |
| `adjuster1` | CLAIMS_ADJUSTER | Internal | Reviews and decides on submitted claims |
| `csrep1` | CUSTOMER_SERVICE | Internal | Views customer profiles, policies, and claim status for support |
| `compliance1` | COMPLIANCE_OFFICER | Internal | Read-only visibility into users, roles, and operations |
| `customer1` | CUSTOMER | Customer | Manages own policies, submits amendments, reductions, and claims |

### Role Capabilities

| Operation | CUSTOMER | AGENT | UNDERWRITER | ADJUSTER | CS REP | COMPLIANCE | ADMIN |
|---|---|---|---|---|---|---|---|
| View own profile | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Update own profile | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View all users | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ read-only | ✅ |
| Create/update users | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Assign/remove roles | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Create policy | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| View policies | Own only | ✅ | ✅ | Limited | ✅ | ✅ read-only | ✅ |
| Request amendment | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Approve amendment | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Request reduction | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Approve reduction | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Submit claim | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Approve/reject claim | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| View claims | Own only | Limited | Limited | ✅ | ✅ | ✅ read-only | ✅ |

---

## 10. JWT Authentication

### Token issuance

1. Client sends `POST /api/auth/login` with `{ username, password }`.
2. `authService` validates credentials with `bcrypt.compare()`.
3. On success, `lastLoginAt` is updated and a JWT is signed:

```javascript
jwt.sign(
  { userId, username, roles },
  env.jwtSecret,
  { expiresIn: env.jwtExpiresIn }  // default "2h"
)
```

### Token payload

```json
{
  "userId":   "64abc123...",
  "username": "customer1",
  "roles":    ["CUSTOMER"],
  "iat":      1712000000,
  "exp":      1712007200
}
```

Password hashes are **never** included in the token payload.

### Token verification

The `authenticate` middleware (`src/middleware/authMiddleware.js`) on every protected route:

1. Reads `Authorization: Bearer <token>` header (or `token` cookie).
2. Calls `jwt.verify(token, env.jwtSecret)` — rejects malformed/expired tokens with `401`.
3. Re-fetches the user from MongoDB using `decoded.userId` to ensure the account still exists.
4. Attaches the user to `req.user` for downstream middleware.

### Frontend token storage

The token is stored in `localStorage` and attached to every API request by `src/lib/api.ts`. The `AuthContext` restores session state from `localStorage` on page load. Logout clears the token and redirects to `/login`.

---

## 11. User Profile Module

### Authentication layer (outer schema)

| Field | Type | Description |
|---|---|---|
| `username` | String | Unique login identifier |
| `passwordHash` | String | bcrypt hash — **never returned in responses** |
| `roles` | ObjectId[] | References to Role documents |
| `accountStatus` | String | `ACTIVE` or `INACTIVE` |
| `lastLoginAt` | Date | Timestamp of most recent successful login |
| `createdAt` / `updatedAt` | Date | Auto-managed by Mongoose |

### Business profile layer (embedded schema)

| Field | Purpose |
|---|---|
| `firstName`, `lastName` | Full name |
| `dateOfBirth` | Date of birth |
| `email` | Contact email |
| `phone` | Phone number |
| `addressLine1`, `addressLine2`, `city`, `province`, `postalCode`, `country` | Full postal address |
| `customerNumber` / `employeeNumber` | Business identifier |
| `userType` | `CUSTOMER` or `INTERNAL` |
| `preferredContactMethod` | e.g. EMAIL, PHONE |
| `emergencyContactName`, `emergencyContactPhone` | Emergency contact |
| `department`, `jobTitle`, `supervisorName` | Internal staff organization fields |
| `internalAccessStatus` | Internal access state |
| `clientCategory` | Customer segment (e.g. STANDARD, PREMIUM) |
| `beneficiaryName` | Life insurance beneficiary placeholder |

### Self-update whitelist

`profileService.updateOwnProfile()` uses an explicit allowlist of 16 fields. Fields like `userType`, `employeeNumber`, and `accountStatus` are silently ignored even if sent in the request body, preventing privilege escalation.

---

## 12. RBAC Management

RBAC is managed exclusively through the application by users with the ADMIN role.

### Admin endpoints

| Method | Endpoint | Action |
|---|---|---|
| `GET` | `/api/admin/rbac/roles` | List all defined roles |
| `GET` | `/api/admin/users` | List all users with role assignments |
| `POST` | `/api/admin/users` | Create a new user account |
| `PUT` | `/api/admin/rbac/users/:userId/roles` | Replace all role assignments |
| `DELETE` | `/api/admin/rbac/users/:userId/roles/:roleName` | Remove one specific role |
| `PUT` | `/api/admin/users/:userId/status` | Activate or deactivate account |

### Role assignment process

1. Admin submits role names to the assign endpoint.
2. `rbacService` resolves names to MongoDB ObjectIds via `roleRepository.findByNames()`.
3. Invalid role names cause a `400 Bad Request`.
4. Valid ObjectIds replace the user's current `roles` array.

### Role removal process

1. Admin calls `DELETE /api/admin/rbac/users/:userId/roles/:roleName`.
2. `rbacService.removeRole()` resolves the role name, filters it from the user's roles array, and saves.

### Enforcement

- All mutation endpoints are protected by `authorizeRoles("ADMIN")`.
- No self-service role-elevation endpoint exists.
- Role changes take effect immediately on the next authenticated request.

---

## 13. Protected Routes

### Backend middleware chain

```
Route = authenticate → authorizeRoles(...) → [requirePolicyOwnership] → controller
```

**`authenticate`** — Verifies JWT; fetches user from DB; attaches to `req.user`; returns `401` on failure.

**`authorizeRoles(...roles)`** — Checks `req.user.roles` against the allowed list; returns `403` if no match.

**`requirePolicyOwnership`** — Verifies that the policy referenced in the request belongs to the requesting customer. Admin and Agent bypass this check. Returns `403` otherwise.

### Frontend guards

**`ProtectedRoute`** — Redirects unauthenticated users to `/login`.

**`RoleGuard`** — Redirects users with insufficient roles to `/unauthorized`.

Usage pattern:
```tsx
<ProtectedRoute>
  <RoleGuard allowedRoles={["ADMIN"]}>
    <AdminPage />
  </RoleGuard>
</ProtectedRoute>
```

---

## 14. API Reference

### Authentication
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Login; returns JWT |

### Profile
| Method | Endpoint | Roles |
|---|---|---|
| GET | `/api/profile/me` | All authenticated |
| PUT | `/api/profile/me` | All authenticated |

### Policies
| Method | Endpoint | Roles |
|---|---|---|
| POST | `/api/policies` | AGENT, ADMIN |
| GET | `/api/policies` | All (CUSTOMER: own only) |
| GET | `/api/policies/:policyId` | All |

### Amendments
| Method | Endpoint | Roles |
|---|---|---|
| POST | `/api/amendments` | CUSTOMER, AGENT, ADMIN |
| GET | `/api/amendments` | All |
| GET | `/api/amendments/review` | UNDERWRITER, ADMIN |
| PUT | `/api/amendments/:id/review` | UNDERWRITER, ADMIN |

### Reductions
| Method | Endpoint | Roles |
|---|---|---|
| POST | `/api/reductions` | CUSTOMER, AGENT, ADMIN |
| GET | `/api/reductions` | All |
| GET | `/api/reductions/review` | UNDERWRITER, ADMIN |
| PUT | `/api/reductions/:id/review` | UNDERWRITER, ADMIN |

### Claims
| Method | Endpoint | Roles |
|---|---|---|
| POST | `/api/claims` | CUSTOMER, ADMIN |
| GET | `/api/claims` | All |
| GET | `/api/claims/review` | CLAIMS_ADJUSTER, ADMIN |
| PUT | `/api/claims/:id/review` | CLAIMS_ADJUSTER, ADMIN |

### Admin — Users
| Method | Endpoint | Roles |
|---|---|---|
| GET | `/api/admin/users` | ADMIN, COMPLIANCE_OFFICER |
| POST | `/api/admin/users` | ADMIN |
| GET | `/api/admin/users/customers` | ADMIN, AGENT, CUSTOMER_SERVICE |
| GET | `/api/admin/users/:userId` | ADMIN, COMPLIANCE_OFFICER, CUSTOMER_SERVICE |
| PUT | `/api/admin/users/:userId` | ADMIN |
| PUT | `/api/admin/users/:userId/status` | ADMIN |

### Admin — RBAC
| Method | Endpoint | Roles |
|---|---|---|
| GET | `/api/admin/rbac/roles` | ADMIN, COMPLIANCE_OFFICER |
| PUT | `/api/admin/rbac/users/:userId/roles` | ADMIN |
| DELETE | `/api/admin/rbac/users/:userId/roles/:roleName` | ADMIN |

---

## 15. Security Best Practices

| Practice | Implementation |
|---|---|
| HTTPS only | `https.createServer` with PFX; no HTTP binding |
| JWT expiry | 2-hour default, configurable per environment |
| Password hashing | `bcrypt.hash(password, 12)` |
| No passwords in responses | `stripSensitiveUserFields()` applied before every response |
| No hardcoded secrets | All secrets in `.env`; example files committed without real values |
| Input validation | `express-validator` rule sets on all mutation endpoints |
| Security headers | `helmet()` in `app.js` |
| Centralized errors | `errorMiddleware` formats safe messages; stack traces never exposed |
| 401 vs 403 | Missing/invalid token → 401; authenticated but wrong role → 403 |
| Field whitelist | Self-update service rejects sensitive fields silently |
| Ownership checks | `requirePolicyOwnership` prevents cross-customer data access |
| CORS restriction | Only configured `FRONTEND_URL` is allowed as origin |

---

## 16. Frontend Screens

### Customer Portal
| Screen | Path |
|---|---|
| Login | `/login` |
| Dashboard | `/dashboard` |
| Profile | `/profile` |
| Edit Profile | `/profile/edit` |
| My Policies | `/policies` |
| Policy Detail | `/policies/[id]` |
| Request Amendment | `/amendments/create` |
| My Amendments | `/amendments` |
| Request Reduction | `/reductions/create` |
| My Reductions | `/reductions` |
| Submit Claim | `/claims/create` |
| My Claims | `/claims` |

### Internal Portal
| Screen | Path | Roles |
|---|---|---|
| Dashboard | `/dashboard` | All authenticated |
| Create Policy | `/policies/create` | AGENT, ADMIN |
| Amendment Review | `/amendments/review` | UNDERWRITER, ADMIN |
| Reduction Review | `/reductions/review` | UNDERWRITER, ADMIN |
| Claims Review | `/claims/review` | CLAIMS_ADJUSTER, ADMIN |
| Customer Support | `/support` | CUSTOMER_SERVICE, ADMIN |
| Compliance View | `/compliance` | COMPLIANCE_OFFICER, ADMIN |

### Admin Portal
| Screen | Path |
|---|---|
| User List | `/admin/users` |
| Create User | `/admin/users/create` |
| User Details / Edit | `/admin/users/[id]` |
| Role Assignment | `/admin/rbac` |
| Account Status | `/admin/account-status` |
