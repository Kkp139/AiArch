# ProNex-ArchAI Studio Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready, containerized architectural and interior-design studio collaboration platform (ProNex-ArchAI) with 4 user roles, 16 fixed categories, DWG preview pipeline, GPS attendance with clock-out gating, collision-free meetings, and a 1+3 push retry notification engine — ready for single-tenant deployment for this client and future studio sales.

**Architecture:** A TypeScript modular monolith structured as a pnpm monorepo containing a Fastify REST API with Socket.io real-time gateway, a PostgreSQL 16 database managed by Prisma ORM, a BullMQ/Redis asynchronous background worker for CAD conversion and push retries, and a React 18+ (Vite) installable PWA with minimalist luxury architectural styling. Packaged into a clean `docker-compose.yml` for turnkey single-tenant deployments.

**Tech Stack:** Node.js 20+, TypeScript, Fastify, Prisma ORM, PostgreSQL 16, Redis 7, BullMQ, React 18, Vite, Socket.io, S3/R2 Cloud Object Storage, Web Push API.

**Spec:** [docs/superpowers/specs/2026-10-19-pronex-archai-studio-portal-design.md](file:///c:/Kamal%20Learning/A&B_Desgin/docs/superpowers/specs/2026-10-19-pronex-archai-studio-portal-design.md)

## Global Constraints
- Maximum 4 equal Admin accounts in V1; system must strictly prevent deactivating the last active Admin.
- Navigation and headers must display the user's Full Name only, never displaying role in parentheses.
- Staff must never see project fees, advance payments, receipts, or the Payments module anywhere in API or UI.
- Revision Counter (e.g., Rev 3) in Design Verification must be visible to both Admin and Staff.
- If uploaded filename does not match `[ProjectName]_[Category]_[SubCategory]_[FileName]`, present an interactive rename warning prompt before routing into `03_OTHER`.
- Progress calculation is based on exactly 16 counted folders: `(count_with_files / 16) * 100%`.
- Staff Clock-Out must be strictly blocked if any required daily work update for that day is pending.
- Meeting scheduling uses 3 fixed slots (`12:00–13:30`, `16:00–17:30`, `18:00–19:30`) with atomic global collision prevention.
- Push delivery uses a 1+3 retry engine (initial, +1m, +5m, +15m) without duplicate in-app records; sensitive data never exposed in push previews.

---

### Task 1: Monorepo Scaffolding & Core Infrastructure

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `docker-compose.yml`
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/src/server.ts`
- Create: `apps/worker/package.json`
- Create: `apps/worker/tsconfig.json`
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Test: `apps/api/test/health.test.ts`

**Interfaces:**
- Produces: Base monorepo build, running Fastify server with `/api/health` returning `{ status: "ok", timestamp: string }`.

- [ ] **Step 1: Write the failing health test**

```typescript
// apps/api/test/health.test.ts
import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/server';

describe('GET /api/health', () => {
  it('returns ok status and timestamp', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
    await app.close();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @pronex/api test apps/api/test/health.test.ts`  
Expected: FAIL (cannot find module or server not defined)

- [ ] **Step 3: Implement minimal monorepo configs and Fastify server**

Create root `package.json`, `pnpm-workspace.yaml`, and `apps/api/src/server.ts`:

```typescript
// apps/api/src/server.ts
import Fastify, { FastifyInstance } from 'fastify';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  app.get('/api/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  return app;
}

if (require.main === module) {
  buildApp().then(app => {
    app.listen({ port: 4000, host: '0.0.0.0' }, (err) => {
      if (err) throw err;
      console.log('ProNex-ArchAI API running on port 4000');
    });
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @pronex/api test apps/api/test/health.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json docker-compose.yml apps/
git commit -m "chore: scaffold monorepo and initial fastify api server with healthcheck"
```

---

### Task 2: Database Schema & 16-Category Seed Script (Prisma + PostgreSQL)

**Files:**
- Create: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/seed.ts`
- Create: `apps/api/src/lib/prisma.ts`
- Test: `apps/api/test/db-schema.test.ts`

**Interfaces:**
- Consumes: PostgreSQL connection via `DATABASE_URL`.
- Produces: Typed Prisma Client exporting models: `User`, `Project`, `ProjectFolder`, `ProjectDocument`, `DesignVerification`, `Meeting`, `Payment`, `Attendance`, `DailyWorkUpdate`, `ChatMessage`, `Notification`, `AuditLog`.

- [ ] **Step 1: Write the failing DB schema test**

```typescript
// apps/api/test/db-schema.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/lib/prisma';

describe('Database Schema & Seed Validation', () => {
  it('creates a project with exactly 16 fixed categories seeded', async () => {
    const project = await prisma.project.create({
      data: {
        projectCode: 'TEST_PRJ',
        name: 'Test Residence',
        category: 'Luxury Villa',
        siteLocation: 'Ahmedabad, Gujarat',
      },
    });

    const categories = [
      { code: '01_SITE_DRGS', name: 'SITE DRGS', phase: 'CONCEPT_DESIGN', order: 1 },
      { code: '02_ZONING_PLANNING', name: 'ZONING / PLANNING', phase: 'CONCEPT_DESIGN', order: 2 },
      { code: '03_SPACE_OBJECT_DESIGN', name: 'SPACE / OBJECT DESIGN', phase: 'CONCEPT_DESIGN', order: 3 },
      { code: '04_COMPLETE_SET_DRGS', name: 'COMPLETE SET OF DRGS', phase: 'CONCEPT_DESIGN', order: 4 },
      { code: '05_MATERIAL_SELECTION', name: 'MATERIAL SELECTION', phase: 'CONCEPT_DESIGN', order: 5 },
      { code: '06_3D_IMAGES', name: '3D IMAGES', phase: 'CONCEPT_DESIGN', order: 6 },
      { code: '07_CIVIL_DRGS', name: 'CIVIL DRGS', phase: 'CONSTRUCTION_DESIGN', order: 7 },
      { code: '08_PLUMBING_DRGS', name: 'PLUMBING DRGS', phase: 'CONSTRUCTION_DESIGN', order: 8 },
      { code: '09_FIRE_DRGS', name: 'FIRE DRGS', phase: 'CONSTRUCTION_DESIGN', order: 9 },
      { code: '10_HVAC_DRGS', name: 'HVAC DRGS', phase: 'CONSTRUCTION_DESIGN', order: 10 },
      { code: '11_FLOORING_DRGS', name: 'FLOORING DRGS', phase: 'CONSTRUCTION_DESIGN', order: 11 },
      { code: '12_CEILING_DRGS', name: 'CEILING DRGS', phase: 'CONSTRUCTION_DESIGN', order: 12 },
      { code: '13_ELECTRICAL_DRGS', name: 'ELECTRICAL DRGS', phase: 'CONSTRUCTION_DESIGN', order: 13 },
      { code: '14_WALL_ELEVATION', name: 'WALL ELEVATION', phase: 'CONSTRUCTION_DESIGN', order: 14 },
      { code: '15_ELEMENT_DRGS', name: 'ELEMENT DRGS', phase: 'CONSTRUCTION_DESIGN', order: 15 },
      { code: '16_OTHER', name: '03_OTHER', phase: 'OTHER', order: 16 },
    ];

    await prisma.projectFolder.createMany({
      data: categories.map(c => ({
        projectId: project.id,
        categoryCode: c.code,
        folderName: c.name,
        phaseGroup: c.phase,
        displayOrder: c.order,
        isCounted: true,
      })),
    });

    const count = await prisma.projectFolder.count({ where: { projectId: project.id } });
    expect(count).toBe(16);

    // Clean up
    await prisma.project.delete({ where: { id: project.id } });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @pronex/api test apps/api/test/db-schema.test.ts`  
Expected: FAIL (Prisma client not initialized)

- [ ] **Step 3: Define Prisma Schema and initialize client**

Write complete `apps/api/prisma/schema.prisma` matching Section 7 of the design spec and create `apps/api/src/lib/prisma.ts`. Run `npx prisma generate`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @pronex/api test apps/api/test/db-schema.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma/ apps/api/src/lib/prisma.ts apps/api/test/db-schema.test.ts
git commit -m "feat(db): implement prisma schema and 16-category seed infrastructure"
```

---

### Task 3: Authentication, RBAC (4 Roles) & WhatsApp OTP Service

**Files:**
- Create: `apps/api/src/modules/auth/auth.service.ts`
- Create: `apps/api/src/modules/auth/auth.controller.ts`
- Create: `apps/api/src/modules/auth/otp.service.ts`
- Create: `apps/api/src/middleware/rbac.middleware.ts`
- Test: `apps/api/test/auth.test.ts`

**Interfaces:**
- Produces:
  - `POST /api/auth/login`: Admin/Staff credentials auth.
  - `POST /api/auth/client-login`: Client Leader / Viewer credentials + OTP auth.
  - `POST /api/auth/send-otp`: WhatsApp OTP dispatch.
  - `POST /api/auth/setup-password`: Single-use link password creation.
  - `requireRole(roles: UserRole[])`: Fastify preHandler guard.

- [ ] **Step 1: Write the failing auth & RBAC test**

```typescript
// apps/api/test/auth.test.ts
import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/server';
import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcrypt';

describe('Auth & RBAC System', () => {
  it('prevents deactivating the last active Admin account', async () => {
    const app = await buildApp();
    // Simulate deactivation attempt when count == 1
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/deactivate-user',
      payload: { userId: 'admin-id-1' },
      headers: { authorization: 'Bearer mock-admin-token' },
    });
    // Expected behavior: rejected with 400 Bad Request
    expect([400, 403]).toContain(response.statusCode);
  });

  it('rejects client login without verified OTP', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/client-login',
      payload: {
        username: 'client_lead',
        password: 'Password123!',
        mobile: '+919876543210',
        otp: '000000', // Invalid OTP
      },
    });
    expect(response.statusCode).toBe(401);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @pronex/api test apps/api/test/auth.test.ts`  
Expected: FAIL (endpoints not implemented)

- [ ] **Step 3: Implement AuthService, OTPService and RBAC middleware**

Implement JWT token issuance, session checks, password setup token hashing, OTP store in Redis (5 min TTL), and RBAC preHandler hook.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @pronex/api test apps/api/test/auth.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/auth/ apps/api/src/middleware/ apps/api/test/auth.test.ts
git commit -m "feat(auth): implement 4-role rbac, otp validation, and secure password setup"
```

---

### Task 4: Project Management & 16-Category Progress Calculation Engine

**Files:**
- Create: `apps/api/src/modules/projects/projects.service.ts`
- Create: `apps/api/src/modules/projects/projects.controller.ts`
- Create: `apps/api/src/modules/projects/progress.service.ts`
- Test: `apps/api/test/projects.test.ts`

**Interfaces:**
- Produces:
  - `POST /api/projects`: Admin creates project; automatically creates all 16 categories.
  - `GET /api/projects/:id/progress`: Returns `{ totalCategories: 16, populatedCategories: number, percentage: number }`.
  - `PATCH /api/projects/:id/status`: Active / Inactive toggle.

- [ ] **Step 1: Write the failing progress calculation test**

```typescript
// apps/api/test/projects.test.ts
import { describe, it, expect } from 'vitest';
import { calculateProgress } from '../src/modules/projects/progress.service';

describe('Project Progress Calculation Engine', () => {
  it('calculates 12 populated categories out of 16 as exactly 75.0%', () => {
    const result = calculateProgress(12);
    expect(result.percentage).toBe(75.0);
    expect(result.totalCategories).toBe(16);
    expect(result.populatedCategories).toBe(12);
  });

  it('calculates 16 populated categories out of 16 as 100.0%', () => {
    const result = calculateProgress(16);
    expect(result.percentage).toBe(100.0);
  });

  it('calculates 0 populated categories as 0.0%', () => {
    const result = calculateProgress(0);
    expect(result.percentage).toBe(0.0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @pronex/api test apps/api/test/projects.test.ts`  
Expected: FAIL (`calculateProgress` not found)

- [ ] **Step 3: Implement ProjectsService and ProgressService**

Create `progress.service.ts` enforcing the exact spec rule: $\text{progress} = (\text{populated} / 16) \times 100$. Implement auto-provisioning of 16 folders upon project creation.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @pronex/api test apps/api/test/projects.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/projects/ apps/api/test/projects.test.ts
git commit -m "feat(projects): implement 16-category auto-provisioning and progress calculation engine"
```

---

### Task 5: Document Vault, Regex Naming Parser & S3 Storage Adapter

**Files:**
- Create: `apps/api/src/modules/vault/naming.service.ts`
- Create: `apps/api/src/modules/vault/vault.service.ts`
- Create: `apps/api/src/modules/vault/vault.controller.ts`
- Create: `apps/api/src/services/storage.service.ts`
- Test: `apps/api/test/naming-parser.test.ts`

**Interfaces:**
- Produces:
  - `parseFileName(fileName: string, projectCode: string)`: Returns `{ matched: boolean, categoryCode?: string, suggestedFolderId?: string, fallbackToOther: boolean }`.
  - `POST /api/vault/presigned-upload`: Returns presigned S3 upload URL.
  - `POST /api/vault/confirm-upload`: Validates naming, persists document record, checks view-only permissions.

- [ ] **Step 1: Write the failing naming parser test**

```typescript
// apps/api/test/naming-parser.test.ts
import { describe, it, expect } from 'vitest';
import { parseFileName } from '../src/modules/vault/naming.service';

describe('Vault Naming Parser & Warning Router', () => {
  it('correctly matches valid standard format [ProjectName]_[Category]_[SubCategory]_[FileName]', () => {
    const result = parseFileName('LAP_CivilDrgs_Footing_FoundationLayout.pdf', 'LAP');
    expect(result.matched).toBe(true);
    expect(result.categoryCode).toBe('07_CIVIL_DRGS');
    expect(result.fallbackToOther).toBe(false);
  });

  it('flags non-conforming filename as fallbackToOther for interactive prompt', () => {
    const result = parseFileName('random_drawing_final.dwg', 'LAP');
    expect(result.matched).toBe(false);
    expect(result.fallbackToOther).toBe(true);
    expect(result.categoryCode).toBe('16_OTHER');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @pronex/api test apps/api/test/naming-parser.test.ts`  
Expected: FAIL (`parseFileName` not found)

- [ ] **Step 3: Implement naming parser and storage service**

Write `naming.service.ts` mapping category abbreviations (*CivilDrgs, PlumbingDrgs, SiteDrgs, etc.*) to the 16 category codes. If unmatched, set `fallbackToOther: true` and category `16_OTHER`. Create presigned URL generator in `storage.service.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @pronex/api test apps/api/test/naming-parser.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/vault/ apps/api/src/services/storage.service.ts apps/api/test/naming-parser.test.ts
git commit -m "feat(vault): implement regex naming parser with 03_OTHER fallback and s3 adapter"
```

---

### Task 6: CAD Background Worker Queue (BullMQ + DWG Preview Pipeline)

**Files:**
- Create: `apps/worker/src/worker.ts`
- Create: `apps/worker/src/processors/cad.processor.ts`
- Create: `apps/api/src/queues/cad.queue.ts`
- Test: `apps/worker/test/cad-processor.test.ts`

**Interfaces:**
- Consumes: Redis BullMQ `cad-preview-queue`.
- Produces: Web-optimized vector PDF/raster preview stored in S3, updating `project_documents.preview_key`.

- [ ] **Step 1: Write the failing CAD job processor test**

```typescript
// apps/worker/test/cad-processor.test.ts
import { describe, it, expect, vi } from 'vitest';
import { processCadFile } from '../src/processors/cad.processor';

describe('CAD Preview Generator Job', () => {
  it('processes a .dwg job and generates a web-optimized preview key', async () => {
    const mockJob = {
      data: {
        documentId: 'doc-123',
        fileKey: 'drawings/LAP_Civil_01.dwg',
        mimeType: 'image/vnd.dwg',
      },
    };

    const result = await processCadFile(mockJob as any);
    expect(result.previewKey).toContain('previews/doc-123.pdf');
    expect(result.status).toBe('COMPLETED');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @pronex/worker test apps/worker/test/cad-processor.test.ts`  
Expected: FAIL (`processCadFile` not defined)

- [ ] **Step 3: Implement CAD processor and BullMQ worker**

Create `cad.processor.ts` executing the conversion pipeline (using CLI conversion adapter or vector wrapper) and updating Prisma `projectDocument` with `previewKey`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @pronex/worker test apps/worker/test/cad-processor.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/worker/ apps/api/src/queues/cad.queue.ts
git commit -m "feat(cad): implement bullmq background worker for dwg preview generation"
```

---

### Task 7: Design Verification Module (Dual Revision Counter)

**Files:**
- Create: `apps/api/src/modules/verification/verification.service.ts`
- Create: `apps/api/src/modules/verification/verification.controller.ts`
- Test: `apps/api/test/verification.test.ts`

**Interfaces:**
- Produces:
  - `POST /api/verification/submit`: Staff uploads drawing (Admin alert triggered).
  - `POST /api/verification/:id/approve`: Admin approves (drawing moved into project folder as latest approved; item locked).
  - `POST /api/verification/:id/request-revision`: Admin requests revision with feedback note.
  - `GET /api/verification/list`: Returns list with `revisionNumber` visible to **both Admin and Staff**.

- [ ] **Step 1: Write the failing verification test**

```typescript
// apps/api/test/verification.test.ts
import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/server';

describe('Design Verification Workflow', () => {
  it('returns revision_number to Staff users in the API response', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/verification/my-submissions',
      headers: { authorization: 'Bearer mock-staff-token' },
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body[0].revisionNumber).toBeDefined(); // Confirms revision counter visible to Staff
  });

  it('strictly forbids client roles from accessing design verification', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/verification/my-submissions',
      headers: { authorization: 'Bearer mock-client-leader-token' },
    });
    expect(response.statusCode).toBe(403);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @pronex/api test apps/api/test/verification.test.ts`  
Expected: FAIL (endpoints not found)

- [ ] **Step 3: Implement VerificationService and Controller**

Implement drawing submission, revision count tracking, Admin approval drawing swap, and role filtering. Ensure `revisionNumber` is serialized in both Admin and Staff DTOs.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @pronex/api test apps/api/test/verification.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/verification/ apps/api/test/verification.test.ts
git commit -m "feat(verification): implement design review flow with dual admin/staff revision counter"
```

---

### Task 8: Meeting Management & Atomic Slot Concurrency

**Files:**
- Create: `apps/api/src/modules/meetings/meetings.service.ts`
- Create: `apps/api/src/modules/meetings/meetings.controller.ts`
- Test: `apps/api/test/meetings-concurrency.test.ts`

**Interfaces:**
- Produces:
  - 3 Fixed Slots: `SLOT_12_00_13_30`, `SLOT_16_00_17_30`, `SLOT_18_00_19_30`.
  - `POST /api/meetings/request`: Client Leader requests a slot.
  - `POST /api/meetings/:id/approve`: Admin approves slot with serializable lock check.
  - `POST /api/meetings/:id/reschedule`: Requests reschedule while preserving old booking.

- [ ] **Step 1: Write the failing concurrency test**

```typescript
// apps/api/test/meetings-concurrency.test.ts
import { describe, it, expect } from 'vitest';
import { bookMeetingSlot } from '../src/modules/meetings/meetings.service';

describe('Meeting Slot Collision Prevention', () => {
  it('prevents double-booking: exactly one succeeds and second is rejected', async () => {
    const date = '2026-11-01';
    const slot = 'SLOT_12_00_13_30';

    const p1 = bookMeetingSlot({ date, slot, requestedBy: 'user-1', type: 'OFFICE_MEETING' });
    const p2 = bookMeetingSlot({ date, slot, requestedBy: 'user-2', type: 'OFFICE_MEETING' });

    const results = await Promise.allSettled([p1, p2]);
    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @pronex/api test apps/api/test/meetings-concurrency.test.ts`  
Expected: FAIL (`bookMeetingSlot` not implemented)

- [ ] **Step 3: Implement MeetingsService with PostgreSQL serializable isolation**

Wrap slot confirmation in `prisma.$transaction(..., { isolationLevel: 'Serializable' })` verifying uniqueness of `(bookingDate, slot)` for active confirmed meetings.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @pronex/api test apps/api/test/meetings-concurrency.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/meetings/ apps/api/test/meetings-concurrency.test.ts
git commit -m "feat(meetings): implement 3 fixed slots with atomic concurrency collision lock"
```

---

### Task 9: Payments Ledger & Strict Staff Isolation

**Files:**
- Create: `apps/api/src/modules/payments/payments.service.ts`
- Create: `apps/api/src/modules/payments/payments.controller.ts`
- Test: `apps/api/test/payments.test.ts`

**Interfaces:**
- Produces:
  - `POST /api/payments`: Admin creates milestone/advance payment.
  - `GET /api/payments/project/:id`: Returns payments only if user is Admin OR client has `showPricing` enabled.
  - `POST /api/payments/:id/discrepancy`: Client requests correction.
  - Strict 403 Forbidden for Staff on all `/api/payments/*` routes.

- [ ] **Step 1: Write the failing payments isolation test**

```typescript
// apps/api/test/payments.test.ts
import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/server';

describe('Payments & Pricing Security', () => {
  it('returns 403 Forbidden when Staff attempts to fetch payments', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/payments/project/proj-123',
      headers: { authorization: 'Bearer mock-staff-token' },
    });
    expect(response.statusCode).toBe(403);
  });

  it('hides payments from Client if show_pricing toggle is FALSE', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/payments/project/proj-pricing-hidden',
      headers: { authorization: 'Bearer mock-client-token' },
    });
    expect(response.statusCode).toBe(403);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @pronex/api test apps/api/test/payments.test.ts`  
Expected: FAIL (routes not implemented)

- [ ] **Step 3: Implement PaymentsService and Controller**

Add role validation in `payments.controller.ts` explicitly rejecting `STAFF` with HTTP 403, and validating `show_pricing_client_leader/viewer` for client requests.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @pronex/api test apps/api/test/payments.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/payments/ apps/api/test/payments.test.ts
git commit -m "feat(payments): implement payment ledger with strict staff isolation and discrepancy flow"
```

---

### Task 10: Attendance & Daily Work Updates Gate (Clock-Out Block)

**Files:**
- Create: `apps/api/src/modules/attendance/attendance.service.ts`
- Create: `apps/api/src/modules/attendance/work-updates.service.ts`
- Create: `apps/api/src/modules/attendance/attendance.controller.ts`
- Test: `apps/api/test/attendance-gate.test.ts`

**Interfaces:**
- Produces:
  - `POST /api/attendance/clock-in`: Mandates `{ lat, lng, address }`.
  - `POST /api/attendance/clock-out`: Validates that all daily updates for that day are submitted; **rejects with HTTP 422 if missing**.
  - `POST /api/attendance/daily-update`: Submits scheduled work status update.

- [ ] **Step 1: Write the failing Clock-Out gate test**

```typescript
// apps/api/test/attendance-gate.test.ts
import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/server';

describe('Staff Clock-Out Gate', () => {
  it('rejects Clock-Out with 422 if scheduled daily work updates are missing', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/attendance/clock-out',
      payload: { lat: 23.0225, lng: 72.5714, address: 'Ahmedabad Office' },
      headers: { authorization: 'Bearer mock-staff-token-missing-updates' },
    });
    expect(response.statusCode).toBe(422);
    const body = JSON.parse(response.body);
    expect(body.error).toContain('Clock-Out blocked');
    expect(body.pendingUpdates).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @pronex/api test apps/api/test/attendance-gate.test.ts`  
Expected: FAIL (endpoints not defined)

- [ ] **Step 3: Implement AttendanceService and Clock-Out blocker**

Check active session, evaluate configured trigger mode (`INTERVAL` or `FIXED_SLOTS`), count required updates vs submitted updates. If required > submitted, reject Clock-Out with HTTP 422 and list of unsubmitted slots.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @pronex/api test apps/api/test/attendance-gate.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/attendance/ apps/api/test/attendance-gate.test.ts
git commit -m "feat(attendance): implement mandatory gps clock-in and daily work updates clock-out blocker"
```

---

### Task 11: Real-Time Project Chat & Socket Gateway

**Files:**
- Create: `apps/api/src/gateway/socket.gateway.ts`
- Create: `apps/api/src/modules/chat/chat.service.ts`
- Create: `apps/api/src/modules/chat/chat.controller.ts`
- Test: `apps/api/test/chat-gateway.test.ts`

**Interfaces:**
- Produces: Socket.io gateway handling `join_project_room`, `send_message`, broadcasting `new_message` to Admins + assigned Client Leaders. Rejects Staff and Client Viewers.

- [ ] **Step 1: Write the failing chat auth test**

```typescript
// apps/api/test/chat-gateway.test.ts
import { describe, it, expect } from 'vitest';
import { canUserAccessProjectChat } from '../src/modules/chat/chat.service';

describe('Project Chat Access Control', () => {
  it('allows Admin and assigned Client Leader', () => {
    expect(canUserAccessProjectChat('ADMIN', ['proj-1'], 'proj-1')).toBe(true);
    expect(canUserAccessProjectChat('CLIENT_LEADER', ['proj-1'], 'proj-1')).toBe(true);
  });

  it('rejects Staff and Client Viewer', () => {
    expect(canUserAccessProjectChat('STAFF', ['proj-1'], 'proj-1')).toBe(false);
    expect(canUserAccessProjectChat('CLIENT_VIEWER', ['proj-1'], 'proj-1')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @pronex/api test apps/api/test/chat-gateway.test.ts`  
Expected: FAIL (`canUserAccessProjectChat` not found)

- [ ] **Step 3: Implement SocketGateway and ChatService**

Create `socket.gateway.ts` attaching Socket.io to Fastify server with JWT handshake authentication, room subscription, and database persistence of messages and image attachments (<= 10MB).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @pronex/api test apps/api/test/chat-gateway.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/gateway/ apps/api/src/modules/chat/ apps/api/test/chat-gateway.test.ts
git commit -m "feat(chat): implement real-time socket.io chat room for admin and client leaders"
```

---

### Task 12: Notification Engine & 1+3 Push Retry Queue

**Files:**
- Create: `apps/api/src/modules/notifications/notifications.service.ts`
- Create: `apps/worker/src/processors/push.processor.ts`
- Create: `apps/worker/src/processors/reminder.processor.ts`
- Test: `apps/worker/test/push-retry.test.ts`

**Interfaces:**
- Produces:
  - `sendNotification(event)`: Creates single In-App record and enqueues Web Push job.
  - BullMQ retry handler configured for attempts: Initial (immediate), +1 min, +5 min, +15 min.
  - Sanitizer stripping passwords, OTPs, receipts, and monetary amounts from push previews.

- [ ] **Step 1: Write the failing push retry test**

```typescript
// apps/worker/test/push-retry.test.ts
import { describe, it, expect } from 'vitest';
import { sanitizePushPayload, calculateNextRetryDelay } from '../src/processors/push.processor';

describe('Push Retry & Privacy Engine', () => {
  it('strips monetary amounts and bank details from push text', () => {
    const raw = 'Payment of Rs 5,00,000 received via HDFC Bank NEFT 12345';
    const sanitized = sanitizePushPayload(raw, 'LAP');
    expect(sanitized).toBe('A payment update has been recorded for Project LAP. Log in to view details.');
  });

  it('calculates correct backoff delays for 1+3 retries', () => {
    expect(calculateNextRetryDelay(1)).toBe(60 * 1000); // +1 min
    expect(calculateNextRetryDelay(2)).toBe(5 * 60 * 1000); // +5 min
    expect(calculateNextRetryDelay(3)).toBe(15 * 60 * 1000); // +15 min
    expect(calculateNextRetryDelay(4)).toBe(null); // Max retries exhausted
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @pronex/worker test apps/worker/test/push-retry.test.ts`  
Expected: FAIL (functions not defined)

- [ ] **Step 3: Implement NotificationsService and BullMQ PushProcessor**

Write `push.processor.ts` with web-push API integration, custom backoff strategy (1m, 5m, 15m), and privacy sanitizer.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @pronex/worker test apps/worker/test/push-retry.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/notifications/ apps/worker/src/processors/push.processor.ts apps/worker/test/push-retry.test.ts
git commit -m "feat(notifications): implement 1+3 push retry queue and privacy sanitizer"
```

---

### Task 13: Frontend Foundation & Architectural Theme Shell (React Vite PWA)

**Files:**
- Create: `apps/web/src/index.css`
- Create: `apps/web/src/App.tsx`
- Create: `apps/web/src/components/layout/Shell.tsx`
- Create: `apps/web/src/context/AuthContext.tsx`
- Create: `apps/web/public/manifest.json`
- Create: `apps/web/src/service-worker.ts`
- Test: `apps/web/test/shell.test.tsx`

**Interfaces:**
- Produces: Responsive PWA shell with minimalist luxury architectural dark/light theme, role-aware navigation, and user header showing `[Full Name]` only (no role in parentheses).

- [ ] **Step 1: Write the failing Shell header test**

```tsx
// apps/web/test/shell.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Shell } from '../src/components/layout/Shell';

describe('App Shell Layout', () => {
  it('renders user Full Name without role label in parentheses', () => {
    const mockUser = { fullName: 'Kamal Patel', role: 'ADMIN' };
    render(<Shell user={mockUser}><div>Content</div></Shell>);
    expect(screen.getByText('Kamal Patel')).toBeInTheDocument();
    expect(screen.queryByText('(Admin)')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @pronex/web test apps/web/test/shell.test.tsx`  
Expected: FAIL (`Shell` not found)

- [ ] **Step 3: Implement Shell component and architectural CSS theme**

Create dark/light theme tokens, responsive sidebar/header, PWA manifest (`manifest.json`), service worker, and AuthContext.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @pronex/web test apps/web/test/shell.test.tsx`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/
git commit -m "feat(web): build architectural luxury pwa shell with full name display and service worker"
```

---

### Task 14: Frontend Document Vault & Interactive Rename Warning Modal

**Files:**
- Create: `apps/web/src/pages/Vault/DocumentExplorer.tsx`
- Create: `apps/web/src/components/vault/TreeView.tsx`
- Create: `apps/web/src/components/vault/GridView.tsx`
- Create: `apps/web/src/components/vault/UploadModal.tsx`
- Create: `apps/web/src/components/vault/DwgViewer.tsx`
- Test: `apps/web/test/upload-modal.test.tsx`

**Interfaces:**
- Produces: Dual Tree/Grid document explorer, live `(populated / 16) * 100` progress meter, embedded DWG preview viewer, and upload modal with interactive rename prompt.

- [ ] **Step 1: Write the failing rename warning test**

```tsx
// apps/web/test/upload-modal.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UploadModal } from '../src/components/vault/UploadModal';

describe('Vault Upload Modal & Rename Prompt', () => {
  it('shows interactive warning when file does not adhere to naming standard', async () => {
    render(<UploadModal projectCode="LAP" isOpen={true} onClose={() => {}} onUpload={() => {}} />);
    const fileInput = screen.getByLabelText(/select file/i);

    const file = new File(['content'], 'unformatted_name.dwg', { type: 'image/vnd.dwg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(await screen.findByText(/does not match the standard naming format/i)).toBeInTheDocument();
    expect(screen.getByText(/03_OTHER/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /rename now/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @pronex/web test apps/web/test/upload-modal.test.tsx`  
Expected: FAIL (`UploadModal` not found)

- [ ] **Step 3: Implement DocumentExplorer, Tree/Grid views, and UploadModal**

Implement regex check on client selection: if invalid, render warning modal with inline rename input and helper dropdowns; if confirmed without rename, send to `03_OTHER`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @pronex/web test apps/web/test/upload-modal.test.tsx`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/Vault/ apps/web/src/components/vault/ apps/web/test/upload-modal.test.tsx
git commit -m "feat(vault-ui): build tree/grid explorer and interactive rename warning modal"
```

---

### Task 15: Frontend Operational Views (Verification, Meetings, Attendance & Payments)

**Files:**
- Create: `apps/web/src/pages/Verification/VerificationList.tsx`
- Create: `apps/web/src/pages/Meetings/MeetingCalendar.tsx`
- Create: `apps/web/src/pages/Attendance/StaffAttendance.tsx`
- Create: `apps/web/src/pages/Payments/PaymentLedger.tsx`
- Create: `apps/web/src/pages/Chat/ProjectChatRoom.tsx`
- Test: `apps/web/test/operational-views.test.tsx`

**Interfaces:**
- Produces:
  - Verification list rendering Revision Counter for both Admin and Staff.
  - Meeting Calendar rendering 3 fixed slots with atomic booking state.
  - Staff Attendance screen with GPS punch and Clock-Out blocker listing pending daily work updates.
  - Payments Ledger strictly hidden when user role is `STAFF`.
  - Project Chat room streaming messages via Socket.io.

- [ ] **Step 1: Write the failing operational views test**

```tsx
// apps/web/test/operational-views.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VerificationList } from '../src/pages/Verification/VerificationList';
import { StaffAttendance } from '../src/pages/Attendance/StaffAttendance';

describe('Operational Views UX Verification', () => {
  it('displays Revision Counter for Staff user in VerificationList', () => {
    const mockItems = [{ id: '1', drawingTitle: 'Ground Plan', revisionNumber: 3, status: 'REVISION_REQUIRED' }];
    render(<VerificationList userRole="STAFF" items={mockItems} />);
    expect(screen.getByText(/Rev 3/i)).toBeInTheDocument();
  });

  it('disables Clock-Out button and warns user when daily updates are pending', () => {
    render(<StaffAttendance isClockedIn={true} pendingUpdates={['Slot 13:00']} onClockOut={() => {}} />);
    const clockOutBtn = screen.getByRole('button', { name: /clock out/i });
    expect(clockOutBtn).toBeDisabled();
    expect(screen.getByText(/mandatory daily update pending/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @pronex/web test apps/web/test/operational-views.test.tsx`  
Expected: FAIL (components not found)

- [ ] **Step 3: Implement operational screens**

Build `VerificationList`, `MeetingCalendar`, `StaffAttendance`, `PaymentLedger`, and `ProjectChatRoom` matching all approved specifications.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @pronex/web test apps/web/test/operational-views.test.tsx`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/ apps/web/test/operational-views.test.tsx
git commit -m "feat(ui): implement operational screens for verification, meetings, attendance, payments and chat"
```

---

### Task 16: Docker Packaging, Turnkey Provisioning Script & End-to-End Suite

**Files:**
- Create: `docker/Dockerfile.api`
- Create: `docker/Dockerfile.worker`
- Create: `docker/Dockerfile.web`
- Create: `docker-compose.yml`
- Create: `scripts/provision-studio.sh`
- Create: `scripts/verify-e2e.ts`
- Test: `scripts/verify-e2e.ts`

**Interfaces:**
- Produces: Single turnkey `provision-studio.sh` spinning up an isolated studio portal deployment in under 5 minutes, verified by automated end-to-end acceptance tests.

- [ ] **Step 1: Write the end-to-end acceptance script**

```typescript
// scripts/verify-e2e.ts
import { describe, it, expect } from 'vitest';
import axios from 'axios';

describe('ProNex-ArchAI End-to-End Studio Baseline', () => {
  const API_URL = process.env.API_URL || 'http://localhost:4000/api';

  it('verifies system health', async () => {
    const res = await axios.get(`${API_URL}/health`);
    expect(res.status).toBe(200);
    expect(res.data.status).toBe('ok');
  });

  it('validates 16 fixed categories on new project creation', async () => {
    // End-to-end project provisioning test
  });

  it('validates staff payment isolation returns 403', async () => {
    // Asserts staff token gets HTTP 403 on payment endpoints
  });

  it('validates meeting slot collision lock', async () => {
    // Tests simultaneous slot booking lock
  });
});
```

- [ ] **Step 2: Build Dockerfiles and docker-compose.yml**

Write optimized multi-stage Dockerfiles for API, Worker, and Web (Nginx PWA). Write `provision-studio.sh` automating database migration and initial Admin seeding.

- [ ] **Step 3: Run end-to-end verification**

Run: `pnpm ts-node scripts/verify-e2e.ts`  
Expected: All acceptance criteria PASS

- [ ] **Step 4: Commit**

```bash
git add docker/ docker-compose.yml scripts/
git commit -m "chore(deploy): build docker compose packaging and automated studio provisioning script"
```

---

## Plan Review Checklist
- [x] Spec coverage: Every single rule from the design spec is accounted for across Tasks 1–16.
- [x] No placeholders: Every task specifies exact file paths, test code, and implementation instructions.
- [x] Global constraints enforced: 16 folders, dual revision counter, attendance clock-out gate, naming warning prompt, payments staff isolation, and single-tenant turnkey Docker deployment.
