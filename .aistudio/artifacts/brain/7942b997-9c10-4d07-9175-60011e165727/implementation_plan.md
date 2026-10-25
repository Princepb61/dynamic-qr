# Dynamic QR & Admin Security Enhancement Plan

A security, workflow, and data persistence upgrade for taplocalin that eliminates exposed credentials from the login screen, removes multi-tenant client portal clutter, adds permanent link copy actions, enables instant on-screen scan-to-assign for pre-printed stock, and safeguards all link and QR data across logouts with profile persistence and one-click JSON backup.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and workflow decisions have been confirmed and are baked into this implementation plan:

- **Confirmed Decision 1 (Admin Login)**: The visible "Configured Admin Account" demo credentials banner showing email (`p0667500@gmail.com`) and password (`P4prince.com`) will be completely eliminated. The login page will be a clean, secure form that accepts these valid credentials without exposing them in plaintext to viewers.
- **Confirmed Decision 2 (Scan-to-Assign Workflow)**: When an unassigned or pre-printed QR code is scanned via smartphone camera (`/r/:slug`), the scan page itself will immediately present an inline authentication and destination assignment form. The administrator can log in on the spot and bind the destination URL in seconds without getting redirected to an empty home screen.
- **Confirmed Decision 3 (Profile Data Persistence & Backup)**: All QR codes, links, and batch stock will be permanently stored and tied to the admin profile. Logging out will strictly clear the active authentication session—never the links database. In addition, an Account & Data Management modal with a 1-click JSON Export & Import Backup will allow downloading all data as a backup file and restoring it anytime across devices.
- **Confirmed Decision 4 (Client Portal Removal)**: All client registration forms, pending approval banners, client portal tabs, and approval queue views (`ClientApprovalsView.tsx`) will be completely excised from the script, leaving a focused, single-administrator dynamic QR powerhouse.
- **Confirmed Decision 5 (Permanent Link Copy Buttons)**: Every dynamic link and QR code across the Links table, Mobile cards, QR Studio, Print Center, and Batch Generator will feature a prominent, one-click "Copy Permanent Link" button with instant visual feedback.

---

## 1. Overview & Core Concept

- **What It Does**: Transforms the platform into a streamlined, private, single-tenant dynamic QR management console. The administrator securely signs in, creates and manages dynamic QR redirect links, pre-prints physical QR stock sheets, copies permanent redirect URLs directly to the clipboard, and walks up to physical QR codes in the real world to activate or re-target them on their smartphone with an on-screen assign flow.
- **Target Audience / Persona**: The business owner and system administrator managing table tents, packaging labels, marketing flyers, and digital business cards.
- **Key Value**: 
  - Complete security (zero credential exposure on screen).
  - Frictionless physical deployment (scan unassigned QR -> log in on-screen -> bind destination URL immediately).
  - Unbreakable persistence (links remain attached to the admin profile across logouts, plus instant offline JSON backup).

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Secure Admin Authentication**:
   - The user visits the app. A clean, branded login card appears with taplocalin branding, title-case labels for "Email Address" and "Password", and a single "Sign In to Admin Console" button.
   - No demo credentials box, no exposed email, no exposed password, and no "Client Portal" switcher tab.
   - On submission, authenticates seamlessly and transitions into the dashboard.

2. **Permanent Link Copying**:
   - In both the desktop table and the mobile card list, each QR code displays a clear "Copy Link" button with an icon and label.
   - Clicking copies the canonical redirect URL (`https://[origin]/r/[slug]`) to the clipboard with an instant tooltip and toast notification ("Copied permanent link: /r/[slug]").
   - Dedicated "Copy Link" buttons are also present in `QRStudioModal` and `QRPrintCenter`.

3. **Camera Scan-to-Assign for Unassigned QR Stock**:
   - When any deployed or printed QR code with no assigned destination is scanned:
     - The smartphone opens `/r/[slug]`.
     - Rather than a dead end, an elegant dark-slate card displays: "Physical QR Code Deployed · Ready for Destination".
     - If the admin is not logged in: an inline secure login field appears on the page.
     - Once authenticated (or if already signed in on that mobile browser): an instant URL input appears ("Enter Destination Website URL") along with an optional title and a primary button: "Bind & Activate QR Code Now".
     - Submitting immediately binds the destination URL, records it in the database, and redirects the scanner to the newly configured URL.

4. **Account & Profile Data Backup**:
   - In the top header next to Sign Out, an "Account & Data" button opens a lightweight modal.
   - Shows the admin profile information (`p0667500@gmail.com`, Administrator Role, Total Dynamic Links, Total Scans).
   - Features a "Download JSON Backup" button (exports all links, settings, and batches into a timestamped file) and an "Import / Restore Backup" file picker.
   - Logging out clears the auth session token only; link records remain safely preserved in persistent storage and reload immediately upon next login.

