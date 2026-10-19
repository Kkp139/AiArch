# ProNex-ArchAI — Studio Collaboration Portal Design Specification

**Document Date:** 19 October 2026  
**Status:** Approved Architecture Baseline  
**Scope:** Responsive Web Application / Installable PWA for Desktop, Tablet, and Mobile  
**Commercial Model:** Single-Tenant Dedicated Deployment per Architecture Firm (Docker containerized, independent database, ready to package and sell to future architecture studios)  

---

## 1. Executive Summary & Product Vision

**ProNex-ArchAI** is an architectural and interior-design studio management and collaboration platform. It bridges studio administration, staff architects/engineers, and client stakeholders through a unified, high-security digital environment.

### Key Objectives
1. **Dedicated Firm Sovereignty:** Each architecture studio receives a fully isolated single-tenant deployment with dedicated PostgreSQL database and private S3/R2 cloud storage, ensuring complete data privacy and zero cross-firm data leaks.
2. **Turn-Key Commercial Rollout:** Structured as a containerized modular monolith so that onboarding a new architecture firm requires only spinning up a dedicated `docker-compose.yml` instance with firm-specific environment variables.
3. **Role-Driven Simplicity:** Four clearly delineated roles (Admin, Staff, Client Leader, Client Viewer) with strict server-side authorization enforcement.
4. **CAD & Document Governance:** Fixed 16-category project structure, automatic regex naming parser with interactive rename prompt, hybrid DWG-to-PDF/vector preview pipeline, and an automated progress engine `(populated_categories / 16) * 100`.
5. **Operational Accountability:** GPS-verified staff attendance, mandatory daily work updates strictly gating end-of-day clock-out, design verification workflow with dual Admin/Staff revision counters, atomic collision-free meeting scheduling, and an auditable payments ledger hidden from staff.

---

## 2. Technology Stack & Infrastructure

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Devices                         │
│  Desktop, Tablet, Mobile (Installable PWA - React + Vite)   │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / WSS
┌──────────────────────────────▼──────────────────────────────┐
│                  Nginx Reverse Proxy / SSL                  │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│          Backend API Server (Node.js + Fastify / TS)        │
│  - REST API & Server-side Authorization                     │
│  - Socket.io Real-time Gateway (Chat, Alerts, Slot locks)   │
│  - Prisma ORM Data Access Layer                             │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
┌──────────────▼─────────────┐   ┌─────────────▼──────────────┐
│  PostgreSQL 16 (Database)  │   │   Redis 7 (Cache & BullMQ) │
└────────────────────────────┘   └─────────────┬──────────────┘
                                               │
                                 ┌─────────────▼──────────────┐
                                 │ Background Worker Service  │
                                 │ - DWG -> PDF/Vector Preview│
                                 │ - Web Push 1+3 Retries     │
                                 │ - Work Update Reminders    │
                                 └─────────────┬──────────────┘
                                               │
                                 ┌─────────────▼──────────────┐
                                 │ Cloud Storage (S3 / R2)    │
                                 └────────────────────────────┘
