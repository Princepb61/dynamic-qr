# Instant Scan-to-Review & Google Maps Auto-Redirect Architecture

Deliver a zero-latency, friction-free customer experience from QR scan to Google 5-Star Review opening. Includes pre-resolved direct review URLs (`search.google.com/local/writereview`), auto-converting pasted Google Maps links, 4-digit code printing on the bottom of QR PNG cards (without business names or URLs), custom business category typing, and instant QR downloads within destination configuration.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following user preferences are confirmed and locked:
> 1. **Instant Tap-to-Copy & Immediate Launch**: On the customer review page, tapping "Copy & Write Review on Google" executes in 0ms: copies the review draft to the clipboard and immediately launches the Google 5-star review dialog without any intermediate lag or delay.
> 2. **Pre-Resolved Direct Review Dialog**: The Google Review URL is pre-resolved into `https://search.google.com/local/writereview?placeid=...` (or `?cid=...`) at link save time, so when the customer taps the button, Google's 5-star rating composer opens instantly.
> 3. **4-Digit Code at Bottom of QR PNG**: Each generated QR PNG card renders the QR code with only the bold 4-digit code (e.g., `CODE: #A1B2`) centered at the bottom. Business names and URLs are omitted.
> 4. **Auto-Convert All Google Maps Link Formats**: Pasted `maps.app.goo.gl`, `goo.gl/maps`, desktop place URLs, Place IDs (`ChIJ...`), or CIDs are automatically converted to direct review dialog format.
> 5. **Custom Business Category Typing**: Admins can freely type any custom business category (e.g., Pet Grooming, Tattoo Studio, Yoga) with tailored smart review tags.
> 6. **Direct QR Download Inside Destination Modal**: Dedicated download option right under the destination URL input and in the modal footer.

---

## 1. Overview & Core Concept

- **Problem Solved**: Standard Google Maps links open a general business page where mobile users struggle to find the review button, and multi-hop redirects cause drop-offs.
- **Solution**:
  1. Admin pastes any Google Maps link; it is immediately normalized to the official `search.google.com/local/writereview` dialog.
  2. Customer scans QR: the page loads instantly with large visible praise tags and a procedural review draft.
  3. 1 tap on the primary button copies the draft and instantly triggers the direct Google review modal.

---

## 2. User Experience & Visual Design

### Key Flows

1. **Customer Scan & Instant Launch**:
   - Customer opens `/r/:slug` on mobile.
   - Large, legible touch tags are shown first (e.g., `Delicious Food`, `Fast Service`).
   - 1-2 authentic reviews are ready immediately.
   - Tapping the prominent button copies the review and immediately launches the Google 5-star review dialog.
   - If opened in mobile browser or app, direct intent links ensure immediate opening.

2. **Admin Auto-Conversion Experience**:
   - In `CreateLinkModal` or `EditDestinationModal`, pasting any Maps link triggers real-time normalization.
   - A clean badge confirms: `"✓ Auto-converted to Direct 5-Star Review Dialog"`.

3. **QR PNG Asset Spec**:
   - Dimensions: 1024 × 1140 px.
   - High-contrast QR code centered.
   - Bottom center label: bold 4-character code (e.g. `CODE: #D8K2`).
   - Zero business name text, zero URL text.

---

## 3. Technical Architecture & Implementation Details

```
┌──────────────────────────────────────────────────────────────┐
│ Admin Inputs Google Maps Link                                │
│ (maps.app.goo.gl / Place ID / CID)                           │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ mapsUrlHelper.ts & GET /api/resolve-maps-url                 │
│ 1. Extracts Place ID / CID                                   │
│ 2. Resolves short links to search.google.com/local/writereview│
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ Saved to Firestore & SQLite as Direct Review Dialog URL      │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ Customer Scan: ReviewGatekeeperView.tsx                      │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ 1. Instant 0ms load with bold praise tags & review draft │ │
│ │ 2. Synchronous clipboard copy                            │ │
│ │ 3. Immediate window launch to writereview (5-star popup) │ │
│ └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### Component Adjustments

1. **`src/components/ReviewGatekeeperView.tsx`**:
   - Optimize the click handler for immediate execution (`navigator.clipboard.writeText` + `window.open` / `window.location.assign`).
   - Ensure direct review URLs open without intermediate redirects.

2. **`src/utils/mapsUrlHelper.ts`**:
   - Real-time client & server resolution for `maps.app.goo.gl`, `goo.gl/maps`, `ChIJ...`, and `cid=...`.

3. **`server.ts`**:
   - Maintain the active `/api/resolve-maps-url` endpoint to follow redirects safely and extract Place IDs.

4. **`src/utils/batchZipHelper.ts`**:
   - Keep canvas layout rendering the 4-digit code at the bottom (`CODE: #${code}`) with business names and URLs omitted.

5. **`src/components/CreateLinkModal.tsx` & `src/components/EditDestinationModal.tsx`**:
   - Wire maps link auto-conversion on input.
   - Support custom category typing with dynamic tag generation.
   - Include direct "Download QR Code" options inside the destination configuration view.

---

## 4. Verification Plan

1. Verify build compilation using `lint_applet` and `compile_applet`.
2. Test scan-to-review button on `/r/:slug` and verify clipboard copy + immediate launch of Google's direct review dialog.
3. Test pasting short and long Google Maps links and verify auto-conversion.
4. Verify downloaded QR PNG has the 4-digit code at the bottom with no business name or URL text.
