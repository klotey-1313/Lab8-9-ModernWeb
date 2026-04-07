# NorthStar Insurance Platform

This is a full-stack insurance platform I built for the Modern Web Technologies lab. The idea behind it is to simulate how a real insurance company might build a secure web system — one that handles everything from customer policy management to internal claims processing, all protected with HTTPS, JWT tokens, and proper role-based access control.

The backend is built with Node.js and Express.js, and the frontend uses Next.js with TypeScript. MongoDB is used for storage. The whole thing is designed around security first — every API is protected, every user has a role, and customers can only ever see their own data.

---

## Table of Contents

1. [What This Project Does](#1-what-this-project-does)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [What You Need Before Starting](#4-what-you-need-before-starting)
5. [Setting Up HTTPS Certificates](#5-setting-up-https-certificates)
6. [Environment Variables](#6-environment-variables)
7. [Installing and Seeding](#7-installing-and-seeding)
8. [Running the App](#8-running-the-app)
9. [Test Users and Roles](#9-test-users-and-roles)
10. [How JWT Works in This App](#10-how-jwt-works-in-this-app)
11. [User Profile Module](#11-user-profile-module)
12. [RBAC — How Role Management Works](#12-rbac--how-role-management-works)
13. [How Routes Are Protected](#13-how-routes-are-protected)
14. [API Endpoints](#14-api-endpoints)
15. [Security Decisions Made](#15-security-decisions-made)
16. [Frontend Pages](#16-frontend-pages)

---

## 1. What This Project Does

NorthStar is a two-sided insurance platform. On one side you have customers who can log in, view their policies, request changes, and submit claims. On the other side you have internal staff — agents who create policies, underwriters who review amendment and reduction requests, claims adjusters who process claims, and administrators who manage everything.

The system supports three types of insurance:

- **Life Insurance** — tracks a beneficiary name
- **Car Insurance** — tracks the vehicle make and model
- **Home Insurance** — tracks the property address

The main focus of the lab was security. Every single API call goes over HTTPS, every protected endpoint requires a valid JWT, and users can only do what their role allows. A customer trying to view someone else's policy gets a 403. A claims adjuster trying to assign roles gets a 403. The boundaries are enforced at the middleware level, not just on the frontend.

---

## 2. Tech Stack

**Backend:**
- Node.js 18 with ES modules
- Express.js 4 for routing and middleware
- Node.js built-in `https` module for HTTPS (no HTTP fallback)
- `jsonwebtoken` for signing and verifying JWTs
- `bcryptjs` for hashing passwords
- MongoDB with Mongoose 8 for data storage
- `express-validator` for input validation
- `helmet` for security headers, `cors` for origin control

**Frontend:**
- Next.js 15 with the App Router
- React 19 with TypeScript
- Native `fetch` API for HTTPS calls to the backend
- `lucide-react` for icons

---

## 3. Project Structure

The project is split into two applications — a backend API and a frontend web app — inside the same repo.

```
insurance-platform/
├── backend-api/
│   ├── cert/               ← your HTTPS certificate lives here (not committed to git)
│   └── src/
│       ├── config/         ← environment, HTTPS, database, CORS setup
│       ├── constants/      ← role names, status values, claim types
│       ├── controllers/    ← one file per module, handles req/res
│       ├── middleware/     ← authenticate, authorizeRoles, ownershipCheck, errorHandler
│       ├── models/         ← Mongoose schemas for User, Policy, Claim, etc.
│       ├── repositories/   ← all database calls live here, nowhere else
│       ├── routes/         ← Express routers, one per module
│       ├── seed/           ← seed scripts for roles and users
│       ├── services/       ← business logic layer
│       ├── validators/     ← express-validator rules per endpoint
│       ├── utils/          ← helpers: apiResponse, appError, safeObject
│       ├── app.js          ← Express app setup (middleware, routes)
│       └── server.js       ← starts the HTTPS server
│
├── frontend-web/
│   └── src/
│       ├── app/            ← Next.js pages (login, dashboard, policies, claims, etc.)
│       ├── components/     ← reusable UI: forms, guards, layout, tables
│       ├── context/        ← AuthContext (stores token and user globally)
│       ├── hooks/          ← useAuth hook
│       ├── lib/            ← api.ts (all fetch calls), formatters, constants
│       └── types/          ← TypeScript interfaces
│
├── seed.bat                ← Windows: run this to seed the database
├── start-platform.bat      ← Windows: starts both servers at once
└── start-platform.sh       ← Mac/Linux: same thing
```

---

## 4. What You Need Before Starting

Before you can run the project, make sure you have these installed:

- **Node.js 18 or later** — download from [nodejs.org](https://nodejs.org)
- **npm 9+** — comes bundled with Node.js
- **MongoDB** — either run it locally or use a free MongoDB Atlas cluster
- **OpenSSL** — needed to generate the HTTPS certificate

You can check everything is ready by running:

```bash
node --version
npm --version
mongod --version
openssl version
```

---

## 5. Setting Up HTTPS Certificates

The backend runs exclusively over HTTPS, so you need to generate a self-signed certificate for local development. Open a terminal inside the `backend-api/` folder and run these commands:

```bash
mkdir -p cert
cd cert

# Create a private key and self-signed certificate
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem \
  -sha256 -days 365 -nodes \
  -subj "/C=CA/ST=Ontario/L=Toronto/O=NorthStar/CN=localhost"

# Bundle into a PFX file — pick any passphrase and remember it
openssl pkcs12 -export \
  -out server.pfx \
  -inkey key.pem \
  -in cert.pem \
  -passout pass:your_passphrase_here
```

After running that, open `backend-api/.env` and set `HTTPS_PFX_PASSPHRASE` to the passphrase you used.

**Trusting the certificate in your browser:** Since this is a self-signed cert, the browser will show a security warning. You can import `cert/cert.pem` into your system's trusted store, or just click "Advanced → Proceed to localhost" when the warning appears.

**For the frontend:** Add `NODE_TLS_REJECT_UNAUTHORIZED=0` in `frontend-web/.env.local` so the Next.js process doesn't reject the self-signed cert. This is only for development — never use this setting in production.

---

## 6. Environment Variables

### Backend — `backend-api/.env`

Copy the example file and fill in the values:

```bash
cp backend-api/.env.example backend-api/.env
```

Here's what a working `.env` file looks like:

```env
NODE_ENV=development
PORT=5001
MONGODB_URI=mongodb://127.0.0.1:27017/insurance_platform
JWT_SECRET=replace_this_with_a_long_random_string_of_at_least_32_chars
JWT_EXPIRES_IN=2h
FRONTEND_URL=http://localhost:3000
HTTPS_PFX_PATH=./cert/server.pfx
HTTPS_PFX_PASSPHRASE=your_passphrase_here
```

A few things to keep in mind: `JWT_SECRET` should be a long random string — think of it like a password for signing tokens. `FRONTEND_URL` tells the backend which origin is allowed through CORS. The PFX path and passphrase must match what you generated in the previous step.

### Frontend — `frontend-web/.env.local`

```bash
cp frontend-web/.env.local.example frontend-web/.env.local
```

```env
NEXT_PUBLIC_API_BASE_URL=https://localhost:5001/api
NODE_TLS_REJECT_UNAUTHORIZED=0
```

---

## 7. Installing and Seeding

Install dependencies for both projects:

```bash
# backend
cd backend-api
npm install

# frontend (open a second terminal)
cd frontend-web
npm install
```

Once that's done, seed the database. **Important:** always seed roles before users, otherwise the user seed script will fail because it needs role IDs to exist first.

**Windows — just run this from the project root:**
```
seed.bat
```

**Mac / Linux:**
```bash
cd backend-api
node src/seed/roles.seed.js
node src/seed/users.seed.js
```

The seed script wipes any existing users and recreates them fresh. If you re-run it, you'll lose any records you created manually inside the app.

---

## 8. Running the App

**Windows — easiest way:**
Double-click `start-platform.bat` from the project root. It opens both servers in separate terminal windows automatically.

**Or manually in two terminals:**
```bash
# Terminal 1
cd backend-api
npm run dev

# Terminal 2
cd frontend-web
npm run dev
```

Once both are running, open `http://localhost:3000` in your browser to use the app. The backend API is available at `https://localhost:5001/api`.

---

## 9. Test Users and Roles

All seeded accounts use the password **`Password123!`**

| Username | Role | What they can do |
|---|---|---|
| `admin1` | ADMIN | Full access — user management, RBAC, all records |
| `agent1` | AGENT | Create policies, assist customers |
| `underwriter1` | UNDERWRITER | Approve or reject amendment and reduction requests |
| `adjuster1` | CLAIMS_ADJUSTER | Review and decide on claims |
| `csrep1` | CUSTOMER_SERVICE | Look up customer profiles, policies, and claims for support |
| `compliance1` | COMPLIANCE_OFFICER | Read-only view of users, roles, and platform activity |
| `customer1` | CUSTOMER | Manage own policies, request amendments/reductions, submit claims |

**Who can do what:**

| Action | CUSTOMER | AGENT | UNDERWRITER | ADJUSTER | CS REP | COMPLIANCE | ADMIN |
|---|---|---|---|---|---|---|---|
| View own profile | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit own profile | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View all users | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ read-only | ✅ |
| Create/edit users | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
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

## 10. How JWT Works in This App

When a user logs in, the backend validates their password using `bcrypt.compare()`. If it matches, it updates the `lastLoginAt` timestamp on the user record and issues a signed JWT using the `JWT_SECRET` from the environment. The token expires after 2 hours by default.

The token payload looks like this:

```json
{
  "userId":   "64abc123...",
  "username": "customer1",
  "roles":    ["CUSTOMER"],
  "iat":      1712000000,
  "exp":      1712007200
}
```

It includes `userId`, `username`, `roles`, an issue timestamp (`iat`), and an expiry (`exp`). Passwords are never included.

Every protected API route runs through the `authenticate` middleware first. It reads the `Authorization: Bearer <token>` header, calls `jwt.verify()` to check the signature and expiry, and then fetches the full user from MongoDB using the `userId` from the decoded payload. This extra database lookup is intentional — it ensures the user still exists and their account hasn't been deleted since the token was issued. If anything fails, the middleware returns a `401` immediately.

On the frontend, the token is stored in `localStorage` and attached to every request by `src/lib/api.ts`. The `AuthContext` reads from storage on page load to restore session state. When the user logs out, the token is deleted and they're sent back to `/login`.

---

## 11. User Profile Module

The user model is deliberately split into two parts. The outer schema holds authentication-related fields, and the embedded profile schema holds all the business information about the person.

**Authentication fields** (stored at the top level of the user document):
- `username` — unique login identifier
- `passwordHash` — bcrypt hash, never returned in any API response
- `roles` — array of references to Role documents in MongoDB
- `accountStatus` — either `ACTIVE` or `INACTIVE`
- `lastLoginAt` — updated every time the user logs in successfully
- `createdAt` and `updatedAt` — managed automatically by Mongoose

**Profile fields** (stored inside `user.profile`):

Personal info: `firstName`, `lastName`, `dateOfBirth`, `email`, `phone`

Address: `addressLine1`, `addressLine2`, `city`, `province`, `postalCode`, `country`

Platform metadata: `customerNumber` or `employeeNumber`, `userType` (CUSTOMER or INTERNAL), `preferredContactMethod`, `emergencyContactName`, `emergencyContactPhone`

Internal staff only: `department`, `jobTitle`, `supervisorName`, `internalAccessStatus`

Customer only: `clientCategory` (e.g. standard, premium), `beneficiaryName` (life insurance placeholder)

**Self-update whitelist:** When a user updates their own profile via `PUT /api/profile/me`, the service only applies fields from a hardcoded allowlist of 16 personal fields. Even if someone sends `userType` or `accountStatus` in the request body, those fields are silently ignored. This prevents any kind of privilege escalation through self-update.

---

## 12. RBAC — How Role Management Works

Role-based access control is managed entirely through the app — there's no need to touch the database directly or edit any config files. Only users with the `ADMIN` role can make changes to role assignments.

**What the admin can do:**
- List all users and see which roles they have
- Create new user accounts with roles pre-assigned
- Assign a new set of roles to any user (`PUT /api/admin/rbac/users/:userId/roles`)
- Remove a single specific role from a user (`DELETE /api/admin/rbac/users/:userId/roles/:roleName`)
- Activate or deactivate any account (`PUT /api/admin/users/:userId/status`)
- List all available roles in the system

**How role assignment works internally:** When the admin submits a list of role names, the service looks up each name in the `roles` MongoDB collection to get the corresponding ObjectId. If any name doesn't match a real role, the whole request fails with a 400 error. Once all names are validated, the user's `roles` array is updated with the ObjectIds. Storing ObjectIds (not strings) keeps the data consistent with proper document references in MongoDB.

**How role removal works:** The remove endpoint takes a role name in the URL path. The service fetches the user, resolves the name to an ObjectId, filters that role out of the array, and saves. It's straightforward and surgical — only that one role is removed.

**Enforcement:** Every RBAC mutation endpoint is protected by `authorizeRoles("ADMIN")`. There's deliberately no endpoint that lets users modify their own roles. Role changes take effect immediately on the next request because the `authenticate` middleware always re-fetches the user from MongoDB — the JWT is not the source of truth for roles, the database is.

---

## 13. How Routes Are Protected

Every protected API endpoint passes through a chain of middleware before reaching the controller. The chain looks like this:

```
authenticate → authorizeRoles(...) → requirePolicyOwnership → controller
```

**`authenticate`** reads the `Authorization: Bearer <token>` header, verifies the signature and expiry with `jwt.verify()`, then loads the full user from MongoDB. If anything goes wrong — bad token, expired token, user not found — it stops the request and returns a `401 Unauthorized`. Only after this passes does `req.user` get set.

**`authorizeRoles(...roles)`** is a middleware factory. You call it with a list of allowed roles and it returns a middleware function that checks whether the current user has at least one of them. If not, it returns `403 Forbidden`. The distinction between 401 and 403 matters: 401 means "you're not logged in", 403 means "you're logged in but not allowed here".

**`requirePolicyOwnership`** is used on routes where a customer is referencing a policy (like when submitting an amendment or claim). It loads the policy and checks that `policy.customer` matches `req.user._id`. Admins and Agents bypass this check since they need broader access. Everyone else gets a `403` if they reference a policy that isn't theirs.

On the frontend, two guard components protect pages:

**`ProtectedRoute`** checks whether the user is logged in. If not, it redirects to `/login` before rendering anything.

**`RoleGuard`** checks whether the logged-in user has one of the required roles. If not, it redirects to `/unauthorized`.

They're always composed together:

```tsx
<ProtectedRoute>
  <RoleGuard allowedRoles={["ADMIN"]}>
    <AdminPage />
  </RoleGuard>
</ProtectedRoute>
```

---

## 14. API Endpoints

**Auth (public)**
- `POST /api/auth/login` — submit credentials, get back a JWT and user object

**Profile (any authenticated user)**
- `GET /api/profile/me` — view your own profile
- `PUT /api/profile/me` — update allowed personal fields on your own profile

**Policies**
- `POST /api/policies` — create a new policy (AGENT, ADMIN)
- `GET /api/policies` — list policies (customers only see their own)
- `GET /api/policies/:policyId` — view a single policy

**Amendments**
- `POST /api/amendments` — submit an amendment request (CUSTOMER, AGENT, ADMIN)
- `GET /api/amendments` — list all amendments
- `GET /api/amendments/review` — pending queue for underwriters (UNDERWRITER, ADMIN)
- `PUT /api/amendments/:id/review` — approve or reject (UNDERWRITER, ADMIN)

**Reductions**
- `POST /api/reductions` — submit a coverage reduction request (CUSTOMER, AGENT, ADMIN)
- `GET /api/reductions` — list all reductions
- `GET /api/reductions/review` — pending queue (UNDERWRITER, ADMIN)
- `PUT /api/reductions/:id/review` — approve or reject (UNDERWRITER, ADMIN)

**Claims**
- `POST /api/claims` — submit a claim (CUSTOMER, ADMIN)
- `GET /api/claims` — list claims
- `GET /api/claims/review` — pending queue (CLAIMS_ADJUSTER, ADMIN)
- `PUT /api/claims/:id/review` — approve or reject (CLAIMS_ADJUSTER, ADMIN)

**Admin — Users**
- `GET /api/admin/users` — list all users (ADMIN, COMPLIANCE_OFFICER)
- `POST /api/admin/users` — create a new user (ADMIN)
- `GET /api/admin/users/customers` — customer list for support (ADMIN, AGENT, CUSTOMER_SERVICE)
- `GET /api/admin/users/:userId` — view a specific user (ADMIN, COMPLIANCE_OFFICER, CUSTOMER_SERVICE)
- `PUT /api/admin/users/:userId` — update user details and roles (ADMIN)
- `PUT /api/admin/users/:userId/status` — activate or deactivate (ADMIN)

**Admin — RBAC**
- `GET /api/admin/rbac/roles` — list all roles (ADMIN, COMPLIANCE_OFFICER)
- `PUT /api/admin/rbac/users/:userId/roles` — replace role assignments (ADMIN)
- `DELETE /api/admin/rbac/users/:userId/roles/:roleName` — remove one specific role (ADMIN)

---

## 15. Security Decisions Made

Here's a plain-English summary of the security measures built into the platform and why each one was included:

**HTTPS only** — The server is started with `https.createServer()` and there is no HTTP port. Every byte between the browser and the backend is encrypted.

**JWT with expiry** — Tokens expire after 2 hours. This limits the window of damage if a token is ever leaked.

**Password hashing** — Passwords are hashed with bcrypt using 12 rounds. The raw password is never stored or returned in any response.

**No secrets in code** — Every secret (JWT key, DB URI, PFX passphrase) is in `.env` files that are excluded from git via `.gitignore`. Only example files with placeholder values are committed.

**Input validation** — Every route that accepts a request body runs `express-validator` rules. Invalid input is rejected with a clear error before it ever reaches business logic.

**Security headers** — `helmet()` is applied globally in `app.js`. It sets headers like Content-Security-Policy and X-Frame-Options automatically.

**Centralized error handling** — All errors flow through a single `errorMiddleware`. It returns a consistent JSON shape and never leaks stack traces to the client in production.

**401 vs 403** — These are kept distinct on purpose. A 401 means the user is not authenticated (no token or bad token). A 403 means they're authenticated but don't have permission. Mixing these up is a common mistake that can confuse users and clients.

**Ownership enforcement** — The `requirePolicyOwnership` middleware makes it impossible for a customer to submit a claim or amendment against someone else's policy, even if they know the policy ID.

**Field whitelist on self-update** — The profile service explicitly lists which fields a user is allowed to change on their own profile. Anything else is silently ignored.

**CORS restriction** — The backend only accepts requests from the `FRONTEND_URL` configured in `.env`.

---

## 16. Frontend Pages

**Customer Portal** — everything a customer needs to manage their own insurance:
- `/login` — login page
- `/dashboard` — overview after login
- `/profile` and `/profile/edit` — view and edit personal profile
- `/policies` and `/policies/[id]` — list and view owned policies
- `/amendments` and `/amendments/create` — view and submit amendment requests
- `/reductions` and `/reductions/create` — view and submit reduction requests
- `/claims` and `/claims/create` — view submitted claims and file new ones

**Internal Portal** — for agents, underwriters, adjusters, and support staff:
- `/dashboard` — shared dashboard for all authenticated users
- `/policies/create` — create a new policy (agent)
- `/amendments/review` — review pending amendment requests (underwriter)
- `/reductions/review` — review pending reduction requests (underwriter)
- `/claims/review` — review and decide on submitted claims (adjuster)
- `/support` — customer lookup with policy and claim details (customer service)
- `/compliance` — read-only platform overview with user and role audit (compliance officer)

**Admin Portal** — user and access management:
- `/admin/users` — searchable list of all users
- `/admin/users/create` — provision a new account with roles
- `/admin/users/[id]` — view details and edit any user profile
- `/admin/rbac` — checkbox-based role assignment per user
- `/admin/account-status` — activate or deactivate any account
