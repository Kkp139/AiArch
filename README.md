# A&F Design Studio Collaboration Portal & PWA

Production-grade architectural collaboration platform and Progressive Web App (PWA) built for **A&F Design — Architecture & Interior Studio**.

## 🌟 Key Features

- **Approved Figma Design (Node 5:2, 17:102, 21:3621):** Monochromatic luxury charcoal (`#0C0C0D`) and warm limestone bronze (`#BF935A`) aesthetic.
- **Production Progressive Web App (PWA):**
  - Installable across iOS (iPhone/iPad Safari), Android, macOS, and Windows.
  - Offline resilience with branded offline fallback (`offline.html`).
  - Cache security: Zero caching of authenticated API responses or private CAD documents; session caches purged on logout.
- **Multi-Role Studio Dashboards:**
  - **Admin:** Full studio oversight, revision counters, user onboarding, dynamic meeting toggles, payment ledger.
  - **Staff Architect:** Active project drawings, attendance clock-in/out with daily work update gate, revision counters (strictly excluded from financial ledgers).
  - **Client Leader:** Project milestones, approvals, booking consultation meetings, real-time encrypted messaging.
  - **Client Viewer:** Read-only access to approved drawings and schedules.
- **7 Locked Architectural Rules:**
  1. Universal multi-factor OTP verification for non-admin sign-ins.
  2. Single-use, time-limited invitation links (no permanent passwords).
  3. Revision counter visible to both Admin and Staff.
  4. 16 Appendix A design folders strictly categorized under Concept Design (6) and Construction Documentation (10).
  5. Configurable dynamic meetings access for clients.
  6. Staff unconditionally blocked from financial/payment ledgers.
  7. Strict studio branding: "A&F Design" throughout.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Copy `.env.example` to `.env` and configure your Resend API key or database settings:
```bash
cp .env.example .env
```

### 3. Run Development Servers
```bash
# Start Fastify Backend API (Port 4000)
npm run dev:api

# Start Vite Frontend (Port 5173)
npm run dev:web
```

### 4. Run Automated Tests
```bash
# Run all 113 unit & integration tests
npm test

# Run PWA test suite
node ./node_modules/vitest/vitest.mjs run apps/web/test/pwa.test.tsx
```

### 5. Production Build
```bash
npm run build:web
```

---

## 📖 Complete Documentation
For in-depth architecture, security rules, cross-platform installation instructions, Nginx reverse proxy configurations, and QA test matrices, see:
- [PWA Architecture & Deployment Guide](docs/PWA_ARCHITECTURE_AND_DEPLOYMENT.md)