```

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend Web App** | React 18+, TypeScript, Vite, Vanilla/Tailwind CSS | Responsive PWA, dark/light architectural luxury UI, offline cache, GPS & Camera APIs. |
| **Backend API** | Node.js (v20+), TypeScript, Fastify | High-throughput, low-overhead REST API with strict schema validation. |
| **Real-time Gateway** | Socket.io | Instant push notifications, real-time chat, and live meeting slot availability. |
| **Database** | PostgreSQL 16 with Prisma ORM | ACID-compliant relational data modeling with transactional locks. |
| **Queue & Cache** | Redis 7 + BullMQ | Asynchronous job queues for CAD conversion, push retry delays, and reminders. |
| **Object Storage** | Cloudflare R2 / AWS S3 | Encrypted original CAD/PDF storage with signed, time-limited URLs. |
| **CAD Pipeline** | LibreCAD / ODA File Converter / ezdxf CLI in worker | Converts `.dwg`/`.dxf` files into high-resolution, web-viewable PDF/vector assets. |
| **Deployment** | Docker & Docker Compose | Turn-key deployment per architecture studio on any Linux VPS or cloud instance. |

---

## 3. Roles, Permissions & Authentication

### 3.1 Role Capabilities & Access Matrix

| Feature / Module | Admin (Max 4) | Staff | Client Leader | Client Viewer |
|---|:---:|:---:|:---:|:---:|
| **Project Access** | All (Active + Inactive) | All Active (Admin can toggle off); Inactive read-only | Assigned Active Only | Assigned Active Only |
| **Document Vault** | Full View & Download | Full Upload & View; Download per project | View / Download per Folder rule | View / Download per Folder rule |
| **Design Verification** | Review, Approve, Revise | Submit drawings & view feedback | ❌ No Access | ❌ No Access |
| **Revision Counter** | ✅ Visible (e.g., Rev 3) | ✅ Visible (e.g., Rev 3) | ❌ No Access | ❌ No Access |
| **Meetings** | Manage, Create, Approve | ❌ No Access | Request, reschedule, view own | ❌ No Access |
| **Payments & Fees** | Full Management | ❌ Strictly Hidden | View only if project toggle ON | View only if project toggle ON |
| **Payment Discrepancy**| Resolve & Correct | ❌ No Access | Submit correction request | Submit correction request |
| **GPS Clock In / Out** | Review all staff records | Punch with mandatory GPS | ❌ No Access | ❌ No Access |
| **Daily Work Updates** | Review updates | Submit required updates | ❌ No Access | ❌ No Access |
| **Clock-Out Gate** | N/A | Strictly blocked if updates pending | ❌ No Access | ❌ No Access |
| **Assigned Targets** | Assign & Approve | Work & Submit completion | ❌ No Access | ❌ No Access |
| **Project Chat** | All project rooms | ❌ No Access | Assigned project room | ❌ No Access |
| **Policies & Notices** | Create & Manage | Read targeted items | Read targeted items | Read targeted items |
| **Admin Reminders** | Shared Admin tool | ❌ No Access | ❌ No Access | ❌ No Access |

### 3.2 Authentication & User Security
1. **Four Equal Admin Accounts:** V1 supports up to 4 Admin accounts with equal rights. The system prevents deactivating the last active Admin.
2. **Client Leader Auth:** Login requires Full Name, Registered WhatsApp Mobile, Username, Password, and WhatsApp OTP.
3. **Client Viewer Auth:** Shared project username/password + personal mobile OTP. One mobile number cannot register multiple viewer identities.
4. **Zero-Plaintext Passwords:** Permanent passwords are never sent via chat, email, or UI. When a user is provisioned, a single-use, time-limited setup link is generated for the user to set their own password.
5. **Approval Gates:** Independent toggles in settings (`client_leader_approval_required` and `client_viewer_approval_required`). If ON, the user awaits Admin sign-off after OTP verification.
6. **Session Revocation:** Deactivation instantly revokes active JWT sessions across all devices.
7. **Display Convention:** User interfaces show `[Full Name]` only (e.g. "Kamal Patel"), never displaying role labels in parentheses.

---

## 4. Document Vault, Fixed 16 Categories & CAD Strategy

### 4.1 Fixed 16-Category Structure
Every project is automatically seeded with 16 immutable categories across two phases, plus a general folder:

```
├── Concept Design (Phase 1)
│   ├── 01 Site Drgs (Master site & topographic survey)
│   ├── 02 Zoning / Planning (Spatial program & FSI allocation)
│   ├── 03 Space / Object Design (Interior enclosure & object studies)
│   ├── 04 Complete Set of Drgs (Full architectural schematic package)
│   ├── 05 Material Selection (Stone, wood & texture moodboards)
│   └── 06 3D Images (Photorealistic CGI renders)
├── Construction Design (Phase 2)
│   ├── 07 Civil Drgs (RCC footing, raft & column layouts)
│   ├── 08 Plumbing Drgs (Water supply & drainage schematics)
│   ├── 09 Fire Drgs (Hydrant, sprinkler & life safety)
│   ├── 10 HVAC Drgs (Chilled water & ducting routes)
│   ├── 11 Flooring Drgs (Marble cutting & tile laying)
│   ├── 12 Ceiling Drgs (Reflected ceiling & lighting drops)
│   ├── 13 Electrical Drgs (Power SLD, DB schedules, conduits)
│   ├── 14 Wall Elevation (Internal elevations & facade details)
│   └── 15 Element Drgs (Stair railings, canopies & joinery)
└── 03_OTHER (Catch-all for miscellaneous / unclassified files)
```

### 4.2 Automated Progress Calculation Engine
- **Formula:** $\text{Completion \%} = \left(\frac{\text{Count of Folders with } \ge 1 \text{ Document}}{16}\right) \times 100$
- Approval status does not affect progress; any file in a counted folder makes that folder 100%. Phase headings are organizational containers and do not count.

### 4.3 Regex Naming Parser & Interactive Rename Warning
- **Standard Format:** `[ProjectName]_[Category]_[SubCategory]_[FileName]` (e.g., `LAP_CivilDrgs_Footing_FoundationLayout.pdf`).
- **Interactive Upload Warning:**
  1. The client-side upload dialog checks the file name against the standard regex.
  2. If it matches, the target folder is detected and assigned automatically.
  3. If it does **not** match:
     - The UI presents an interactive warning modal:  
       > *"The file name does not match the standard naming format: `[ProjectName]_[Category]_[SubCategory]_[FileName]`. Would you like to rename it now? If you proceed without renaming, this file will automatically be stored in `03_OTHER`."*
     - The user is provided an inline rename input with helper dropdowns.
     - If the user renames and it matches, it routes to that category.
     - If the user chooses "Upload anyway" or it still fails to match, the backend places it into `03_OTHER`.

### 4.4 Hybrid DWG Preview Pipeline
- When a `.dwg`, `.dxf`, or `.dgn` file is uploaded, the background worker extracts a web-optimized PDF/vector raster representation.
- The browser embedded drawing viewer renders the preview with smooth pan, zoom, and layer inspection.
- The `"Download Original .DWG"` button is shown **only** if the user possesses `VIEW_AND_DOWNLOAD` permissions for that folder and the project master download switch is active.
- For `VIEW_ONLY` permissions, original file download URLs are never returned by the backend.

---

## 5. Functional Modules Specification

### 5.1 Design Verification Workflow
1. **Submission:** Staff uploads drawing with intended category -> triggers alert to all 4 Admins.
2. **Review Options:**
   - **Approve:** File moves/copies to the project folder as the "Current Approved Drawing". If a drawing previously existed for that item, the new one replaces it. In V1, only the latest approved drawing is shown in the project folder. The verification record is locked as read-only.
   - **Send for Revision:** Admin inputs feedback note. Status changes to `Revision Required`. Staff updates and resubmits.
3. **Revision Counter Rule:** **Both Admin and Staff can see the Revision Counter** (e.g., *Rev 1, Rev 2, Rev 3*). Clients have zero access to this module.

### 5.2 Meeting Concurrency & Rescheduling
1. **Types:** `Office Meeting` and `Site Visit`.
2. **Fixed Time Slots:**
   - Slot 1: `12:00 – 13:30`
   - Slot 2: `16:00 – 17:30`
   - Slot 3: `18:00 – 19:30`
3. **Atomic Slot Lock:** The backend executes a PostgreSQL serializable transaction to verify that no overlapping booking exists globally for that date and slot.
4. **Rescheduling Protection:** When a client submits a reschedule request for an already approved meeting, the old confirmed meeting remains active and valid until the Admin explicitly approves the replacement slot.

### 5.3 Payments Ledger & Staff Isolation
1. **Ledger Records:** Admin records Milestone/Advance Amount, Mode (*Cheque, UPI, NEFT/RTGS, Cash*), Reference Number, Bank Name, and Receipt file.
2. **Staff Isolation:** Staff members are blocked from all payment endpoints, agreed fee metadata, receipts, and menu items.
3. **Client Visibility:** Controlled by per-project toggles `show_pricing_client_leader` and `show_pricing_client_viewer`.
4. **Correction Requests:** Clients can submit a discrepancy note. Admin performs the correction with before/after audit tracking.

### 5.4 Staff Attendance & Daily Work Updates Gate
1. **Mandatory GPS Punch:** Clock-In and Clock-Out require device GPS coordinates (latitude, longitude, and reverse-geocoded address). If location is denied, punching is blocked with a clear instruction.
2. **Daily Work Updates Schedule:** Configurable as `INTERVAL` (e.g. every 3 hours) or `FIXED_SLOTS` (e.g. 13:00, 17:30). Reminders fire 10 minutes prior.
3. **Strict Clock-Out Block:** Staff **cannot** Clock-Out if any required daily work update for that day is unsubmitted. The UI highlights outstanding updates and disables the Clock-Out action until resolved.

### 5.5 Real-Time Project Chat & Targets
1. **Project Chat:** Real-time room per project (Socket.io) connecting all Admins and assigned Client Leaders. Supports text and image attachments up to 10 MB. Messages cannot be deleted without audit tracking.
2. **Targets:** Admin creates tasks with target completion dates. Assigned Staff submit work -> Admin reviews and approves completion. Overdue indicators trigger automatically once the due date passes.

---

## 6. Real-Time Socket & Notification Engine

### 6.1 Channels
- **In-App Notification Tray:** Dedicated inbox with unread badges and direct links.
- **Web Push Notifications:** PWA Service Worker push delivery via Web Push API / FCM.

### 6.2 1+3 Push Retry Engine (BullMQ Queue)
When an event occurs:
1. Deduplicated In-App notification record is created immediately in PostgreSQL.
2. Push payload dispatched to registered device endpoints.
3. If delivery fails temporarily, BullMQ retries at:
   - **Initial Attempt:** Immediate
   - **Retry 1:** ~+1 minute
   - **Retry 2:** ~+5 minutes
   - **Retry 3:** ~+15 minutes
4. If all retries fail, delivery failure is logged. The In-App notification is **never duplicated**.

### 6.3 Push Privacy Rule
Push previews must **never** contain passwords, OTPs, bank details, receipt attachments, or sensitive monetary amounts. Neutral copy is used:
> *"A payment update has been recorded for Project [Project Name]. Please log in to view."*

### 6.4 Recipient Rules
- All Admin alerts dispatch to all 4 active Admins.
- Project alerts dispatch strictly to active users assigned to that project.
- Staff never receives payment notifications; Client Viewers never receive chat or meeting alerts.
- Inactive projects dispatch zero notifications to clients.

---

## 7. PostgreSQL Relational Schema Blueprint

```sql
-- User & Authentication
CREATE TYPE user_role AS ENUM ('ADMIN', 'STAFF', 'CLIENT_LEADER', 'CLIENT_VIEWER');
CREATE TYPE user_status AS ENUM ('ACTIVE', 'DEACTIVATED');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(64) UNIQUE NOT NULL,
    full_name VARCHAR(128) NOT NULL,
    mobile VARCHAR(32),
    email VARCHAR(128),
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    status user_status DEFAULT 'ACTIVE',
    setup_token VARCHAR(128),
    setup_token_expires_at TIMESTAMPTZ,
    approval_pending BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects
