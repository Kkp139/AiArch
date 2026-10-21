# ProNex-ArchAI — Figma High-Fidelity Authentication System Specification

**Document Date:** 20 October 2026  
**Status:** Approved Design Specification  
**Design Reference:** Figma Page `84:2466` (🆕Latest UI Web) — Frames `Desktop - 10` (`234:11531`), `Desktop - 11` (`234:11986`), `Desktop - 12` (`234:12038`), `Desktop - 13` (`234:12124`), and Mobile Companion Frames (`182:11982`, `184:12088`, `184:12139`, `184:12222`).  
**Implementation Scope:** Full-Stack (React 18 + Vite Frontend, Fastify + Prisma + bcrypt Backend, Session Token Management, WhatsApp OTP Flow).

---

## 1. Executive Summary & User Experience

This specification details the end-to-end implementation of the ProNex-ArchAI studio login and authentication system based on the exact visual standards established in Figma. The authentication flow adapts dynamically to the authenticated identity's role:

1. **Admin Sign In (`Desktop - 10`):** Single-step username/password authentication for studio administrators. Successfully verified credentials immediately grant an authenticated JWT session and route to the Admin Portal.
2. **Staff & Client Sign In (`Desktop - 11` -> `Desktop - 12` -> `Desktop - 13`):** Multi-step verification flow for Staff Architects, Client Leaders, and Client Viewers:
   - **Step 1 (Sign In):** Username and password entry.
   - **Step 2 (Confirm Your Details):** Confirmation of registered Full Name and WhatsApp phone number.
   - **Step 3 (Verify OTP):** Cryptographically secure 6-digit WhatsApp OTP verification (with fixed `123456` support in development/testing mode). Once verified, the user is authenticated and routed to their workspace.

---

## 2. Visual Design System & Figma Tokens

### 2.1 Design Tokens (Extracted from Figma Variables)
- **Primary / Accent Bronze:** `#BF935A`
- **Primary Bronze Hover:** `#A67C46`
- **Primary Bronze Active / Focus Ring:** `rgba(191, 147, 90, 0.35)`
- **Text Headings (Primary):** `#0C0C0D`
- **Text Body / Supporting:** `#4A4A4C`
- **Text Muted / Meta / Labels:** `#686869`
- **Text Subtle / Borders:** `#B9B9BA`
- **Border Default:** `#D2D2D7`
- **Border Subtle:** `#EAEAED`
- **Form Card Background:** `#FFFFFF`
- **Surface Muted:** `#F7F7F8`
- **Error Red:** `#D32F2F`
- **Error Background:** `#FFEBEE`
- **Typography:** `Inter`, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif.
  - Headings: 44px (line-height 66px, font-weight 700 / Bold).
  - Mobile Headings: 28px - 32px (line-height 38px, font-weight 700).
  - Subheadings: 16px (line-height 24px, font-weight 400 / Regular).
  - Labels & Inputs: 14px (line-height 21px, font-weight 500 / Medium).

### 2.2 Assets & Positioning
1. **`editorial_courtyard.png`** (`apps/web/public/assets/auth/editorial_courtyard.png`):
   - Extracted directly from Figma Node `226:2947`.
   - Architectural courtyard pool with frangipani tree, golden wall illumination, and 3D metal letters.
   - Overlaid with typographic branding: "ARCHITECTURE & INTERIORS", "THE STUDIO PORTAL AHMEDABAD, INDIA", "SPACES FOR SHARED AMBITION", "Great spaces. Built together.", "A considered place for every drawing, decision and conversation.", and "FIELD NOTES / THE COURTYARD HOUSE | 2026".
2. **`asf_logo.png`** (`apps/web/public/assets/auth/asf_logo.png`):
   - Extracted directly from Figma Node `226:12884`.
   - Used in the top masthead of the right authentication panel.

---

## 3. Full-Stack Architecture & Component Breakdown

