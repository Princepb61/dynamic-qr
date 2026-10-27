# Implementation Plan: AI Custom Google Reviews, Visual QR Studio & Smart Redirects

Deliver four connected capabilities into **TapLocal** in a unified update:
1. **AI-Powered Custom Google Review Generator**: Allow 4–5 star customers to get personalized, authentic 5-star Google review drafts generated in 1 tap using Gemini (`gemini-3.8-flash`), copy them to the clipboard, and post straight to Google Reviews.
2. **Customer Review Gatekeeper & Feedback Inbox**: Interstitial rating page (1–5 stars) that routes 4–5 star visitors to Google Reviews, and captures 1–3 star feedback privately to an admin inbox with AI reply drafting.
3. **Visual QR Designer Studio**: Custom center brand logo upload, eye/corner style shaping, multi-stop gradient color palettes, frame templates, and vector SVG + high-res PNG export.
4. **Smart Conditional Redirects (Dayparting & Device OS)**: Dynamic routing based on time-of-day (e.g. Breakfast vs Lunch vs Dinner), day-of-week, and visitor device OS (iOS App Store vs Android Play Store vs Web).

---

## User Review Required

> [!IMPORTANT]
> - **AI Model Selection**: Uses `gemini-3.8-flash` on the server (`server.ts` via `@google/genai`) to generate rapid, authentic review options without exposing API keys to the browser.
> - **Google Review Hand-off**: Browser security prevents external web apps from silently submitting to Google Accounts without user interaction; our flow copies the chosen AI review to clipboard and opens the exact Google Business review dialog in one tap so the customer just presses Paste and Submit.
> - **Cross-Device Sync**: All review gate settings, conditional routing rules, and QR styling configurations sync seamlessly across devices via Firestore.

---

## Proposed Changes

### 1. Backend Server & AI Endpoints (`server.ts`)
- Initialize `@google/genai` on the server using `process.env.GEMINI_API_KEY`:
  ```ts
  import { GoogleGenAI } from "@google/genai";
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  });
  ```
- **New Endpoint: `POST /api/ai/generate-review`**:
  - Accepts `{ businessName, category, selectedTags, customNote, tone }`.
  - Prompts `gemini-3.8-flash` to generate 3 diverse, natural, authentic 5-star review options (Enthusiastic, Short & Direct, Warm & Detailed).
  - Returns `{ reviews: string[] }`.
- **New Endpoint: `POST /api/ai/draft-reply`**:
  - For store owners handling 1–3 star private complaints in the admin inbox: drafts an empathetic, de-escalating customer service response with resolution options.
- **New Endpoint: `POST /api/feedback/submit` & `GET /api/feedback/list`**:
  - Handles storing and retrieving low-star customer feedback in the local and Firestore sync store.

---

### 2. Data Models (`src/types.ts`)
- **Review Gate & AI Review Configuration**:
  ```ts
  export interface ReviewGateConfig {
    enabled: boolean;
    businessName?: string;
    businessCategory?: string; // Restaurant, Cafe, Salon, Gym, Clinic, Hotel, Retail, etc.
    googleReviewUrl: string;
    minStarsForGoogle: 4 | 5;
    enableAiReviewAssistant?: boolean;
    suggestedTags?: string[]; // e.g. ["Delicious Food", "Great Atmosphere", "Fast Service"]
    positiveHeadline?: string;
    negativeHeadline?: string;
  }

  export interface ReviewFeedbackRecord {
    id: string;
    linkId: string;
    slug: string;
    businessName: string;
    rating: number;
    comment: string;
    customerName?: string;
    customerContact?: string;
    createdAt: string;
    status: 'new' | 'reviewed' | 'resolved';
    aiSuggestedReply?: string;
  }
  ```
- **Conditional Routing Configuration**:
  ```ts
  export interface RedirectRule {
    id: string;
    type: 'time_schedule' | 'device_os' | 'day_of_week';
    name: string;
    destinationUrl: string;
    startTime?: string; // HH:mm
    endTime?: string;   // HH:mm
    daysOfWeek?: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
    targetOs?: 'ios' | 'android' | 'desktop';
    isActive: boolean;
  }

  export interface ConditionalRoutingConfig {
    enabled: boolean;
    rules: RedirectRule[];
  }
  ```
