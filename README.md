# Command Center — Central Office Work App
### St. Mary’s Rehabilitation University

The official, production-grade work operations and credential issuance platform for St. Mary’s Rehabilitation University Central Office. Engineered for speed, reliability, and security across mobile (360px+) and desktop devices.

---

## 🏛️ System Overview

The **Command Center** provides an end-to-end operational hub for university leadership, faculty coordinators, and student interns:

- **Institutional Personnel Structure**: Strict role-based hierarchy supporting Administrators, Faculty Leads/Co-Admins, Core (Paid) Interns, and Unpaid Interns with mentor pairing.
- **Invite-Only Onboarding**: Public self-registration is permanently disabled. Access is granted solely via cryptographically generated, single-use, 7-day expiring invite links scoped to specific roles.
- **Robust Session & Auth Security**: RS256 JWT tokens with 15-minute lifespan paired with rotated, secure HTTP-only refresh tokens stored in Redis. Automatic account lockout after 5 consecutive failed attempts and single-use 30-minute password reset flows.
- **Attendance & Privacy Verification**: Privacy-preserving check-in/check-out bounded by the university campus geofence (800m perimeter) with Excel exports.
- **Central Office Credential Studio**: Verifiable certificate generation with official university seals, dynamic QR verification links, eligibility threshold checks (e.g. 75% attendance; 80% marksheet for core), and audit-trailed reissuance.
- **Automated Communication Engine**: 10 automated notification rules backed by distributed Redis locks, idempotency keys, delivery tracking, and exponential backoff retry.
- **Unified Calendar Integration**: One-way sync to Google Calendar via OAuth2 using plain fetch with AES-256-GCM encrypted refresh tokens, alongside private `.ics` subscription feeds for Outlook and Apple Calendar.

---

## 🛠️ Technology Stack

- **Backend**: Node.js + TypeScript, Express 4, PostgreSQL 16 (Knex.js), Redis 7, Zod, JWT RS256 + bcrypt (cost 12), Nodemailer, Vitest + Supertest.
- **Frontend**: React 19 + TypeScript, Vite, Tailwind CSS 4, TanStack Query, React Router 7, custom component library (no Radix, no shadcn), Vitest + Testing Library.
- **Allowed Extensions**: Socket.IO (Redis adapter) for live team chat, Multer for file uploads, web-push, PDFKit, QRCode, ExcelJS. Plain `fetch` for Google API integrations.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v20.x or higher)
- npm (v10.x or higher)
- Docker & Docker Compose (for PostgreSQL 16 and Redis 7)

### 1. Installation
Install all dependencies across the monorepo:
```bash
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env` and set your secure seed passwords and API credentials:
```bash
cp .env.example .env
```
Ensure the following seed password variables are populated with strong passwords:
- `SEED_ADMIN_PASSWORD`
- `SEED_COADMIN_PASSWORD`
- `SEED_CORE_PASSWORD`
- `SEED_INTERN_PASSWORD`

### 3. Start Infrastructure (PostgreSQL & Redis)
Launch the containerized PostgreSQL 16 and Redis 7 services:
```bash
docker compose up -d
```

### 4. Database Migrations & Idempotent Seeding
Apply database migrations and initialize the official institutional accounts:
```bash
npm run migrate --workspace=@command-center/api
npm run seed --workspace=@command-center/api
```

### 5. Running the Development Servers
Start both the backend API and frontend Vite servers concurrently:
```bash
npm run dev
```
- **Web App**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000`
- **Health Check**: `http://localhost:5000/health`
- **Public Certificate Verification**: `http://localhost:5173/verify/:certNumber`

---

## 👥 Seeded Institutional Accounts

The database seed (`apps/api/src/db/seeds/initial_seed.ts`) is idempotent and initializes only the 4 authorized central office accounts. Passwords are read strictly from environment variables at seed time and never stored in plain text. Each seeded user is initialized with `must_change_password: true`, requiring a password update upon first login.

| Role | Name | Institutional Email | Environment Variable | Mentor / Pair |
|---|---|---|---|---|
| **Admin** | Sri Ram | `sriram@smru.edu.in` | `SEED_ADMIN_PASSWORD` | — |
| **Co-Admin / Lead** | Sheshi | `sheshitejs@gmail.com` | `SEED_COADMIN_PASSWORD` | — |
| **Core Intern** | Surya | `gundasurya600@gmail.com` | `SEED_CORE_PASSWORD` | — |
| **Unpaid Intern** | Anaalia | `anaalia092@gmail.com` | `SEED_INTERN_PASSWORD` | Paired to Surya |

---

## 🧪 Testing & Quality Assurance

Run all test suites across the monorepo:
```bash
npm test
```

Build all packages and client assets for production:
```bash
npm run build --workspaces
```

---

## 🔒 Security Standards

- **Invite Only**: Public self-registration returns HTTP 403. New accounts must be invited by an Administrator, Lead, or Core Intern (scoped according to RBAC).
- **Brute-Force Lockout**: 5 failed login attempts trigger an immediate 15-minute Redis-backed account lockout.
- **Token Protection**: JWTs signed via RS256 with key rotation support; Google refresh tokens stored with AES-256-GCM encryption.
- **Audit Logging**: All administrative grants, certificate issuances, role modifications, and team deletions are captured in immutable audit logs.

---

## 📜 License
Central Office Management Platform — St. Mary’s Rehabilitation University. All Rights Reserved.
