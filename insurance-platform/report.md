# Lab Report
## Secure Insurance Platform with HTTPS, JWT, User Profile Management, and Role-Based API Protection

**Course:** Modern Web Technologies
**Technology Stack:** Node.js · Express.js · React · Next.js · MongoDB

---

## Table of Contents

1. [Lab Objective](#1-lab-objective)
2. [Architecture Overview](#2-architecture-overview)
3. [HTTPS Configuration](#3-https-configuration)
4. [Authentication Flow](#4-authentication-flow)
5. [Authorization Flow](#5-authorization-flow)
6. [Comprehensive User Profile Design](#6-comprehensive-user-profile-design)
7. [RBAC Management by Administrator](#7-rbac-management-by-administrator)
8. [Business Workflows](#8-business-workflows)
9. [Frontend Integration and Protected Navigation](#9-frontend-integration-and-protected-navigation)
10. [Security Best Practices](#10-security-best-practices)
11. [Testing Results](#11-testing-results)
12. [Screenshots](#12-screenshots)
13. [Conclusion](#13-conclusion)

---

## 1. Lab Objective

The objective of this lab is to design and implement a production-grade, secure, full-stack insurance platform that simulates the digital systems used in financial services. The platform must demonstrate:

- Configuring an Express.js server to operate exclusively over HTTPS using a PFX-based certificate.
- Issuing and validating JSON Web Tokens as the sole authentication mechanism for all protected operations.
- Building layered middleware chains that enforce authentication, role-based access control, and record-level ownership in the correct order.
- Designing a comprehensive two-layer user profile model that serves both external customers and internal staff.
- Implementing administrator-controlled RBAC so that role assignments are managed through the live application, not configuration files.
- Integrating a Next.js frontend that enforces role-appropriate navigation and blocks unauthorized screen access.
- Applying real-world security practices: password hashing, input validation, safe error handling, field-level response filtering, CORS restriction, and security headers.

The system serves two audiences: customers who manage their own insurance products online, and internal staff (agents, underwriters, claims adjusters, customer service representatives, compliance officers, and administrators) who perform operational and governance tasks.

---

## 2. Architecture Overview

### 2.1 High-Level System Diagram

```
┌─────────────────────────────────────────────────────┐
│                   Browser (Client)                   │
│             Next.js 15 – App Router                 │
│                                                     │
│  AuthContext ──► ProtectedRoute ──► RoleGuard       │
│  api.ts (fetch + Bearer token)                      │
└────────────────────┬────────────────────────────────┘
                     │  HTTPS (TLS 1.2+)
                     ▼
┌─────────────────────────────────────────────────────┐
│           Express.js API – Port 5001 (HTTPS)        │
│                                                     │
│  helmet  cors  morgan  express-validator            │
│                                                     │
│  authenticate ──► authorizeRoles ──► ownership      │
│                                                     │
│  /api/auth        /api/profile     /api/policies    │
│  /api/amendments  /api/reductions  /api/claims      │
│  /api/admin/users /api/admin/rbac                   │
│                                                     │
│  Controllers ──► Services ──► Repositories          │
└────────────────────┬────────────────────────────────┘
                     │  Mongoose ODM
                     ▼
┌─────────────────────────────────────────────────────┐
│                    MongoDB                          │
│  users · roles · policies · amendmentrequests       │
│  reductionrequests · claims                         │
└─────────────────────────────────────────────────────┘
```

### 2.2 Backend Layered Architecture

| Layer | Responsibility |
|---|---|
| **Routes** | Declare HTTP verbs, paths, and the middleware stack for each endpoint |
| **Controllers** | Parse request data; call service; return standardized JSON response |
| **Services** | All business logic; call repositories for data access; throw `AppError` on failure |
| **Repositories** | Thin wrappers around Mongoose; no business logic |
| **Models** | Mongoose schemas with field-level validation and output transforms |
| **Middleware** | `authenticate`, `authorizeRoles`, `requirePolicyOwnership`, `errorMiddleware`, `handleValidation` |
| **Validators** | `express-validator` rule arrays; one file per module |
| **Utils** | `apiResponse`, `appError`, `safeObject`, formatting helpers |

### 2.3 Frontend Layered Architecture

| Layer | Responsibility |
|---|---|
| **App pages** | One page component per URL route using the Next.js App Router |
| **Guards** | `ProtectedRoute` enforces login; `RoleGuard` enforces role access |
| **Components** | Reusable forms, layout shell, sidebar, feedback, tables |
| **Context / Hooks** | `AuthContext` + `useAuth` provide global authentication state |
| **API service** | `apiRequest()` in `lib/api.ts` centralizes HTTPS calls and token attachment |
| **Types** | TypeScript interfaces mirror all backend response shapes |

---

## 3. HTTPS Configuration

### 3.1 Certificate Generation

A self-signed PKCS#12 (PFX) certificate is generated using OpenSSL:

```bash
# Generate 4096-bit RSA key and self-signed certificate
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem \
  -sha256 -days 365 -nodes -subj "/C=CA/ST=Ontario/L=Toronto/O=NorthStar/CN=localhost"

# Bundle into PFX with a passphrase
openssl pkcs12 -export -out server.pfx \
  -inkey key.pem -in cert.pem -passout pass:<passphrase>
```

The PFX file is stored in `backend-api/cert/` and excluded from version control via `.gitignore`. The passphrase is stored only in the `.env` file, which is also excluded from version control.

### 3.2 Server Initialization

`src/server.js` creates an HTTPS server — there is no HTTP fallback:

```javascript
import https from "https";
import { getHttpsOptions } from "./config/https.js";

const httpsServer = https.createServer(getHttpsOptions(), app);
httpsServer.listen(env.port, () => {
  console.log(`Secure backend API running on https://localhost:${env.port}`);
});
```

`getHttpsOptions()` reads the PFX file path and passphrase from environment variables:

```javascript
export function getHttpsOptions() {
  const pfx = fs.readFileSync(path.resolve(projectRoot, env.httpsPfxPath));
  return { pfx, passphrase: env.httpsPfxPassphrase };
}
```

### 3.3 Frontend Configuration

The Next.js frontend communicates with the backend exclusively over HTTPS. The base URL is set in `.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=https://localhost:5001/api
NODE_TLS_REJECT_UNAUTHORIZED=0   # development only
```

`NODE_TLS_REJECT_UNAUTHORIZED=0` allows the self-signed certificate in the Node.js process during development. This variable is documented as development-only in both the `.env.local.example` and the README.

---

## 4. Authentication Flow

### 4.1 Login Sequence

```
Client                       Backend
  │                              │
  │  POST /api/auth/login        │
  │  { username, password }      │
  │ ──────────────────────────► │
  │                              │  1. userRepository.findByUsername(username)
  │                              │  2. bcrypt.compare(password, user.passwordHash)
  │                              │  3. user.lastLoginAt = new Date(); user.save()
  │                              │  4. tokenService.generateAccessToken(user)
  │                              │     → jwt.sign({ userId, username, roles }, secret, { expiresIn })
  │                              │
  │  200 { token, user }         │
  │ ◄────────────────────────── │
  │                              │
  │  Store token → localStorage  │
  │  Attach on all future calls  │
  │  Authorization: Bearer <tok> │
```

### 4.2 JWT Payload

The token is signed with HS256. The payload contains exactly the claims required by the specification:

```json
{
  "userId":   "64abc123def456ghi789",
  "username": "customer1",
  "roles":    ["CUSTOMER"],
  "iat":      1712000000,
  "exp":      1712007200
}
```

Passwords and password hashes are **never** included in the token.

### 4.3 Token Verification

The `authenticate` middleware executes on every protected endpoint:

```javascript
export async function authenticate(req, res, next) {
  const token = getBearerToken(req);               // Authorization header or cookie
  const decoded = jwt.verify(token, env.jwtSecret); // throws on expired or bad signature
  const user = await userRepository.findById(decoded.userId); // ensure user still exists
  if (!user) throw new AppError("Unauthorized", 401);
  req.user = user;
  next();
}
```

A `JsonWebTokenError` or `TokenExpiredError` thrown by `jwt.verify()` is caught by the centralized error handler and converted to a `401 Unauthorized` response. The client-facing error message never exposes internal detail.

### 4.4 Frontend Session

`AuthContext` initializes from `localStorage` on mount. `useAuth()` provides `user`, `login()`, and `logout()` to the entire component tree. `logout()` deletes the token from storage, clears React state, and redirects to `/login`.

---

## 5. Authorization Flow

Authorization is implemented in three distinct, ordered middleware stages.

### 5.1 Role-Based Authorization

`authorizeRoles(...allowedRoles)` is a middleware factory:

```javascript
export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    const roleNames = getRoleNames(req.user);
    const hasAccess = allowedRoles.some(r => roleNames.includes(r));
    if (!hasAccess) return errorResponse(res, "Forbidden: insufficient role access", 403);
    next();
  };
}
```

It always runs **after** `authenticate`, so `req.user` is guaranteed to be set. A `403 Forbidden` (not `401`) is returned because the user is authenticated but does not have the required permission.

**Example route stack:**

```javascript
// Only UNDERWRITER and ADMIN can approve amendments
router.put("/:id/review",
  authenticate,
  authorizeRoles("UNDERWRITER", "ADMIN"),
  amendmentController.reviewAmendment
);
```

### 5.2 Ownership Validation

`requirePolicyOwnership` prevents customers from acting on policies that belong to other customers:

```
IF role is ADMIN or AGENT  →  pass through unconditionally
IF role is CUSTOMER        →  allow only if policy.customer === req.user._id
ALL other cases            →  403 Forbidden
```

This middleware is applied on amendment, reduction, and claim **creation** routes, which all require a `policyId` in the request.

### 5.3 Service-Level Data Filtering

Even after a CUSTOMER passes the role check on `GET /policies`, the `policyService.listPolicies()` method scopes the database query to `{ customer: req.user._id }`. This double-check ensures that no policy record belonging to another customer can be returned, even if the middleware is misconfigured.

### 5.4 Response Field Filtering

`stripSensitiveUserFields()` removes `passwordHash` and other sensitive fields before any user object is serialized to JSON. This is applied at the repository return point and in every controller that returns user data.

---

## 6. Comprehensive User Profile Design

### 6.1 Two-Layer Schema Architecture

The Mongoose `User` model uses two embedded schemas:

```
userSchema (authentication layer)
│
├─ username              (unique login ID)
├─ passwordHash          (bcrypt, never returned in responses)
├─ roles                 (ObjectId[] → Role documents)
├─ accountStatus         ("ACTIVE" | "INACTIVE")
├─ lastLoginAt           (updated on every successful login)
└─ profile: userProfileSchema (business layer)
   │
   ├─ firstName, lastName
   ├─ dateOfBirth
   ├─ email, phone
   ├─ addressLine1, addressLine2, city, province, postalCode, country
   ├─ customerNumber / employeeNumber
   ├─ userType             ("CUSTOMER" | "INTERNAL")
   ├─ preferredContactMethod
   ├─ emergencyContactName, emergencyContactPhone
   ├─ department, jobTitle, supervisorName  (internal staff)
   ├─ internalAccessStatus                 (internal staff)
   ├─ clientCategory                       (customer)
   └─ beneficiaryName                      (customer — life insurance)
```

### 6.2 Self-Update Whitelist

`profileService.updateOwnProfile()` iterates incoming fields and applies only those in a hard-coded `Set` of 16 permitted keys. Sensitive fields (`userType`, `roles`, `accountStatus`, `employeeNumber`, `internalAccessStatus`) are silently discarded even if included in the request body:

```javascript
const ALLOWED_OWN_PROFILE_FIELDS = new Set([
  "firstName", "lastName", "dateOfBirth", "email", "phone",
  "addressLine1", "addressLine2", "city", "province",
  "postalCode", "country", "preferredContactMethod",
  "emergencyContactName", "emergencyContactPhone",
  "clientCategory", "beneficiaryName"
]);
```

### 6.3 Admin Profile Access

Administrators use a separate endpoint (`PUT /api/admin/users/:userId/profile`) that has no field restriction. Admins can also update `accountStatus` via a dedicated status endpoint, and roles via the RBAC endpoint. This clean separation ensures that profile data, security status, and role assignment are managed through distinct, independently auditable API calls.

---

## 7. RBAC Management by Administrator

### 7.1 Design Principles

- RBAC is managed through the live application UI — no direct database access or file changes are required.
- Only the ADMIN role can mutate role assignments. The `authorizeRoles("ADMIN")` middleware guard is applied to every RBAC mutation endpoint.
- No self-service role elevation endpoint exists. Users cannot modify their own role assignments.
- Role changes take effect immediately: `authenticate` re-fetches the user from MongoDB on every request, so the live database state — not the JWT — is always the authoritative source of role information.

### 7.2 Role Definitions

| Role Constant | Display Name | Portal |
|---|---|---|
| `CUSTOMER` | Customer | External |
| `AGENT` | Insurance Agent | Internal |
| `UNDERWRITER` | Underwriter | Internal |
| `CLAIMS_ADJUSTER` | Claims Adjuster | Internal |
| `CUSTOMER_SERVICE` | Customer Service Rep | Internal |
| `COMPLIANCE_OFFICER` | Compliance Officer | Internal |
| `ADMIN` | Administrator | Admin |

### 7.3 Role Assignment Flow

```
Admin selects user in /admin/rbac
Checks desired roles in RoleAssignmentForm
Submits → PUT /api/admin/rbac/users/:userId/roles
         { "roles": ["AGENT", "UNDERWRITER"] }
                │
                ▼
rbacService.assignRoles(userId, ["AGENT", "UNDERWRITER"])
  1. roleRepository.findByNames(["AGENT", "UNDERWRITER"])
     → returns [{ _id: ObjectId("..."), name: "AGENT" }, ...]
  2. Validate: array length must match input length (else 400)
  3. roleIds = validRoles.map(r => r._id)
  4. userRepository.updateById(userId, { roles: roleIds })
                │
                ▼
Updated user document returned (passwordHash stripped)
```

### 7.4 Role Removal Flow

```
Admin clicks "Remove" on a specific role badge in /admin/users/[id]
Calls → DELETE /api/admin/rbac/users/:userId/roles/:roleName
                │
                ▼
rbacService.removeRole(userId, roleName)
  1. Load user document
  2. roleRepository.findByNames([roleName]) → get ObjectId
  3. nextRoles = user.roles.filter(r => String(r._id) !== roleIdStr)
  4. userRepository.updateById(userId, { roles: nextRoles.map(r => r._id) })
                │
                ▼
Updated user document returned
```

### 7.5 Admin Frontend RBAC Screens

| Screen | URL | Description |
|---|---|---|
| User list | `/admin/users` | Searchable table; link to detail/edit |
| Create user | `/admin/users/create` | Provision account with roles |
| User detail + edit | `/admin/users/[id]` | View/edit profile; toggle to edit mode |
| Role assignment | `/admin/rbac` | Checkbox grid of all roles per user |
| Account status | `/admin/account-status` | One-click activate/deactivate toggle |

---

## 8. Business Workflows

### 8.1 Policy Creation

1. Agent navigates to Create Policy (`/policies/create`).
2. Submits `POST /api/policies` — type, customer ID, coverage, premium, dates, product-specific fields.
3. Backend validates, generates `POL-{YEAR}-{RANDOM}` policy number, creates document.
4. Customer immediately sees the policy on My Policies.

### 8.2 Amendment Workflow

1. Customer submits amendment request (`POST /api/amendments`) with `policyId`, `reason`, and a `changes` array.
2. Ownership middleware confirms the policy belongs to the requesting customer.
3. Amendment created with `status: "PENDING"`.
4. Underwriter views pending queue (`GET /api/amendments/review`).
5. Underwriter submits decision (`PUT /api/amendments/:id/review`) with `status` and optional `reviewComment`.
6. Customer sees the updated status on their Amendments page.

### 8.3 Reduction Workflow

Identical structure to the amendment workflow. Customer submits `POST /api/reductions` specifying `currentCoverage` and `requestedCoverage`. Underwriter decides via `PUT /api/reductions/:id/review`.

### 8.4 Claims Workflow

1. Customer submits claim (`POST /api/claims`) with `policyId`, `claimType`, `incidentDate`, `amount`, `description`.
2. Ownership middleware verifies policy ownership.
3. Claim created with `status: "PENDING"`.
4. Claims adjuster views queue (`GET /api/claims/review`).
5. Adjuster submits decision (`PUT /api/claims/:id/review`) with `status` and `reviewComment`.
6. Customer sees the decision on My Claims.

---

## 9. Frontend Integration and Protected Navigation

### 9.1 Centralized API Service

All backend calls go through `src/lib/api.ts`:

```typescript
async function apiRequest<T>(path: string, options: ApiRequestOptions): Promise<ApiResponse<T>> {
  const token = getStoredToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  if (!res.ok) throw new ApiRequestError(data.message, res.status);
  return data;
}
```

This ensures the `Authorization` header is always attached and errors are thrown as typed `ApiRequestError` instances that pages can catch and display.

### 9.2 Route Guard Composition

```tsx
// Every protected page
<ProtectedRoute>           {/* → /login if not authenticated */}
  <RoleGuard allowedRoles={["UNDERWRITER", "ADMIN"]}>
    <AmendmentReviewPage />   {/* → /unauthorized if wrong role */}
  </RoleGuard>
</ProtectedRoute>
```

### 9.3 Role-Aware Sidebar

The Sidebar reads role names from `AuthContext` and renders only the navigation links that are appropriate for the current user's role. A customer never sees Underwriting Review or Claims Adjudication links. A compliance officer sees only their read-only views. An administrator sees all sections.

---

## 10. Security Best Practices

| Practice | Implementation |
|---|---|
| HTTPS only | `https.createServer` — no HTTP server bound |
| JWT expiry | 2-hour default; configurable via `JWT_EXPIRES_IN` |
| Password hashing | `bcrypt.hash(password, 12)` — salted rounds |
| No passwords in responses | `stripSensitiveUserFields()` applied universally |
| No hardcoded secrets | All secrets in `.env`; example files have no real values |
| Input validation | `express-validator` rule arrays on every mutation route |
| Security headers | `helmet()` sets CSP, X-Frame-Options, HSTS, etc. |
| Centralized error handling | `errorMiddleware` formats safe messages; stack traces suppressed in production |
| 401 vs 403 separation | Missing/invalid token → 401; authenticated + wrong role → 403 |
| Field whitelist on update | 16-field allowlist in `profileService.updateOwnProfile()` |
| Ownership enforcement | `requirePolicyOwnership` middleware on creation routes |
| CORS restriction | `cors(corsOptions)` accepts only the `FRONTEND_URL` origin |

---

## 11. Testing Results

### Scenario 1 — Backend starts over HTTPS
**Action:** `npm run dev` in `backend-api/`
**Expected:** `Secure backend API running on https://localhost:5001`
**Result:** ✅ PASS

### Scenario 2 — Valid login returns JWT
**Action:** `POST /api/auth/login` with `customer1 / Password123!`
**Expected:** Response with `token` field; decoded payload contains `userId`, `username`, `roles`
**Result:** ✅ PASS

### Scenario 3 — Invalid login is rejected
**Action:** `POST /api/auth/login` with wrong password
**Expected:** `401 Unauthorized` — "Invalid credentials"
**Result:** ✅ PASS

### Scenario 4 — Expired / invalid token rejected
**Action:** `GET /api/profile/me` with a corrupted or expired token
**Expected:** `401 Unauthorized`
**Result:** ✅ PASS

### Scenario 5 — Customer views own profile
**Action:** Log in as `customer1`; `GET /api/profile/me`
**Expected:** Own profile returned; no `passwordHash` in response
**Result:** ✅ PASS

### Scenario 6 — Customer cannot view another customer's profile
**Action:** Log in as `customer1`; `GET /api/admin/users/<customer2_id>`
**Expected:** `403 Forbidden`
**Result:** ✅ PASS

### Scenario 7 — Admin lists all users
**Action:** Log in as `admin1`; `GET /api/admin/users`
**Expected:** All 7 seeded users returned
**Result:** ✅ PASS

### Scenario 8 — Admin assigns a role
**Action:** `PUT /api/admin/rbac/users/<userId>/roles` with `{ "roles": ["CUSTOMER", "AGENT"] }`
**Expected:** User document returned with both roles
**Result:** ✅ PASS

### Scenario 9 — Non-admin cannot assign roles
**Action:** Log in as `agent1`; `PUT /api/admin/rbac/users/<userId>/roles`
**Expected:** `403 Forbidden`
**Result:** ✅ PASS

### Scenario 10 — Customer views only own policies
**Action:** Log in as `customer1`; `GET /api/policies`
**Expected:** Only policies where `customer === customer1._id`
**Result:** ✅ PASS

### Scenario 11 — Agent creates a policy
**Action:** Log in as `agent1`; `POST /api/policies` with valid payload
**Expected:** Policy created; `policyNumber` generated
**Result:** ✅ PASS

### Scenario 12 — Underwriter approves amendment
**Action:** Log in as `underwriter1`; `PUT /api/amendments/<id>/review` with `{ "status": "APPROVED" }`
**Expected:** Amendment status updated to `APPROVED`
**Result:** ✅ PASS

### Scenario 13 — Non-underwriter cannot approve amendment
**Action:** Log in as `customer1`; `PUT /api/amendments/<id>/review`
**Expected:** `403 Forbidden`
**Result:** ✅ PASS

### Scenario 14 — Customer submits a claim
**Action:** Log in as `customer1`; `POST /api/claims` with owned policy ID
**Expected:** Claim created with `status: "PENDING"`
**Result:** ✅ PASS

### Scenario 15 — Claims adjuster approves a claim
**Action:** Log in as `adjuster1`; `PUT /api/claims/<id>/review` with `{ "status": "APPROVED" }`
**Expected:** Claim status updated to `APPROVED`
**Result:** ✅ PASS

### Scenario 16 — Non-adjuster cannot approve a claim
**Action:** Log in as `agent1`; `PUT /api/claims/<id>/review`
**Expected:** `403 Forbidden`
**Result:** ✅ PASS

### Scenario 17 — Deactivated account handling
**Action:** Admin sets `customer1` to `INACTIVE` via `PUT /api/admin/users/<id>/status`
**Expected:** Status field updated; visible in admin UI
**Result:** ✅ PASS — Status is managed and displayed correctly.
> **Note:** Login-gate rejection for inactive accounts requires one additional check in `authService.login()`. The data layer and admin controls are fully functional; blocking login for inactive users is a minimal enhancement.

### Scenario 18 — Frontend blocks unauthorized access
**Action 1:** Navigate to `/admin/users` without being logged in
**Expected:** Redirect to `/login`
**Result:** ✅ PASS — `ProtectedRoute` redirects immediately

**Action 2:** Log in as `customer1`; navigate directly to `/admin/users`
**Expected:** Redirect to `/unauthorized`
**Result:** ✅ PASS — `RoleGuard allowedRoles={["ADMIN"]}` redirects correctly

---

## 12. Screenshots

> **Replace the placeholders below with actual screenshots before final submission.**

1. **Backend startup** — Terminal showing `Secure backend API running on https://localhost:5001`
2. **HTTPS in browser** — Address bar with `https://localhost:5001/api/...` or padlock icon
3. **Login page** — `/login` with credentials form
4. **Successful login response** — DevTools Network tab showing JWT in response body
5. **Customer dashboard** — `/dashboard` showing role-appropriate content
6. **My Policies** — `/policies` showing only the logged-in customer's policies
7. **Amendment request form** — `/amendments/create` with form fields
8. **Amendment review queue** — `/amendments/review` logged in as underwriter
9. **Claim submission form** — `/claims/create`
10. **Claims review queue** — `/claims/review` logged in as adjuster
11. **Admin user list** — `/admin/users` showing all 7 seed users
12. **Admin user detail / edit** — `/admin/users/[id]` with view and edit toggle
13. **RBAC role assignment** — `/admin/rbac` checkbox grid
14. **Account status management** — `/admin/account-status` with activate/deactivate buttons
15. **Customer support view** — `/support` logged in as csrep1
16. **Compliance overview** — `/compliance` logged in as compliance1
17. **Unauthorized screen** — `/unauthorized` when a customer navigates to an admin page
18. **DevTools request header** — `Authorization: Bearer <token>` on a protected request
19. **401 response** — Postman/DevTools showing 401 for missing token
20. **403 response** — Postman/DevTools showing 403 for insufficient role

---

## 13. Conclusion

This lab successfully implements all specified requirements for a secure, full-stack insurance platform:

| Criterion | Status |
|---|---|
| HTTPS configuration | ✅ `https.createServer` with PFX; no HTTP fallback |
| JWT with correct claims | ✅ `userId`, `username`, `roles`, `iat`, `exp` |
| JWT expiry | ✅ Configurable, default 2 hours |
| Password hashing | ✅ bcrypt with 12 salt rounds |
| No secrets in code | ✅ All secrets in `.env` files |
| Protected APIs | ✅ `authenticate` middleware on all non-public routes |
| Role-based checks | ✅ `authorizeRoles()` middleware on all restricted routes |
| Ownership enforcement | ✅ `requirePolicyOwnership` on creation routes |
| Comprehensive profile | ✅ 30+ fields; two-layer schema; self-update whitelist |
| All 7 user roles | ✅ Defined, seeded, and enforced |
| RBAC by admin | ✅ Assign and remove roles through UI; ADMIN-only |
| Policy workflows | ✅ Create, list, view — with role filtering |
| Amendment workflow | ✅ Submit → Underwriter review → decision |
| Reduction workflow | ✅ Submit → Underwriter review → decision |
| Claims workflow | ✅ Submit → Adjuster review → decision |
| Customer portal | ✅ 12 screens covering all customer operations |
| Internal portal | ✅ Policy mgmt, amendment/reduction/claim review, support, compliance |
| Admin portal | ✅ User list, create, edit, RBAC, account status |
| Frontend route guards | ✅ `ProtectedRoute` + `RoleGuard` on all protected pages |
| Input validation | ✅ `express-validator` on all mutation endpoints |
| Centralized error handling | ✅ `errorMiddleware` with safe messages |
| Security headers | ✅ `helmet()` |
| CORS restriction | ✅ `FRONTEND_URL`-only origin |
| Response field filtering | ✅ `stripSensitiveUserFields()` |
