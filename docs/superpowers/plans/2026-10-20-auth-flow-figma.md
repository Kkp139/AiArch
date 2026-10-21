# Figma High-Fidelity Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the full-stack role-based authentication system matching Figma Page `84:2466` (Admin direct login vs. Staff/Client 2-Step WhatsApp OTP flow) with pixel-level visual fidelity on Desktop and Mobile.

**Architecture:** A Fastify backend endpoint suite handling bcrypt validation, temporary OTP session tokens, and JWT issuance; a React 18 + Vite frontend with a dynamic step machine (`SIGN_IN`, `CONFIRM_DETAILS`, `VERIFY_OTP`), luxurious 2-column editorial courtyard presentation on desktop, and a sleek bottom sheet on mobile.

**Tech Stack:** React 18, TypeScript, Vite, Fastify, Prisma ORM, bcryptjs, Lucide-React.

**Spec:** [`docs/superpowers/specs/2026-10-20-auth-flow-figma-design.md`](file:///c:/Kamal%20Learning/A&B_Desgin/docs/superpowers/specs/2026-10-20-auth-flow-figma-design.md)

## Global Constraints
- Typography: Inter with exact Figma scale (44px Bold headings, 16px Regular body, 14px Medium labels).
- Color Tokens: Primary Bronze `#BF935A`, Dark Text `#0C0C0D`, Body Text `#4A4A4C`, Border `#D2D2D7`.
- Admin Flow: Username + Password directly to Dashboard (No OTP).
- Staff & Client Flow: Username + Password -> Confirm Details -> WhatsApp 6-digit OTP (123456 in dev mode) -> Dashboard.
- Zero external dependencies introduced beyond already installed packages.

---

### Task 1: Backend Fastify Authentication Module

**Files:**
- Modify: `apps/api/src/modules/auth/auth.controller.ts`
- Modify: `apps/api/src/modules/auth/auth.service.ts`
- Create: `apps/api/test/auth.test.ts`

**Interfaces:**
- Produces:
  - `POST /api/auth/login`: `{ username, password }` -> returns `{ requireOtp: false, token, user }` (Admin) OR `{ requireOtp: true, tempToken, user }` (Staff/Client).
  - `POST /api/auth/send-otp`: `{ tempToken, fullName, mobile }` -> returns `{ success: true, debugOtp: "123456" }`.
  - `POST /api/auth/verify-otp`: `{ tempToken, otp }` -> returns `{ success: true, token, user }`.
  - `GET /api/auth/me`: returns authenticated profile.
  - `POST /api/auth/logout`: returns `{ success: true }`.

- [ ] **Step 1: Write backend tests in `apps/api/test/auth.test.ts`**
- [ ] **Step 2: Run tests to verify failure**
- [ ] **Step 3: Update `auth.service.ts` and `auth.controller.ts` with complete business logic & test seed credentials**
- [ ] **Step 4: Run tests and ensure all pass**
- [ ] **Step 5: Commit backend changes**

---

### Task 2: Frontend Design System & Auth Components

**Files:**
- Create: `apps/web/src/pages/Auth/auth.css`
- Create: `apps/web/src/pages/Auth/EditorialPanel.tsx`
- Create: `apps/web/src/pages/Auth/SignInForm.tsx`
- Create: `apps/web/src/pages/Auth/ConfirmDetailsForm.tsx`
- Create: `apps/web/src/pages/Auth/OtpVerificationForm.tsx`
- Create: `apps/web/src/pages/Auth/LoginPage.tsx`

**Interfaces:**
- Produces:
  - `LoginPage`: Main full-screen responsive container coordinating `EditorialPanel` and step sub-forms.
  - `EditorialPanel`: Renders `editorial_courtyard.png` with typography overlays.
  - `SignInForm`: Username, password with eye toggle, forgot password, sign in button.
  - `ConfirmDetailsForm`: Full name, phone number, Send OTP button.
  - `OtpVerificationForm`: 6 auto-advancing digit inputs, paste support, 30s timer, verify button.

- [ ] **Step 1: Create `auth.css` with exact Figma tokens and layout rules (desktop 2-col, mobile bottom sheet)**
- [ ] **Step 2: Implement `EditorialPanel.tsx` with high-res asset and editorial text**
- [ ] **Step 3: Implement `SignInForm.tsx` with validation and loading states**
- [ ] **Step 4: Implement `ConfirmDetailsForm.tsx` with pre-filled inputs and navigation**
- [ ] **Step 5: Implement `OtpVerificationForm.tsx` with 6 input refs, auto-focus, paste, and timer**
- [ ] **Step 6: Assemble `LoginPage.tsx` managing the dynamic step transitions**
- [ ] **Step 7: Commit frontend auth components**

---

### Task 3: AuthContext & App Navigation Integration

**Files:**
- Modify: `apps/web/src/context/AuthContext.tsx`
- Modify: `apps/web/src/App.tsx`

**Interfaces:**
- Produces:
  - `AuthContext`: Real session state with `login(user, token)`, `logout()`, `verifyOtp(tempToken, otp)`, and localStorage persistence.
  - `App.tsx`: Shows `LoginPage` when unauthenticated; shows portal shell with topbar user badge & logout button when logged in.

- [ ] **Step 1: Update `AuthContext.tsx` to interface with the backend API endpoints**
- [ ] **Step 2: Update `App.tsx` to render `LoginPage` when `user === null`**
- [ ] **Step 3: Add top-bar User Profile & Logout action to `App.tsx` Shell**
- [ ] **Step 4: Commit integration changes**

---

### Task 4: End-to-End Verification & Local Dev Server Execution

**Files:**
- Test scripts & browser execution

- [ ] **Step 1: Start dev servers (`npm run dev:api` and `npm run dev:web`)**
- [ ] **Step 2: Verify Admin login flow in browser**
- [ ] **Step 3: Verify Staff 2-Step OTP login flow in browser**
- [ ] **Step 4: Verify Mobile responsive layout**
- [ ] **Step 5: Capture browser verification screenshots and report results**
