# Software Hub 2.0 — Central Office Command Center
### St. Mary’s Rehabilitation University

A unified administrative management platform, real-time operations command hub, and credential issuance system designed for university leadership, faculty leads, and software engineering interns.

---

## 🏛️ Project Overview

The **Software Hub 2.0 Command Center** is a secure, production-ready enterprise university management platform supporting:

- **Executive Central Office Roster**: Support for official administrators, faculty co-admins, core paid interns, and unpaid interns.
- **Attendance & Campus Geofencing**: GPS-validated check-in and check-out bounded by St. Mary's Rehabilitation University campus perimeter (800m geofence), coupled with strict student attendance privacy.
- **Leave & Work-From-Home Workflows**: Complete application, automated notifications, and administrative review for Full-day, Half-day, Work from Home (Remote Sprint), and Academic/Medical leaves.
- **Central Office Credential Registry**: Dynamic certificate studio with official template designs (Core Paid Modern & Unpaid Classic Gold), performance threshold validation, audit-trailed reissuance, and public verification portal.
- **Automated Communication Engine**: 16 customizable Central Office email templates with dynamic variable interpolation, live rendered HTML preview, and delivery logs.
- **Persistent Notification Center & Approval Inbox**: Real-time cross-device notifications and centralized queue for pending leaves, task sprint reviews, and level promotions.
- **Dual-Theme Design System**: Flash-free, persistent Dark Mode and Light Mode with high-contrast accessibility.

---

## 🛠️ Architecture & Technology Stack

The project is structured as an npm workspaces monorepo:

```
Command center/
├── apps/
│   ├── api/                    # Express.js REST API & WebSocket server
│   │   ├── assets/             # Official university seals & certificate templates
│   │   ├── src/
│   │   │   ├── config/         # Database, Redis, Keys, and Environment config
│   │   │   ├── db/             # Knex migrations & seed scripts
│   │   │   ├── middleware/     # Auth, RBAC, File Upload, and Validation
│   │   │   └── modules/        # Auth, Attendance, Tasks, Users, Certificates, etc.
│   │   └── tests/              # Vitest API & Business Rules test suite
│   │
│   └── web/                    # React 18, Vite & Tailwind CSS client
│       ├── public/assets/      # University crest & template backgrounds
│       ├── src/
│       │   ├── components/     # Reusable UI primitives & AppLayout
│       │   ├── contexts/       # Auth, Theme & Toast contexts
│       │   ├── screens/        # Dashboard, Attendance, Tracker, Certificates, Chat, etc.
│       │   └── tests/          # Vitest screen & component test suite
│       └── index.html          # Early theme hydration & accessibility tags
│
└── packages/
    └── shared/                 # Shared TypeScript interfaces, schemas & constants
```

### Core Technologies
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, TanStack React Query, Lucide Icons
- **Backend**: Node.js, Express, TypeScript, Knex.js, SQLite, PDFKit, QRCode, Nodemailer, WebSocket (`ws`)
- **Validation & Shared Schemas**: Zod, Shared Types Monorepo Package
- **Testing**: Vitest across API and Web packages

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18.x or v20.x recommended)
- npm (v9.x or higher)

### 1. Installation
Install all dependencies across monorepo workspaces:
```bash
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env` in the root or set environment variables:
```bash
cp .env.example .env
```

### 3. Database Migration & Seeding
Run schema migrations and initialize the official roster and templates:
```bash
npm run seed --workspace=@command-center/api
```

### 4. Running the Development Servers
Start both backend API and frontend Vite dev servers concurrently:
```bash
npm run dev
```
- **Web Application**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000`
- **Public Credential Verification**: `http://localhost:5173/verify/SH2-L2-0007`

---

## 👥 Official Personnel Accounts (Default Seed)

| Role | Name | Email | Password |
|---|---|---|---|
| **Admin** | Sri Ram | `sri.ram@softwarehub2.org` | `Password123!` |
| **Co-Admin / Lead** | Sheshi | `sheshi@softwarehub2.org` | `Password123!` |
| **Core Intern** | Manohar | `manohar@softwarehub2.org` | `Password123!` |
| **Core Intern** | Sri Vidhya | `sri.vidhya@softwarehub2.org` | `Password123!` |
| **Core Intern** | Mahendar | `mahendar@softwarehub2.org` | `Password123!` |
| **Unpaid Intern** | Cherry | `cherry@softwarehub2.org` | `Password123!` |
| **Unpaid Intern** | Ana | `ana@softwarehub2.org` | `Password123!` |
| **Unpaid Intern** | Nandhini | `nandhini@softwarehub2.org` | `Password123!` |

---

## 🧪 Testing & Verification

Run the comprehensive unit and integration test suite:
```bash
npm test
```
Build all monorepo workspaces for production:
```bash
npm run build --workspaces
```

---

## 🔒 Security & Privacy Practices

- **Zero Secret Leakage**: Private keys, credentials, local databases, and temporary sessions are strictly isolated via `.gitignore`.
- **RBAC**: Multi-tier role-based access control (Admin, Lead, Paid Intern, Unpaid Intern) enforced at API middleware and router levels.
- **Attendance Privacy**: Non-managerial accounts can only access their own attendance records.
- **Audit Logging**: Immutable administrative audit trails for certificate reissues, message purges, promotions, and rule adjustments.

---

## 📜 License
Central Office Management Platform — St. Mary’s Rehabilitation University. All Rights Reserved.