```
┌────────────────────────────────────────────────────────────────────────┐
│                        apps/web (React 18 + Vite)                      │
│                                                                        │
│  ┌───────────────────────┐   ┌──────────────────────────────────────┐  │
│  │    EditorialPanel     │   │            AuthFormPanel             │  │
│  │  - Desktop: Left 60%  │   │  - Desktop: Right 40% (534px content)│  │
│  │  - Mobile: Top 35%    │   │  - Mobile: Bottom Sheet (65% height) │  │
│  │  - High-res Courtyard │   │  - Header: asf logo + Need help?     │  │
│  │  - Editorial Overlays │   │  - Dynamic Step View:                │  │
│  └───────────────────────┘   │    • Step 1: SignInForm              │  │
│                              │    • Step 2: ConfirmDetailsForm      │  │
│                              │    • Step 3: OtpVerificationForm     │  │
│                              │  - Footer: Secure access / Privacy   │  │
│                              └──────────────────────────────────────┘  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP JSON API
┌───────────────────────────────────▼────────────────────────────────────┐
│                       apps/api (Fastify + TypeScript)                  │
│                                                                        │
│  • POST /api/auth/login        -> Checks bcrypt; Admin -> JWT;         │
│                                   Staff/Client -> tempToken            │
│  • POST /api/auth/send-otp     -> Dispatches 6-digit OTP (123456 dev)  │
│  • POST /api/auth/verify-otp   -> Validates OTP; returns session JWT   │
│  • GET  /api/auth/me           -> Validates active JWT cookie/header   │
│  • POST /api/auth/logout       -> Clears session cookie/token          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                    PostgreSQL (Prisma ORM User Model)                  │
└────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Frontend Components (`apps/web/src/pages/Auth/`)
- **`LoginPage.tsx`**: Main entrypoint wrapping the 2-column desktop grid and mobile stacked container. Manages step state (`SIGN_IN` | `CONFIRM_DETAILS` | `VERIFY_OTP`) and active user draft.
- **`EditorialPanel.tsx`**: Renders the architectural luxury visual panel with the courtyard image, dark vignette gradients, and metadata overlays.
- **`SignInForm.tsx`**:
  - `Username` text field.
  - `Password` input with show/hide eye toggle (`lucide-react`).
  - Right-aligned "Forgot password?" link (`#BF935A`).
  - Primary Bronze "Sign in" button with loading spinner.
  - Inline error alert for failed credentials.
- **`ConfirmDetailsForm.tsx`**:
  - Heading: "Confirm Your Details".
  - Description: "For account verification, please confirm your registered information."
  - Fields: `Full Name (as registered)` and `Phone Number` (pre-filled from account, editable).
  - Primary Bronze "Send OTP" button.
  - "Back to Sign in" navigation link.
- **`OtpVerificationForm.tsx`**:
  - Heading: "Verify OTP".
  - Description: "A 6-digit verification code has been dispatched to WhatsApp on `[Phone Number]`."
  - 6 individual OTP character boxes supporting:
    - Auto-focus on first box on mount.
    - Automatic focus advance on keystroke.
    - Backspace auto-retreat to previous box.
    - Paste support for complete 6-digit code.
  - 30-second countdown timer for resending OTP.
  - "Didn't receive the code? Resend OTP" trigger.
  - Primary Bronze "Verify OTP" (or "Verify & Access Studio") button.
  - "Change phone number" back navigation link.

---

## 4. Backend Fastify Endpoints & Authentication Contract

### 4.1 Endpoint: `POST /api/auth/login`
- **Request Body:**
  ```json
  {
    "username": "admin",
    "password": "password123"
  }
  ```
- **Responses:**
  - **Admin Success (HTTP 200):**
    ```json
    {
      "success": true,
      "requireOtp": false,
      "token": "jwt-token-string",
      "user": {
        "id": "usr-admin-1",
        "username": "admin",
        "fullName": "Kamal Patel",
        "role": "ADMIN",
        "showPricing": true
      }
    }
    ```
  - **Staff / Client Success (HTTP 200 - Step 1 Completed):**
    ```json
    {
      "success": true,
      "requireOtp": true,
      "tempToken": "signed-temp-token",
      "user": {
        "id": "usr-staff-1",
        "username": "staff",
        "fullName": "Raj Patel",
        "mobile": "+91 98251 99887",
        "role": "STAFF"
      }
    }
    ```
  - **Failure (HTTP 401):**
    ```json
    {
      "error": "Invalid username or password. Please verify and try again."
    }
    ```
  - **Deactivated (HTTP 403):**
    ```json
    {
      "error": "Your account has been deactivated. Please contact your studio administrator."
    }
    ```

### 4.2 Endpoint: `POST /api/auth/send-otp`
- **Request Body:**
  ```json
  {
    "tempToken": "signed-temp-token",
    "fullName": "Raj Patel",
    "mobile": "+91 98251 99887"
  }
  ```
- **Responses:**
  - **Success (HTTP 200):**
    ```json
    {
      "success": true,
      "message": "Verification OTP sent successfully via WhatsApp",
      "debugOtp": "123456"
    }
    ```
  - **Invalid Temp Token (HTTP 401):**
    ```json
    {
      "error": "Session expired. Please sign in again."
    }
    ```

### 4.3 Endpoint: `POST /api/auth/verify-otp`
- **Request Body:**
  ```json
  {
    "tempToken": "signed-temp-token",
    "otp": "123456"
  }
  ```
- **Responses:**
  - **Success (HTTP 200):**
    ```json
    {
      "success": true,
      "token": "jwt-permanent-token",
      "user": {
        "id": "usr-staff-1",
        "username": "staff",
        "fullName": "Raj Patel",
        "role": "STAFF",
        "showPricing": false
      }
    }
    ```
  - **Invalid / Expired OTP (HTTP 401):**
    ```json
    {
      "error": "Invalid or expired verification code. Please check and try again."
    }
    ```