CREATE TYPE project_status AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE download_permission AS ENUM ('VIEW_ONLY', 'VIEW_AND_DOWNLOAD');

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_code VARCHAR(32) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(128) NOT NULL,
    site_location TEXT NOT NULL,
    status project_status DEFAULT 'ACTIVE',
    total_agreed_fee NUMERIC(14,2) DEFAULT 0.00,
    advance_payment_received NUMERIC(14,2) DEFAULT 0.00,
    allow_client_downloads download_permission DEFAULT 'VIEW_AND_DOWNLOAD',
    show_pricing_client_leader BOOLEAN DEFAULT FALSE,
    show_pricing_client_viewer BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16 Fixed Categories per Project
CREATE TABLE project_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    category_code VARCHAR(64) NOT NULL,
    folder_name VARCHAR(128) NOT NULL,
    phase_group VARCHAR(64) NOT NULL,
    display_order INT NOT NULL,
    is_counted BOOLEAN DEFAULT TRUE,
    UNIQUE(project_id, category_code)
);

-- Project Documents
CREATE TABLE project_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES project_folders(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    original_key VARCHAR(512) NOT NULL,
    preview_key VARCHAR(512),
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(64) NOT NULL,
    is_dwg BOOLEAN DEFAULT FALSE,
    is_approved_drawing BOOLEAN DEFAULT FALSE,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Design Verification
CREATE TYPE verification_status AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REVISION_REQUIRED');

CREATE TABLE design_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES project_folders(id) ON DELETE CASCADE,
    drawing_title VARCHAR(255) NOT NULL,
    file_key VARCHAR(512) NOT NULL,
    preview_key VARCHAR(512),
    submitted_by UUID REFERENCES users(id),
    revision_number INT DEFAULT 1,
    status verification_status DEFAULT 'PENDING_REVIEW',
    feedback_note TEXT,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meetings
CREATE TYPE meeting_type AS ENUM ('OFFICE_MEETING', 'SITE_VISIT');
CREATE TYPE meeting_status AS ENUM ('REQUESTED', 'CONFIRMED', 'REJECTED', 'RESCHEDULE_PENDING', 'CANCELLED');
CREATE TYPE time_slot AS ENUM ('SLOT_12_00_13_30', 'SLOT_16_00_17_30', 'SLOT_18_00_19_30');

CREATE TABLE meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_date DATE NOT NULL,
    slot time_slot NOT NULL,
    type meeting_type NOT NULL,
    status meeting_status DEFAULT 'REQUESTED',
    notes TEXT,
    requested_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    replaces_meeting_id UUID REFERENCES meetings(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_confirmed_slot UNIQUE (booking_date, slot)
);

-- Payments Ledger
CREATE TYPE payment_mode AS ENUM ('CHEQUE', 'UPI', 'NEFT_RTGS', 'CASH');
CREATE TYPE payment_status AS ENUM ('PENDING_CLEARANCE', 'CONFIRMED', 'REVISION_REQUESTED');

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    amount NUMERIC(14,2) NOT NULL,
    payment_mode payment_mode NOT NULL,
    reference_number VARCHAR(128),
    bank_name VARCHAR(128),
    receipt_key VARCHAR(512),
    status payment_status DEFAULT 'PENDING_CLEARANCE',
    recorded_by UUID REFERENCES users(id),
    discrepancy_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Staff Attendance & Daily Updates
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    clock_in_at TIMESTAMPTZ NOT NULL,
    clock_in_lat NUMERIC(10,7) NOT NULL,
    clock_in_lng NUMERIC(10,7) NOT NULL,
    clock_in_address TEXT,
    clock_out_at TIMESTAMPTZ,
    clock_out_lat NUMERIC(10,7),
    clock_out_lng NUMERIC(10,7),
    clock_out_address TEXT,
    is_regularized BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE daily_work_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    attendance_id UUID REFERENCES attendance(id) ON DELETE CASCADE,
    work_summary TEXT NOT NULL,
    scheduled_slot VARCHAR(32) NOT NULL,
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Chat
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message_text TEXT,
    attachment_key VARCHAR(512),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    category VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    deep_link VARCHAR(255),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Ledger
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_name VARCHAR(128) NOT NULL,
    actor_role user_role NOT NULL,
    action VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id UUID NOT NULL,
    old_data JSONB,
    new_data JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 8. Deployment, Packaging & Multi-Studio Rollout

### 8.1 Docker Compose Deployment Structure
Each studio instance runs as an independent compose stack:

```yaml
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_DB: pronex_archai
      POSTGRES_USER: pronex_admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    restart: always

  api:
    build:
      context: .
      dockerfile: docker/Dockerfile.api
    restart: always
    environment:
      DATABASE_URL: postgres://pronex_admin:${DB_PASSWORD}@db:5432/pronex_archai
      REDIS_URL: redis://redis:6379
      S3_BUCKET: ${S3_BUCKET}
      S3_ACCESS_KEY: ${S3_ACCESS_KEY}
      S3_SECRET_KEY: ${S3_SECRET_KEY}
      JWT_SECRET: ${JWT_SECRET}
    ports:
      - "4000:4000"
    depends_on:
      - db
      - redis

  worker:
    build:
      context: .
      dockerfile: docker/Dockerfile.worker
    restart: always
    environment:
      DATABASE_URL: postgres://pronex_admin:${DB_PASSWORD}@db:5432/pronex_archai
      REDIS_URL: redis://redis:6379
      S3_BUCKET: ${S3_BUCKET}
      S3_ACCESS_KEY: ${S3_ACCESS_KEY}
      S3_SECRET_KEY: ${S3_SECRET_KEY}
    depends_on:
      - db
      - redis

  web:
    build:
      context: .
      dockerfile: docker/Dockerfile.web
    restart: always
    ports:
      - "3000:80"
    depends_on:
      - api

volumes:
  pgdata:
```

### 8.2 Client Onboarding Script (`scripts/provision-studio.sh`)
To deploy for a new architecture client in the future:
1. Clone the deployment repository.
2. Generate isolated credentials and cloud storage bucket prefix.
3. Run `docker compose up -d`.
4. Run initial database migration (`npx prisma migrate deploy`).
5. Seed initial Admin account with time-limited password setup link.
6. The new architecture studio is live in under 5 minutes.

---

## 9. Verification & Quality Acceptance Criteria

1. **RBAC Isolation:**
   - Attempting to query payment records with a `STAFF` token returns HTTP 403 Forbidden.
   - Attempting to access project chat with a `CLIENT_VIEWER` or `STAFF` token returns HTTP 403.
2. **16-Category Progress Engine:**
   - Populating 12 out of 16 folders immediately calculates to 75.0% completion.
   - Adding an unapproved file still counts that category towards progress.
3. **Upload Naming & Warning:**
   - Uploading `my_drawing.dwg` triggers the rename modal with an explanation. Choosing "upload anyway" safely stores it in `03_OTHER`.
   - Uploading `LAP_CivilDrgs_Footing_Rev1.dwg` automatically routes to `07 Civil Drgs`.
4. **Attendance Hard Gate:**
   - Attempting to submit Clock-Out while scheduled daily work updates are missing is rejected by the API with HTTP 422 Unprocessable Entity and an error listing the missing slots.
5. **Meeting Lock:**
   - Attempting concurrent booking of the same date and slot in two separate browser sessions allows exactly one to succeed and gracefully rejects the second with a slot conflict message.
6. **Push Retry Resilience:**
   - Disconnecting a mock push endpoint verifies retries occur at +1m, +5m, and +15m while keeping exactly one in-app notification record.
