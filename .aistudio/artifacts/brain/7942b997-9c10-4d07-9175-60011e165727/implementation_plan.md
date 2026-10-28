# TapLocal Multi-Action Smart Hub, Batch Security & Organic Review Engine

Deliver an all-in-one Multi-Action Smart Hub QR system allowing owners to bundle multiple destinations into a single interactive landing page, configure per-batch passwords for zero-login staff assignment, generate natural category-specific Google reviews with Gemini 3.8 Flash, fix mobile Visual QR Designer controls, ensure rock-solid cross-device persistence, and upgrade in-app camera scanning with universal pure-JS decoding.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following critical product decisions have been confirmed and incorporated into this blueprint:

- **Multi-Action QR Behavior**: When a QR code is assigned with multiple selected action destinations (e.g. Google Reviews + WhatsApp + Menu + Wi-Fi + Location), scanning displays an **Interactive Smart Hub** landing page with branded action cards rather than silently picking one.
- **Batch-Specific Passwords**: Unassigned QR codes created inside a batch can be claimed on-site by entering **only that batch's specific password**, preventing unauthorized reassignments while avoiding requiring staff to possess full super-admin accounts.
- **Dynamic Category-Tailored AI Reviews**: Rather than a static set of praise tags, owners can type or choose **any custom business category** (e.g. Italian Trattoria, Pediatric Clinic, Boutique Salon, Auto Detailing, Law Firm). Gemini 3.8 Flash will generate authentic, conversational, and realistic review drafts tailored specifically to that business category and service highlights.
- **Feature Deprecations**: Completely remove conditional routing (time-of-day / device OS redirects), remove eye pattern customizers from the Visual QR Designer, and remove the "1-3 star dissatisfied ratings are privately intercepted to your admin inbox!" banner/mechanics, allowing direct, transparent customer feedback and real organic reviews.

---

## 1. Overview & Core Concept

TapLocal evolves from a single-destination redirect tool into an omnichannel local business engagement suite:
- **All-in-One Multi-Action Smart Hub**: A single physical QR standee or sticker can host multiple customer touchpoints simultaneously: Google Reviews, WhatsApp Order/Chat, Contact vCard, Digital Menu, Wi-Fi Instant Connect, Website, Facebook, and Google Maps Navigation.
- **Batch Security Without Admin Exposure**: Multi-location chains, restaurants with floor captains, and event organizers can assign QR codes on the fly using a dedicated batch password without disclosing master admin credentials.
- **Organic Review Intelligence**: Gemini 3.8 Flash crafts human, warm, and authentic Google review drafts based on custom business categories and selected service highlights, eliminating robotic AI phrasing.
- **Universal Mobile Camera Scanner**: In-app QR scanning powered by pure JavaScript canvas pixel decoding (`jsqr`), eliminating browser incompatibilities and enabling reliable scanning on iOS Safari, Android Chrome, and desktop browsers alike.
- **Zero-Loss Persistence**: Redundant synchronization across Cloud Firestore, local storage cache, and persistent server disk JSON so links, batches, and visual styles persist across updates and restarts.

---

## 2. User Experience & Visual Design

### Key User Flows

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. Batch Creation & Password Setup                                          │
│    Owner enters Name, Prefix, Custom Quantity (1-250), & Batch Password     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. Physical QR Scan & Verification                                          │
│    Staff scans unassigned QR -> Enters Batch Password -> Unlocks Assignment │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. Multi-Action Selector                                                    │
│    Staff checks desired options: [x] Google Review  [x] WhatsApp            │
│                                  [x] Wi-Fi          [x] Digital Menu        │
│                                  [x] Maps Location  [x] Contact vCard       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. Customer Experience: Multi-Action Smart Hub                              │
│    Customer scans physical QR -> Interactive mobile page with action cards  │
│    - "Leave a 5-Star Review" (Category-aware Gemini AI draft assistant)     │
│    - "Chat on WhatsApp" (Direct wa.me link with prefilled order prompt)     │
│    - "Connect to Guest Wi-Fi" (1-tap password copy & security info)         │
│    - "Digital Menu" / "Save Contact to Phone" / "Get Directions"            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Visual Identity & Theme
- **Theme**: Utilitarian, tactile, and high-density SaaS dark aesthetic (`bg-neutral-950` canvas, `bg-neutral-900` card surfaces, `border-neutral-800` subtle elevation dividers).
- **Zero-Pill Discipline**: Metadata displayed as quiet, unboxed text separated by typographic middots (`·`). Interactive elements styled as segmented controls and buttons.
- **Typography**: Plus Jakarta Sans for geometric brand clarity, with JetBrains Mono / tabular numbers (`font-mono`) for batch codes, slugs, Wi-Fi credentials, and analytics metrics.
- **Mobile Responsive Designer Studio**: Visual QR Designer modal redesigned with mobile-first stacked controls, scrollable accordion sections, floating live sticky QR preview at the bottom/top, and 48px touch targets for color pickers, frame styles, and gradient sliders.