### 4.4 Endpoint: `GET /api/auth/me`
- Returns currently authenticated user profile from Authorization Bearer token or HTTP-only cookie.

### 4.5 Endpoint: `POST /api/auth/logout`
- Clears session cookies and revokes active token state.

---

## 5. Seed Test Credentials

| Role | Username | Password | Full Name | Registered Mobile | Fixed Dev OTP | Expected Flow |
|---|---|---|---|---|---|---|
| **ADMIN** | `admin` | `admin123` | Kamal Patel | `+91 98251 00001` | N/A | **Direct Login (No OTP)** |
| **STAFF** | `staff` | `staff123` | Raj Patel | `+91 98251 99887` | `123456` | **Login -> Confirm -> OTP** |
| **CLIENT_LEADER** | `client_leader` | `client123` | Rajesh Mehta | `+91 98765 43210` | `123456` | **Login -> Confirm -> OTP** |
| **CLIENT_VIEWER** | `client_viewer` | `viewer123` | Pooja Mehta | `+91 98765 11223` | `123456` | **Login -> Confirm -> OTP** |

---

## 6. Test Cases, Scenarios & Edge Cases

### 6.1 Positive Test Scenarios
1. **TC-POS-01 (Admin Direct Login):**
   - User inputs `admin` / `admin123`.
   - Clicks "Sign in".
   - Verifies HTTP 200 response with `{ requireOtp: false }`.
   - Verifies immediate redirect to Admin Dashboard.
2. **TC-POS-02 (Staff 2-Step Flow):**
   - User inputs `staff` / `staff123`.
   - Clicks "Sign in". Form smoothly transitions to "Confirm Your Details" screen.
   - Pre-filled fields `Raj Patel` and `+91 98251 99887` are verified.
   - Clicks "Send OTP". Form transitions to "Verify OTP" screen.
   - User inputs `123456` across the 6 boxes.
   - Clicks "Verify OTP".
   - Verifies HTTP 200 response and redirect to Staff Attendance/Workspace.
3. **TC-POS-03 (Client Leader Verification):**
   - User inputs `client_leader` / `client123` -> confirms details -> inputs `123456` -> successfully enters Client Project Portal.
4. **TC-POS-04 (OTP Auto-Advance & Paste):**
   - User pastes `123456` into the first OTP input box; all 6 boxes populate automatically and focus advances to submit.

### 6.2 Negative Test Scenarios
1. **TC-NEG-01 (Incorrect Password):**
   - User inputs `admin` / `wrongpass`.
   - Verifies error alert displayed: "Invalid username or password. Please verify and try again."
   - Password field cleared and focused.
2. **TC-NEG-02 (Incorrect OTP):**
   - User enters `000000` on the OTP screen.
   - Verifies error alert: "Invalid or expired verification code."
   - 6 boxes display red border state with subtle shake feedback.
3. **TC-NEG-03 (Expired / Tampered Temp Token):**
   - User waits > 10 minutes or submits invalid temp token.
   - Backend rejects with HTTP 401: "Session expired. Please sign in again."
   - Frontend transitions cleanly back to Step 1.
4. **TC-NEG-04 (Deactivated Account):**
   - Deactivated user attempts login -> receives HTTP 403 Forbidden with clear studio administrator contact guidance.

### 6.3 Edge Cases & UX Resilience
1. **EC-01 (Mobile Responsiveness):**
   - Viewport resized to 375px (iPhone SE) and 390px (iPhone 14).
   - Top 35% displays courtyard image with overlay; bottom 65% displays rounded card sheet without horizontal overflow.
2. **EC-02 (OTP Backspace & Navigation):**
   - Pressing Backspace on an empty OTP box moves focus to the previous box and clears it.
3. **EC-03 (Network Failure):**
   - Offline or API unreachable displays toast notification: "Unable to reach studio server. Please check your network connection."
4. **EC-04 (Resend OTP Countdown):**
   - Resend link disabled during active 30s countdown; re-enabled when countdown reaches 0.

---

## 7. Implementation & Verification Plan
1. **Backend Auth Module Upgrade:**
   - Update `apps/api/src/modules/auth/auth.controller.ts` to support role-based `requireOtp` routing, `tempToken` issuance, and OTP verification.
   - Add automated Vitest integration tests in `apps/api/test/auth.test.ts`.
2. **Frontend UI Implementation:**
   - Create `apps/web/src/pages/Auth/LoginPage.tsx` and sub-components (`EditorialPanel`, `SignInForm`, `ConfirmDetailsForm`, `OtpVerificationForm`).
   - Add styles matching Figma tokens in `index.css`.
   - Update `AuthContext.tsx` to handle full authentication cycle and persistence.
   - Update `App.tsx` to render `LoginPage` when unauthenticated, and dashboard when logged in (with a top-bar user profile & logout button).
3. **Verification:**
   - Run API unit & integration tests (`npm run test`).
   - Test in real browser using `browser_subagent` for Admin, Staff, and Client flows on desktop and mobile viewports.