- **Enhanced QR Visual Settings**:
  ```ts
  export interface QRSettings {
    colorDark: string;
    colorLight: string;
    errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
    margin: number;
    frameStyle?: 'none' | 'bottom_badge' | 'top_badge' | 'rounded_card' | 'restaurant_standee' | 'review_gate_card';
    frameText?: string;
    frameSubtext?: string;
    centerIcon?: 'none' | 'link' | 'wifi' | 'phone' | 'message' | 'star' | 'coffee' | 'custom_logo';
    centerLogoUrl?: string;
    logoSizePercent?: number;
    gradientEnabled?: boolean;
    gradientColorEnd?: string;
    eyeShape?: 'square' | 'rounded' | 'circle';
  }
  ```

---

### 3. Customer-Facing Review Gatekeeper UI (`src/components/ReviewGatekeeperView.tsx`)
- Displayed when customer scans `/r/:slug` with Review Gate enabled:
  - **Star Rating Selection**: 5 interactive animated stars with dynamic mood emojis.
  - **If 4 or 5 Stars**:
    - Congratulatory screen with Google logo.
    - **AI Review Assistant Panel**:
      - Clickable praise tags (e.g. *Friendly Staff*, *Quick Service*, *Amazing Quality*, *Clean Ambiance*).
      - Quick optional input ("Anything specific you enjoyed?").
      - One-tap button: **"✨ Generate 5-Star Review with AI"**.
      - Displays 3 generated options. Customer can select their favorite, edit in place if desired, or tap **"Copy & Post on Google Reviews"**.
      - Visual confirmation: copies text to clipboard, shows toast, and opens the Google Review page.
  - **If 1 to 3 Stars**:
    - Gentle feedback form: *"We are sorry to hear that. How can we make it right?"*
    - Fields: Private comment, optional Name & Phone/Email.
    - Submits securely to store owner feedback inbox.

---

### 4. Admin Customer Feedback Inbox (`src/components/CustomerFeedbackModal.tsx`)
- Accessible from the dashboard navigation bar with unread badge.
- View all private low-star complaints.
- Click **"✨ AI Reply Assistant"** to generate an empathetic customer response ready to copy and send via WhatsApp/SMS/Email.
- Mark status as New / In Progress / Resolved.

---

### 5. Advanced Visual QR Designer (`src/components/QRStudioModal.tsx`)
- Drag-and-drop / file upload for custom center brand logos with auto-white contrast pad.
- Linear gradient color generator (start color to end color).
- Eye frame styling (Square, Modern Rounded, Circular Dot).
- New frame card templates: "⭐ RATE US ON GOOGLE", "🍽️ SCAN FOR MENU", "📶 SCAN FOR WI-FI".
- Vector SVG download (for professional commercial printing) and high-resolution PNG.

---

### 6. Link Configuration Tabs (`src/components/EditDestinationModal.tsx` & `src/components/CreateLinkModal.tsx`)
- Modern tabbed interface:
  1. **General**: URL, Title, Content Type, Presentation Mode.
  2. **Google Review Gate & AI**: Enable gatekeeper, Google Review link, Business category, suggested tags, AI generation toggle.
  3. **Smart Redirects**: Schedule dayparting (Breakfast/Lunch/Dinner) & OS split (iOS vs Android).
  4. **Appearance**: 1-tap quick action templates.

---

## Verification Plan

### Automated & Build Verification
- Run `compile_applet` (`npm run build` and `tsc --noEmit`) to verify clean compilation with zero type errors.

### Manual Verification Scenarios
1. **AI Review Generation**:
   - Open `/r/[slug]` configured with Review Gatekeeper.
   - Tap 5 stars -> select praise tags -> tap "Generate with AI".
   - Verify 3 natural review suggestions appear.
   - Tap "Copy & Post on Google Reviews" -> verify clipboard contains the review and external tab opens to Google Review URL.
2. **Private Low-Star Feedback**:
   - Tap 2 stars -> write complaint -> submit.
   - Open Admin Dashboard -> "Customer Feedback" -> verify submission appears with "AI Reply Draft" action.
3. **Smart Conditional Redirect**:
   - Configure iOS to Apple App Store and Android to Play Store.
   - Test user agent matching and verify fallback.
4. **Visual QR Studio**:
   - Upload custom logo, set gradient, download SVG, and verify scannability.