---

## 3. Key Product Decisions & Trade-Offs

- **Multi-Action Hub Architecture**:
  - *Chosen Approach*: When 2 or more actions are configured for a link, TapLocal automatically renders an interactive Smart Hub landing page. If only 1 action is configured, it directly performs that action (or renders the dedicated Wi-Fi / vCard / Review card).
  - *Why*: Eliminates customer friction when only a single destination is intended, while giving full multi-channel flexibility when businesses want an all-in-one table standee.
- **Batch Password Enforcement**:
  - *Chosen Approach*: Each batch record stores an optional `batchPassword`. When scanning an unassigned link belonging to that batch, the activation screen requests the batch password.
  - *Why*: Enables safe delegation to store employees, waiters, or field technicians without sharing the owner's master administrative login.
- **Organic AI Review Generation**:
  - *Chosen Approach*: Prompt Gemini 3.8 Flash with specific instructions to avoid overly polished, generic corporate marketing copy. Generate 3 short, colloquial, and natural reviews reflecting the exact business category and chosen highlights.
  - *Why*: Customers immediately recognize generic AI text; organic drafts sound like genuine human reviews and have a much higher conversion rate on Google Maps.
- **Universal JS QR Decoder**:
  - *Chosen Approach*: Integrate `jsqr` alongside native canvas frame grabbing, running at 30fps with automatic brightness/contrast normalization.
  - *Why*: Browser-native `BarcodeDetector` fails on iOS Safari and older Android browsers; `jsqr` works universally without native dependencies.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             TAPLOCAL SYSTEM CORE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   [ Client Browser ]                 [ Express / Vite Dev Server ]         │
│   - React 19 UI                      - Port 3000                           │
│   - Pure JS jsqr Camera Scanner      - Dynamic Redirects (/r/:slug)         │
│   - Multi-Action Smart Hub           - vCard Download (/api/vcard/:slug)    │
│   - Visual QR Studio (Mobile-Ready)  - Gemini 3.8 Flash AI Review Endpoint │
│                                      - Local Disk Persistence (redirects)   │
│                                                     │                       │
│                                                     ▼                       │
│                                         [ Cloud Firestore DB ]              │
│                                         - links collection                  │
│                                         - batches collection                │
│                                         - Multi-device real-time sync       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Models & State Contracts

#### 1. Multi-Action Hub Structure (`hubActions`)
```ts
export interface HubActionItem {
  id: string;
  type: 'google_review' | 'whatsapp' | 'menu' | 'wifi' | 'contact' | 'website' | 'facebook' | 'location';
  title: string;
  subtitle?: string;
  enabled: boolean;
  destinationUrl?: string;
  wifiData?: WifiData;
  vcardData?: VCardData;
}
```

#### 2. Enhanced `BatchRecord` with Security
```ts
export interface BatchRecord {
  id: string;
  name: string;
  prefix: string;
  count: number;
  batchPassword?: string;
  ownerId: string;
  createdAt: string;
}
```

#### 3. Category-Tailored AI Review Prompt Contract
- Route: `POST /api/ai/generate-review`
- Model: `gemini-3.8-flash` via `@google/genai`
- Input: `businessCategory`, `businessName`, `praiseTags`, `customNotes`
- Output: 3 distinct, authentic, organic Google review drafts varying in length and style.

### Execution Plan Phases
1. **Model & State Updates**: Update data types to support `batchPassword`, `hubActions`, and clean category configurations.
2. **Feature Removal**: Remove conditional routing, eye pattern selectors, and the 1-3 star negative intercept mechanism.
3. **In-App Camera Fix**: Implement pure JS `jsqr` canvas decoding in `CameraQRScannerModal.tsx`.
4. **Visual QR Studio Mobile Polish**: Refactor `QRStudioModal.tsx` for fluid mobile screens.
5. **Multi-Action Hub Implementation**: Build the Multi-Action Hub builder in assignment views and customer-facing responsive landing interface.
6. **Organic Review Engine**: Upgrade Gemini 3.8 Flash prompts for organic, category-tailored reviews.
7. **Verification**: Run `compile_applet` and verify end-to-end functionality.