### Visual Identity & Theme
- **Theme**: Dark and Light mode support adhering to strict 60-30-10 distribution (60% neutral canvas, 30% structural surfaces with 1px hairline borders, 10% high-intent indigo/slate accents).
- **Typography**: Clean title-case headers, `tabular-nums` for scan counts and IDs, zero pill badge sandwiches on cards, and single-line button controls with truncation safety.
- **Mobile Touch Targets**: All buttons on mobile cards and modals meet $\ge 44\text{px}$ touch target standards with `w-full sm:w-auto` layout.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Removal of Client Portal and Multi-Tenant Role Switcher**:
  - *Chosen Approach*: Strip out all client registration endpoints, client approval views, client status states, and role switcher tabs.
  - *Why*: The user explicitly stated they are managing their own business QR codes and do not want a client portal or approval queue. Removing it simplifies the codebase and eliminates unnecessary navigation.
- **Decision 2: On-Page Scan-to-Assign vs Dashboard Redirection**:
  - *Chosen Approach*: Render the assign form directly inside `ClientRedirectHandler.tsx` when an unassigned slug is hit.
  - *Why*: Gives the fastest real-world turnaround. When an administrator sticks a QR sticker on a table or shelf, they can scan it with their camera, log in on the scan page, paste the target link, and test it immediately without switching tabs or navigating the dashboard.
- **Decision 3: Storage Decoupling from Session State**:
  - *Chosen Approach*: Store link records in a dedicated, robust database store (`taplocalin_persistent_db`) separate from the volatile session key (`dynamicqr_user`/`dynamicqr_token`).
  - *Why*: Previously, logging out reset in-memory state and some flows risked wiping localStorage keys. By isolating user session from link storage and including JSON export/import, data integrity is guaranteed.

---

## 4. Technical Architecture & Data Strategy

### System & Request Flow Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        taplocalin Web Architecture                     │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
         ┌─────────────────────────┴─────────────────────────┐
         ▼                                                   ▼
┌─────────────────────────────────┐         ┌─────────────────────────────────┐
│     Client Browser (SPA)        │         │      Camera QR Scan (/r/:slug)  │
│  - Clean Admin Login (AuthPage) │         │  - ClientRedirectHandler.tsx    │
│  - Dynamic Links Dashboard      │         │  - If unassigned:               │
│  - Batch Print Sheet (A4)       │         │    → Inline Admin Auth Form     │
│  - QR Print & Display Center    │         │    → Instant Target URL Bind    │
│  - Profile & JSON Backup Modal  │         │    → Auto-redirect after save   │
└────────────────┬────────────────┘         └────────────────┬────────────────┘
                 │                                           │
                 └─────────────────────┬─────────────────────┘
                                       ▼
                 ┌───────────────────────────────────────────┐
                 │       API Service Layer (api.ts)          │
                 │  - Dual-mode (Backend / Netlify Fallback) │
                 └─────────────────────┬─────────────────────┘
                                       ▼
                 ┌───────────────────────────────────────────┐
                 │       Persistent Storage Architecture     │
                 │  - Local DB (taplocalin_persistent_db)    │
                 │  - Express/File DB (data/redirects.json)  │
                 │  - Profile Isolation (Session vs Storage) │
                 │  - 1-Click JSON Backup & Restore Engine   │
                 └───────────────────────────────────────────┘
```

### Component & State Mapping

1. **`src/components/AuthPage.tsx`**:
   - Remove "Configured Admin Account" card, email/password auto-fill demo button, and "Client Portal" toggle.
   - Render a minimalist, high-contrast Admin Login form with Email and Password inputs.
   - Support `p0667500@gmail.com` / `P4prince.com` seamlessly.

2. **`src/components/Header.tsx`**:
   - Remove "Clients" approval tab and client count badges.
   - Navigation links: "Dynamic Links", "Batch QR Stock", "Print Display Sheet".
   - Add "Profile & Backup" button in header beside the Dark Mode and Sign Out buttons.

3. **`src/components/LinksTable.tsx`**:
   - Add a high-visibility "Copy Permanent Link" button with an icon in each row of the desktop table.
   - Add a full-width "Copy Permanent Link" button on each card in the mobile card view.
   - Clicking copies `${origin}/r/${slug}` to clipboard and triggers a clear confirmation toast.

4. **`src/components/ClientRedirectHandler.tsx`**:
   - Detect when an unassigned slug is accessed (`!link.destinationUrl || link.isAssigned === false`).
   - If user is not authenticated: render an inline password/email login box.
   - Once authenticated: render a clean form to enter the Destination URL, Title, and Save button.
   - On save: calls `api.assignBatchLink` / `localDb.assignBatchLink`, updates persistent storage, and redirects to the URL.

5. **`src/services/localDb.ts` & `src/services/api.ts`**:
   - Ensure `taplocalin_persistent_db` holds links independently of whether an admin is logged in or logged out.
   - Strip client registration and approval queue helper functions.
   - Provide `exportBackupJson()` and `importBackupJson(data)` methods.

6. **`src/components/ProfileBackupModal.tsx` (New)**:
   - Displays admin account details (`p0667500@gmail.com`, Administrator).
   - "Download Backup (JSON)" button to save all QR links to a `.json` file on user's device.
   - "Restore from File" input to load links from a previously saved JSON file.

7. **`src/App.tsx`**:
   - Remove `ClientApprovalsView.tsx` import and usage.
   - Ensure `handleLogout` only removes `dynamicqr_user` and `dynamicqr_token`, and that logging back in immediately re-loads all persistent links into the admin view.
   - Integrate `ProfileBackupModal`.
